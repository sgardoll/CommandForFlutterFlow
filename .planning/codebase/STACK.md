# Technology Stack

**Analysis Date:** 2025-02-13

## Languages

**Primary:**
- JavaScript (ES6+) - All application logic in `app.js`
- HTML5 - UI structure in `index.html`

**Secondary:**
- CSS (via Tailwind CDN) - Styling embedded in HTML

## Runtime

**Environment:**
- Node.js (for build tooling only)
- Browser (vanilla JavaScript, no framework)

**Package Manager:**
- npm 10.x
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- None (vanilla JavaScript SPA)

**UI:**
- Tailwind CSS (via CDN) - Utility-first styling
- No React, Vue, or other frontend framework

**Testing:**
- No test framework configured
- Syntax checking only: `node --check app.js`

**Build/Dev:**
- Vite 5.x - Dev server, bundling, hot reload
- No TypeScript (plain JavaScript)

## Key Dependencies

**Critical:**
- `vite` ^5.0.0 - Build tool and dev server

**No Runtime Dependencies:**
- All third-party libraries loaded via CDN:
  - Tailwind CSS (styling)
  - Highlight.js (syntax highlighting)
  - Google Fonts (Inter, JetBrains Mono)

**External Services (APIs):**
- Google Gemini API - Primary AI model
- Anthropic Claude API - Optional AI model
- OpenAI GPT API - Optional AI model

## Configuration

**Environment:**
- `.env` file for API keys (gitignored)
- `.env.example` template provided
- Required: `VITE_GEMINI_API_KEY`
- Optional: `VITE_ANTHROPIC_API_KEY`, `VITE_OPENAI_API_KEY`

**Build:**
- `vite.config.js` - Vite configuration with API proxies
- `package.json` - npm scripts (dev, build, preview)

## Platform Requirements

**Development:**
- Any platform with Node.js 18+
- npm for dependency management

**Production:**
- Static file hosting (any web server)
- Build output in `dist/` directory
- Client-side only (no server required)

---

*Stack analysis: 2025-02-13*
*Update after major dependency changes*
