// POST /api/logout  -> clears the admin session cookie.
import type { Env } from "../lib/util";
import { json } from "../lib/util";
import { clearCookie } from "../lib/auth";

export const onRequestPost: PagesFunction<Env> = async ({ env }) => {
  return json({ ok: true }, 200, { "Set-Cookie": clearCookie(!env.DEV_MODE) });
};
