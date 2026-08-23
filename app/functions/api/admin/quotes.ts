// GET  /api/admin/quotes  -> list all quotes (newest first)
// POST /api/admin/quotes  -> create a quote from a multipart upload
//   fields: file (File), title (string), field (JSON SignatureField)
import type { Env } from "../../lib/util";
import { json, apiError, uuid, randomToken, nowIso, baseUrl, dataUrlToBytes } from "../../lib/util";
import type { QuoteRow } from "../../lib/db";
import type { QuoteSummary, SignatureField, FileType, CreateQuoteResult } from "../../../shared/types";

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  const { results } = await env.DB.prepare(
    `SELECT q.*, s.signer_email AS s_email, s.signed_at AS s_at
     FROM quotes q
     LEFT JOIN signatures s ON s.quote_id = q.id
     ORDER BY q.created_at DESC`,
  ).all<QuoteRow & { s_email: string | null; s_at: string | null }>();

  const base = baseUrl(env, request);
  const summaries: QuoteSummary[] = (results ?? []).map((q) => ({
    id: q.id,
    token: q.token,
    title: q.title,
    fileType: q.file_type,
    status: q.status,
    createdAt: q.created_at,
    viewedAt: q.viewed_at,
    signedAt: q.s_at,
    signerEmail: q.s_email,
    signUrl: `${base}/s/${q.token}`,
  }));
  return json({ quotes: summaries });
};

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  const form = await request.formData();
  const fileEntry = form.get("file");
  const title = String(form.get("title") ?? "").trim();
  const fieldRaw = String(form.get("field") ?? "");
  const adminFieldRaw = String(form.get("adminField") ?? "");
  const adminSignatureDataUrl = String(form.get("adminSignatureDataUrl") ?? "");
  const adminMethod = String(form.get("adminMethod") ?? "");

  // In the Workers runtime an uploaded file is a File/Blob; a text field is a
  // string. Guard on the string case, then treat the rest as a Blob.
  if (!fileEntry || typeof fileEntry === "string") return apiError("missing file");
  const file = fileEntry as unknown as Blob;
  if (!title) return apiError("missing title");

  const validField = (f: unknown): f is SignatureField =>
    !!f &&
    typeof f === "object" &&
    ["x", "y", "w", "h"].every((k) => typeof (f as Record<string, unknown>)[k] === "number");

  let field: SignatureField;
  try {
    field = JSON.parse(fieldRaw);
  } catch {
    return apiError("invalid field");
  }
  if (!validField(field)) return apiError("invalid field coordinates");

  // Optional admin signature box.
  let adminField: SignatureField | null = null;
  if (adminFieldRaw) {
    try {
      const parsed = JSON.parse(adminFieldRaw);
      if (validField(parsed)) adminField = parsed;
    } catch {
      /* ignore malformed admin field */
    }
  }

  const fileType: FileType = file.type === "application/pdf" ? "pdf" : "image";
  if (fileType === "image" && !file.type.startsWith("image/")) {
    return apiError("unsupported file type");
  }

  const id = uuid();
  const token = randomToken();
  const ext = fileType === "pdf" ? "pdf" : (file.type.split("/")[1] || "png");
  const fileKey = `quotes/${id}/original.${ext}`;

  await env.FILES.put(fileKey, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type },
  });

  // Store the admin's own signature (if they signed their box now).
  let adminSignatureKey: string | null = null;
  if (adminField && adminSignatureDataUrl.startsWith("data:image/")) {
    const { bytes } = dataUrlToBytes(adminSignatureDataUrl);
    adminSignatureKey = `quotes/${id}/admin-signature.png`;
    await env.FILES.put(adminSignatureKey, bytes, { httpMetadata: { contentType: "image/png" } });
  }

  await env.DB.prepare(
    `INSERT INTO quotes
      (id, token, title, file_key, file_type, sig_page, sig_x, sig_y, sig_w, sig_h,
       admin_sig_page, admin_sig_x, admin_sig_y, admin_sig_w, admin_sig_h, admin_signature_key, admin_sig_method,
       status, notify_email, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'sent', ?, ?)`,
  )
    .bind(
      id,
      token,
      title,
      fileKey,
      fileType,
      field.page || 1,
      field.x,
      field.y,
      field.w,
      field.h,
      adminField ? adminField.page || 1 : null,
      adminField ? adminField.x : null,
      adminField ? adminField.y : null,
      adminField ? adminField.w : null,
      adminField ? adminField.h : null,
      adminSignatureKey,
      adminSignatureKey ? adminMethod || "draw" : null,
      env.NOTIFY_EMAIL,
      nowIso(),
    )
    .run();

  const result: CreateQuoteResult = {
    id,
    token,
    signUrl: `${baseUrl(env, request)}/s/${token}`,
  };
  return json(result, 201);
};
