// GET /api/file?token=<token>  -> streams the quote's original file for the
// public signing page. Access is gated by the unguessable token.
import type { Env } from "../lib/util";
import { apiError } from "../lib/util";
import { getQuoteByToken } from "../lib/db";

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  const token = new URL(request.url).searchParams.get("token");
  if (!token) return apiError("missing token");

  const quote = await getQuoteByToken(env, token);
  if (!quote) return apiError("not found", 404);

  const obj = await env.FILES.get(quote.file_key);
  if (!obj) return apiError("file missing", 404);

  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set("cache-control", "private, max-age=300");
  return new Response(obj.body, { headers });
};
