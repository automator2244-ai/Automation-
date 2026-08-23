// GET /api/admin/file?id=<id>&kind=original|signed  -> streams the R2 object.
// Admin-gated by the /api/admin middleware.
import type { Env } from "../../lib/util";
import { apiError } from "../../lib/util";
import { getQuoteById, getSignatureByQuoteId } from "../../lib/db";

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const kind = url.searchParams.get("kind") ?? "original";
  if (!id) return apiError("missing id");

  const quote = await getQuoteById(env, id);
  if (!quote) return apiError("not found", 404);

  let key: string | null = quote.file_key;
  if (kind === "signed") {
    const sig = await getSignatureByQuoteId(env, id);
    key = sig?.signed_pdf_key ?? null;
  }
  if (!key) return apiError("not found", 404);

  const obj = await env.FILES.get(key);
  if (!obj) return apiError("file missing", 404);

  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set("cache-control", "private, no-store");
  return new Response(obj.body, { headers });
};
