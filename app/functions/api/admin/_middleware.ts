// Gate for every /api/admin/* route. Validates the signed session cookie set by
// /api/login. DEV_MODE bypasses for local development.
import type { Env } from "../../lib/util";
import { apiError } from "../../lib/util";
import { getCookie, verifySessionToken, ADMIN_COOKIE } from "../../lib/auth";

export const onRequest: PagesFunction<Env> = async ({ request, env, next }) => {
  if (env.DEV_MODE) return next();
  const token = getCookie(request, ADMIN_COOKIE);
  if (await verifySessionToken(env.ADMIN_PASSWORD ?? "", token)) return next();
  return apiError("unauthorized", 401);
};
