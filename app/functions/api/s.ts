// GET /api/s?token=<token>  -> public quote data for the signing page.
// Marks the quote as "viewed" on first open. No sensitive fields exposed.
import type { Env } from "../lib/util";
import { json, apiError, baseUrl, nowIso } from "../lib/util";
import { getQuoteByToken } from "../lib/db";
import type { PublicQuote } from "../../shared/types";

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  const token = new URL(request.url).searchParams.get("token");
  if (!token) return apiError("missing token");

  const quote = await getQuoteByToken(env, token);
  if (!quote) return apiError("not found", 404);

  if (quote.status === "sent") {
    await env.DB.prepare("UPDATE quotes SET status = 'viewed', viewed_at = ? WHERE id = ? AND status = 'sent'")
      .bind(nowIso(), quote.id)
      .run();
  }

  const base = baseUrl(env, request);
  const payload: PublicQuote = {
    token: quote.token,
    title: quote.title,
    fileType: quote.file_type,
    fileUrl: `${base}/api/file?token=${quote.token}`,
    field: {
      page: quote.sig_page,
      x: quote.sig_x,
      y: quote.sig_y,
      w: quote.sig_w,
      h: quote.sig_h,
    },
    status: quote.status === "sent" ? "viewed" : quote.status,
  };
  return json(payload);
};
