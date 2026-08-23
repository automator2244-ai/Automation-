// GET /api/admin/me  -> 200 if authenticated (gated by the admin middleware),
// used by the SPA to decide whether to show the login screen.
import type { Env } from "../../lib/util";
import { json } from "../../lib/util";

export const onRequestGet: PagesFunction<Env> = async () => json({ ok: true });
