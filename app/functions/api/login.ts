// POST /api/login  { password }  -> sets the signed admin session cookie.
// Public endpoint (this is how the admin authenticates).
import type { Env } from "../lib/util";
import { json, apiError } from "../lib/util";
import { createSessionToken, sessionCookie, timingSafeEqual } from "../lib/auth";

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  if (!env.ADMIN_PASSWORD) return apiError("admin password not configured", 500);

  let password = "";
  try {
    const body = (await request.json()) as { password?: string };
    password = typeof body.password === "string" ? body.password : "";
  } catch {
    return apiError("invalid body");
  }

  if (!timingSafeEqual(password, env.ADMIN_PASSWORD)) {
    return apiError("סיסמה שגויה", 401);
  }

  const token = await createSessionToken(env.ADMIN_PASSWORD);
  const secure = !env.DEV_MODE;
  return json({ ok: true }, 200, { "Set-Cookie": sessionCookie(token, secure) });
};
