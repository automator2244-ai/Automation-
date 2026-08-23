// POST /api/send-copy  -> emails the signed PDF to the client who just signed.
// Public (token-gated). Only works after the quote is signed.
import type { Env } from "../lib/util";
import { json, apiError, isValidEmail } from "../lib/util";
import { getQuoteByToken, getSignatureByQuoteId } from "../lib/db";
import { sendEmail, clientCopyHtml } from "../lib/email";
import type { SendCopyPayload } from "../../shared/types";

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  let body: SendCopyPayload;
  try {
    body = await request.json();
  } catch {
    return apiError("invalid body");
  }
  if (!body.token) return apiError("missing token");
  if (!isValidEmail(body.email || "")) return apiError("invalid email");

  const quote = await getQuoteByToken(env, body.token);
  if (!quote) return apiError("not found", 404);

  const sig = await getSignatureByQuoteId(env, quote.id);
  if (!sig?.signed_pdf_key) return apiError("quote not signed yet", 409);

  const obj = await env.FILES.get(sig.signed_pdf_key);
  if (!obj) return apiError("signed file missing", 500);
  const pdfBase64 = bytesToBase64(new Uint8Array(await obj.arrayBuffer()));

  await sendEmail(env, {
    to: body.email.trim(),
    subject: `העותק החתום שלך: ${quote.title}`,
    html: clientCopyHtml({ title: quote.title }),
    attachments: [{ filename: "signed-quote.pdf", content: pdfBase64 }],
  });

  // Record that the client asked for a copy.
  await env.DB.prepare("UPDATE signatures SET client_wants_copy = 1 WHERE id = ?").bind(sig.id).run();

  return json({ ok: true });
};

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
