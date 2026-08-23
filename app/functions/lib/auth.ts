// Simple, secure admin auth: a single shared password (stored server-side as a
// secret) exchanged for a short-lived HMAC-signed session cookie.
const enc = new TextEncoder();
const COOKIE = "ez_admin";
const TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
}

function b64url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Constant-time string comparison.
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createSessionToken(secret: string): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + TTL_SECONDS;
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(String(exp)));
  return `${exp}.${b64url(sig)}`;
}

export async function verifySessionToken(secret: string, token: string | undefined): Promise<boolean> {
  if (!secret || !token) return false;
  const dot = token.indexOf(".");
  if (dot <= 0) return false;
  const expStr = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp * 1000 < Date.now()) return false;
  const key = await hmacKey(secret);
  const expected = b64url(await crypto.subtle.sign("HMAC", key, enc.encode(expStr)));
  return timingSafeEqual(sig, expected);
}

export function getCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get("Cookie");
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return undefined;
}

export function sessionCookie(token: string, secure: boolean): string {
  const flags = ["HttpOnly", "SameSite=Strict", "Path=/", `Max-Age=${TTL_SECONDS}`];
  if (secure) flags.push("Secure");
  return `${COOKIE}=${token}; ${flags.join("; ")}`;
}

export function clearCookie(secure: boolean): string {
  const flags = ["HttpOnly", "SameSite=Strict", "Path=/", "Max-Age=0"];
  if (secure) flags.push("Secure");
  return `${COOKIE}=; ${flags.join("; ")}`;
}

export const ADMIN_COOKIE = COOKIE;
