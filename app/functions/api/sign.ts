// POST /api/sign  -> records the client's signature, builds the signed PDF,
// locks the quote, and emails the owner. Public (token-gated) endpoint.
import type { Env } from "../lib/util";
import { json, apiError, uuid, nowIso, isValidEmail, dataUrlToBytes } from "../lib/util";
import { getQuoteByToken, getSignatureByQuoteId } from "../lib/db";
import { buildSignedPdf } from "../lib/pdf";
import { sendEmail, ownerSignedHtml } from "../lib/email";
import type { SubmitSignaturePayload, SubmitSignatureResult } from "../../shared/types";

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  let body: SubmitSignaturePayload;
  try {
    body = await request.json();
  } catch {
    return apiError("invalid body");
  }

  if (!body.token) return apiError("missing token");
  if (!isValidEmail(body.signerEmail || "")) return apiError("invalid email");
  if (body.consent !== true) return apiError("consent required");
  if (body.method !== "draw" && body.method !== "type") return apiError("invalid method");
  if (!body.signatureDataUrl?.startsWith("data:image/")) return apiError("invalid signature");

  const quote = await getQuoteByToken(env, body.token);
  if (!quote) return apiError("not found", 404);

  // Lock: never allow a second signature on the same quote.
  if (quote.status === "signed" || (await getSignatureByQuoteId(env, quote.id))) {
    return apiError("already signed", 409);
  }

  const signedAt = nowIso();
  const signerIp = request.headers.get("CF-Connecting-IP");
  const userAgent = request.headers.get("user-agent");

  // Store the raw signature PNG.
  const { bytes: sigBytes } = dataUrlToBytes(body.signatureDataUrl);
  const signatureKey = `signatures/${quote.id}/signature.png`;
  await env.FILES.put(signatureKey, sigBytes, { httpMetadata: { contentType: "image/png" } });

  // Fetch the original quote file and stamp the signature onto it.
  const original = await env.FILES.get(quote.file_key);
  if (!original) return apiError("quote file missing", 500);
  const originalBytes = new Uint8Array(await original.arrayBuffer());

  const auditLine = `Signed by ${body.signerEmail} on ${signedAt} | method:${body.method}${
    signerIp ? ` | IP:${signerIp}` : ""
  }`;

  const signedPdf = await buildSignedPdf({
    originalBytes,
    fileType: quote.file_type,
    signaturePng: sigBytes,
    field: {
      page: quote.sig_page,
      x: quote.sig_x,
      y: quote.sig_y,
      w: quote.sig_w,
      h: quote.sig_h,
    },
    auditLine,
  });

  const signedPdfKey = `quotes/${quote.id}/signed.pdf`;
  await env.FILES.put(signedPdfKey, signedPdf, {
    httpMetadata: { contentType: "application/pdf" },
  });

  // Persist the signature and lock the quote.
  await env.DB.prepare(
    `INSERT INTO signatures
      (id, quote_id, signer_email, signer_name, method, signature_key, signed_pdf_key, signed_at, signer_ip, user_agent, client_wants_copy)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
  )
    .bind(
      uuid(),
      quote.id,
      body.signerEmail.trim(),
      body.signerName?.trim() || null,
      body.method,
      signatureKey,
      signedPdfKey,
      signedAt,
      signerIp,
      userAgent,
    )
    .run();

  await env.DB.prepare("UPDATE quotes SET status = 'signed' WHERE id = ?").bind(quote.id).run();

  // Notify the owner with the signed PDF attached. Email failure must not fail
  // the signature — it is already safely recorded.
  const pdfBase64 = bytesToBase64(signedPdf);
  try {
    await sendEmail(env, {
      to: quote.notify_email,
      subject: `נחתמה הצעת מחיר: ${quote.title}`,
      html: ownerSignedHtml({
        title: quote.title,
        signerEmail: body.signerEmail,
        signerName: body.signerName,
        signedAt,
        ip: signerIp,
      }),
      attachments: [{ filename: safeFileName(quote.title) + ".pdf", content: pdfBase64 }],
    });
  } catch (err) {
    console.error("owner email failed", err);
  }

  const result: SubmitSignatureResult = { ok: true, signedAt };
  return json(result);
};

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function safeFileName(title: string): string {
  return title.replace(/[^\p{L}\p{N}\-_ ]/gu, "").trim().slice(0, 60) || "signed-quote";
}
