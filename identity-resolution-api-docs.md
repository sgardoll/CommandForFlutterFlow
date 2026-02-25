# Identity Resolution API

## Overview

This API identifies returning users without requiring traditional authentication (login/password). It uses a combination of three signals — a browser fingerprint, a persistent cookie ID, and the client's IP address — to score whether an incoming request matches an existing user record. The IP is extracted server-side from request headers; the frontend is responsible for generating and sending the fingerprint and cookie ID.

## Endpoint

```
POST https://4tgke4.buildship.run/authUserCheck
```

### Headers

| Header         | Value              | Required |
|----------------|--------------------|----------|
| Content-Type   | application/json   | Yes      |

### Request Body

```json
{
  "fingerprint": "string",
  "cookie_id": "string"
}
```

| Field         | Type   | Required | Description |
|---------------|--------|----------|-------------|
| `fingerprint` | string | Yes      | A browser/device fingerprint hash generated client-side. Use [FingerprintJS](https://github.com/nicknisi/fingerprintjs) or `@fingerprintjs/fingerprintjs` (open-source). This value should be stable across sessions for the same browser+device combination. |
| `cookie_id`   | string | Yes      | A persistent UUID stored in the browser's `localStorage`. Generated on first visit if not already present. Format: standard UUID v4 (e.g., `550e8400-e29b-41d4-a716-446655440000`). |

> **Note:** The client does NOT send an IP address. The server extracts it from the HTTP request headers (`x-forwarded-for`, `cf-connecting-ip`, etc.) automatically.

### Response

The API always returns a JSON object with two fields:

```json
{
  "user_id": "string",
  "status": "recognized" | "new"
}
```

| Field     | Type   | Values                  | Description |
|-----------|--------|-------------------------|-------------|
| `user_id` | string | UUID v4                 | The unique identifier for this user. Persistent across sessions. For new users, this is freshly generated. For recognized users, this is their existing ID. |
| `status`  | string | `"recognized"` or `"new"` | Whether the user was matched to an existing record or created as a new identity. |

### Response Examples

**Recognized (existing) user:**
```json
{
  "user_id": "b9c72002-7e04-4500-b1f5-926a3da17417",
  "status": "recognized"
}
```

**New user:**
```json
{
  "user_id": "274045f2-3544-4d1b-9e30-4e7a628cffcd",
  "status": "new"
}
```

### Error Responses

If the request fails, expect standard HTTP error codes. The body may contain:

```json
{
  "error": {},
  "label": "string",
  "message": "string"
}
```

---

## Frontend Integration Guide (Vite)

### Dependencies

Install FingerprintJS for browser fingerprinting:

```bash
npm install @fingerprintjs/fingerprintjs
```

For UUID generation (cookie ID):

```bash
npm install uuid
```

### Implementation

#### 1. Fingerprint + Cookie ID generation utility

Create `src/lib/identity.ts` (or `.js`):

```typescript
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import { v4 as uuidv4 } from 'uuid';

const COOKIE_ID_KEY = 'bs_identity';

/**
 * Gets or creates a persistent cookie ID from localStorage.
 * This persists across sessions until the user clears browser storage.
 */
export function getCookieId(): string {
  let cookieId = localStorage.getItem(COOKIE_ID_KEY);
  if (!cookieId) {
    cookieId = uuidv4();
    localStorage.setItem(COOKIE_ID_KEY, cookieId);
  }
  return cookieId;
}

/**
 * Generates a browser fingerprint using FingerprintJS.
 * This is async because FingerprintJS needs to probe browser APIs.
 * The result is stable for the same browser+device combination.
 */
export async function getFingerprint(): Promise<string> {
  const fp = await FingerprintJS.load();
  const result = await fp.get();
  return result.visitorId;
}
```

#### 2. API call function

Create `src/lib/api.ts` (or `.js`):

```typescript
const IDENTITY_ENDPOINT = 'https://4tgke4.buildship.run/authUserCheck';

interface IdentityResponse {
  user_id: string;
  status: 'recognized' | 'new';
}

/**
 * Calls the identity resolution endpoint.
 * Returns the user_id and whether they are new or recognized.
 */
export async function checkIdentity(
  fingerprint: string,
  cookieId: string
): Promise<IdentityResponse> {
  const response = await fetch(IDENTITY_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fingerprint,
      cookie_id: cookieId,
    }),
  });

  if (!response.ok) {
    throw new Error(`Identity check failed: ${response.status}`);
  }

  return response.json();
}
```

#### 3. Usage at app initialization

Call this early in your app lifecycle — e.g., in your root component's mount or in a top-level `init()`:

```typescript
import { getCookieId, getFingerprint } from './lib/identity';
import { checkIdentity } from './lib/api';

async function initIdentity() {
  try {
    const [fingerprint, cookieId] = await Promise.all([
      getFingerprint(),
      Promise.resolve(getCookieId()),
    ]);

    const identity = await checkIdentity(fingerprint, cookieId);

    // identity.user_id  — the user's persistent ID
    // identity.status   — "new" or "recognized"

    // Store user_id for use throughout the app session
    sessionStorage.setItem('user_id', identity.user_id);

    return identity;
  } catch (error) {
    console.error('Identity resolution failed:', error);
    return null;
  }
}
```

---

## How the Scoring Works (Backend Context)

The backend scores each candidate record from the database against the incoming identifiers using weighted matching:

| Signal       | Weight | Notes |
|-------------|--------|-------|
| `cookie_id`  | 40     | Most reliable client-side identifier. Persists in localStorage. |
| `fingerprint`| 35     | Stable per browser+device but can shift with browser updates. |
| `ip`         | 25     | Drifts with network changes, shared behind NAT/VPN. Lowest weight. |

A match threshold of **75** is required to classify a user as "recognized." This means:

- Cookie + Fingerprint match (75) → recognized ✅
- Cookie + IP match (65) → new user ❌ (below threshold)
- Fingerprint + IP match (60) → new user ❌ (below threshold)
- All three match (100) → recognized ✅
- Cookie alone (40) → new user ❌

The weights and threshold are configurable on the backend without code changes.

---

## Data Flow Summary

```
┌─────────────┐
│   Browser    │
│              │
│ FingerprintJS├──┐
│ localStorage │  │
└──────────────┘  │
                  ▼
        POST /authUserCheck
        {                        
          "fingerprint": "...",  
          "cookie_id": "..."    
        }                        
                  │
                  ▼
        ┌─────────────────┐
        │  BuildShip API  │
        │                 │
        │ 1. Extract IP   │◄── from request headers (server-side)
        │    from headers │
        │                 │
        │ 2. Query DB     │◄── Firestore: match on any of 3 identifiers
        │                 │
        │ 3. Score matches│◄── cookie(40) + fingerprint(35) + ip(25)
        │                 │
        │ 4. Branch       │
        │   ≥75: existing │──► Update IP + last_seen → return recognized
        │   <75: new user │──► Generate UUID, create record → return new
        └─────────────────┘
                  │
                  ▼
        Response:
        { "user_id": "...", "status": "recognized" | "new" }
```

---

## Important Notes for Frontend Implementation

1. **`cookie_id` persistence:** Using `localStorage` means it survives page refreshes and browser restarts, but is cleared if the user clears site data. This is acceptable — the fingerprint provides a secondary identification path.

2. **No `credentials: 'include'` needed:** Since we're using `localStorage` instead of HTTP cookies for the cookie ID, there are no CORS cookie issues. The POST body carries everything.

3. **Fingerprint is async:** `FingerprintJS.load()` and `.get()` involve probing browser APIs and may take 50-200ms. Call it early, ideally before you need the result.

4. **Don't block rendering on this call.** Run `initIdentity()` in the background. The user can interact with the app while identity resolution happens. Use the result when it resolves.

5. **The `user_id` returned should be stored in `sessionStorage`** (or app state) for the duration of the session and sent with subsequent API calls that need user context.

6. **No sensitive data crosses the wire.** The fingerprint is a hash, the cookie ID is a random UUID, and the IP is extracted server-side. There are no passwords, emails, or PII involved.
