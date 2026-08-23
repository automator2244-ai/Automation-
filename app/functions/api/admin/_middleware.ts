// Gate for every /api/admin/* route. In production Cloudflare Access verifies
// identity and injects Cf-Access-Authenticated-User-Email; here we enforce that
// the resolved admin is on the allow-list. In DEV_MODE this passes through.
import type { Env } from "../../lib/util";
import { adminEmail, apiError } from "../../lib/util";

export const onRequest: PagesFunction<Env> = async ({ request, env, next, data }) => {
  const email = adminEmail(env, request);
  if (!email) return apiError("unauthorized", 401);
  (data as Record<string, unknown>).adminEmail = email;
  return next();
};
