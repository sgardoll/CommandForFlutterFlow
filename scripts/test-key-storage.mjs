// @ts-nocheck -- browser callbacks are type-checked outside Playwright's page realm.
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";

const origin = "http://127.0.0.1:4177";
const preview = spawn(
  process.platform === "win32" ? "npm.cmd" : "npm",
  ["run", "preview", "--", "--host", "127.0.0.1", "--port", "4177"],
  { stdio: "ignore" },
);

async function waitForPreview() {
  for (let attempt = 0; attempt < 50; attempt++) {
    try {
      const response = await fetch(origin);
      if (response.ok) return;
    } catch {}
    await delay(100);
  }
  throw new Error("Vite preview did not start.");
}

async function assertKeyIsProtected(page) {
  const result = await page.evaluate(async () => {
    const key = await new Promise((resolve, reject) => {
      const open = indexedDB.open("ccc_keystore", 1);
      open.onerror = () => reject(open.error);
      open.onsuccess = () => {
        const db = open.result;
        const request = db.transaction("keys", "readonly")
          .objectStore("keys")
          .get("ccc_encryption_key");
        request.onsuccess = () => {
          db.close();
          resolve(request.result || null);
        };
        request.onerror = () => reject(request.error);
      };
    });

    let exportError = null;
    try {
      await crypto.subtle.exportKey("jwk", key);
    } catch (error) {
      exportError = error.name;
    }
    return {
      found: key instanceof CryptoKey,
      extractable: key?.extractable,
      exportError,
      legacySessionKey: sessionStorage.getItem("ccc_encryption_key"),
    };
  });

  if (!result.found || result.extractable !== false || result.exportError !== "InvalidAccessError") {
    throw new Error(`Stored key is not protected: ${JSON.stringify(result)}`);
  }
  if (result.legacySessionKey !== null) {
    throw new Error("Exportable legacy key remains in sessionStorage.");
  }
}

async function saveThroughApp(page, secret) {
  await page.waitForFunction(() => typeof window.saveApiKeys === "function");
  await page.evaluate(async (value) => {
    document.getElementById("flutterflow-api-key-input").value = value;
    await window.saveApiKeys();
  }, secret);
}

async function assertReloadDecrypts(page) {
  await page.reload({ waitUntil: "domcontentloaded" });
  await saveThroughApp(page, "");
  const status = await page.evaluate(() => ({
    text: document.querySelector("#flutterflow-key-status span")?.textContent?.trim(),
    placeholder: document.getElementById("flutterflow-api-key-input")?.placeholder,
    ciphertext: localStorage.getItem("ccc_api_key_flutterflow"),
  }));
  if (status.text !== "User key configured" || !status.placeholder?.startsWith("Key saved")) {
    throw new Error(`Stored credential did not decrypt after reload: ${JSON.stringify(status)}`);
  }
}

let browser;
try {
  await waitForPreview();
  try {
    browser = await chromium.launch();
  } catch (error) {
    const brave = "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser";
    if (process.platform !== "darwin" || !String(error.message).includes("Executable doesn't exist")) {
      throw error;
    }
    browser = await chromium.launch({ executablePath: brave });
  }
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.addInitScript(() => {
    globalThis.confirm = () => true;
    globalThis.hljs = {
      configure() {},
      highlight(code) { return { value: String(code) }; },
    };
  });
  await page.route("https://**/*", (route) => route.abort());
  await page.goto(origin, { waitUntil: "domcontentloaded" });

  await saveThroughApp(page, "ff-secret-token-abc123");
  const ciphertext = await page.evaluate(() => localStorage.getItem("ccc_api_key_flutterflow"));
  if (!ciphertext || ciphertext.includes("ff-secret-token")) {
    throw new Error("API key ciphertext was missing or exposed plaintext.");
  }
  await assertKeyIsProtected(page);
  await assertReloadDecrypts(page);

  // Verify migration of ciphertext written by the previous sessionStorage JWK.
  await page.evaluate(async () => {
    await new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase("ccc_keystore");
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error("Key database deletion was blocked."));
    });
    localStorage.clear();
    sessionStorage.clear();
    const key = await crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"],
    );
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      new TextEncoder().encode("legacy-secret-token"),
    );
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    const binary = Array.from(combined, (byte) => String.fromCharCode(byte)).join("");
    localStorage.setItem("ccc_api_key_flutterflow", btoa(binary));
    sessionStorage.setItem("ccc_encryption_key", JSON.stringify(
      await crypto.subtle.exportKey("jwk", key),
    ));
  });
  await assertReloadDecrypts(page);
  await assertKeyIsProtected(page);

  await page.evaluate(() => window.clearAllApiKeys());
  const cleared = await page.evaluate(() => ({
    ciphertext: localStorage.getItem("ccc_api_key_flutterflow"),
    legacyKey: sessionStorage.getItem("ccc_encryption_key"),
  }));
  const clearedKey = await page.evaluate(() => new Promise((resolve, reject) => {
    const open = indexedDB.open("ccc_keystore", 1);
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      const request = db.transaction("keys", "readonly")
        .objectStore("keys")
        .get("ccc_encryption_key");
      request.onsuccess = () => {
        db.close();
        resolve(request.result || null);
      };
      request.onerror = () => reject(request.error);
    };
  }));
  if (cleared.ciphertext !== null || cleared.legacyKey !== null || clearedKey !== null) {
    throw new Error("Clear all API keys left credential material behind.");
  }

  console.log("Browser key storage checks passed.");
} finally {
  await browser?.close();
  preview.kill("SIGTERM");
}
