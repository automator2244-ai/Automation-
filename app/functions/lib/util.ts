// Shared server-side helpers for the Pages Functions.

export interface Env {
  DB: D1Database;
  FILES: R2Bucket;
  RESEND_API_KEY?: string;
  ADMIN_PASSWORD?: string;
  NOTIFY_EMAIL: string;
  MAIL_FROM: string;
  MAIL_FROM_NAME: string;
  APP_BASE_URL: string;
  ADMIN_EMAILS: string;
  DEV_MODE?: string;
}

export function json(data: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...headers },
  });
}

export function apiError(message: string, status = 400): Response {
  return json({ error: message }, status);
}

// Cryptographically strong, URL-safe token for public quote links.
export function randomToken(bytes = 24): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return [...buf].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function uuid(): string {
  return crypto.randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// The base URL used to build public links. Prefer the configured value,
// fall back to the request origin (useful in local dev).
export function baseUrl(env: Env, request: Request): string {
  if (env.APP_BASE_URL && !env.DEV_MODE) return env.APP_BASE_URL.replace(/\/$/, "");
  return new URL(request.url).origin;
}

// Decode a data URL (e.g. "data:image/png;base64,....") into raw bytes.
export function dataUrlToBytes(dataUrl: string): { bytes: Uint8Array; contentType: string } {
  const match = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(dataUrl);
  if (!match) throw new Error("invalid data url");
  const contentType = match[1] || "application/octet-stream";
  const isBase64 = !!match[2];
  const data = match[3];
  if (isBase64) {
    const binary = atob(data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return { bytes, contentType };
  }
  return { bytes: new TextEncoder().encode(decodeURIComponent(data)), contentType };
}

// The email of the authenticated admin, if any.
// In production Cloudflare Access injects this header after verifying identity.
// In local dev (DEV_MODE) we treat the request as the configured admin.
export function adminEmail(env: Env, request: Request): string | null {
  if (env.DEV_MODE) return firstAdmin(env);
  const email = request.headers.get("Cf-Access-Authenticated-User-Email");
  if (!email) return null;
  const allowed = env.ADMIN_EMAILS.split(",").map((e) => e.trim().toLowerCase());
  return allowed.includes(email.toLowerCase()) ? email : null;
}

export function firstAdmin(env: Env): string {
  return env.ADMIN_EMAILS.split(",")[0]?.trim() || env.NOTIFY_EMAIL;
}
