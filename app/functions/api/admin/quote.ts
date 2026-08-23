// GET /api/admin/quote?id=<id>  -> full detail incl. signature audit trail
import type { Env } from "../../lib/util";
import { json, apiError, baseUrl } from "../../lib/util";
import { getQuoteById, getSignatureByQuoteId } from "../../lib/db";

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return apiError("missing id");

  const quote = await getQuoteById(env, id);
  if (!quote) return apiError("not found", 404);

  const sig = await getSignatureByQuoteId(env, id);
  const base = baseUrl(env, request);

  return json({
    id: quote.id,
    token: quote.token,
    title: quote.title,
    fileType: quote.file_type,
    status: quote.status,
    field: {
      page: quote.sig_page,
      x: quote.sig_x,
      y: quote.sig_y,
      w: quote.sig_w,
      h: quote.sig_h,
    },
    createdAt: quote.created_at,
    viewedAt: quote.viewed_at,
    signUrl: `${base}/s/${quote.token}`,
    fileUrl: `${base}/api/admin/file?id=${quote.id}&kind=original`,
    signature: sig
      ? {
          signerEmail: sig.signer_email,
          signerName: sig.signer_name,
          method: sig.method,
          signedAt: sig.signed_at,
          signerIp: sig.signer_ip,
          userAgent: sig.user_agent,
          clientWantsCopy: !!sig.client_wants_copy,
          signedPdfUrl: sig.signed_pdf_key
            ? `${base}/api/admin/file?id=${quote.id}&kind=signed`
            : null,
        }
      : null,
  });
};
