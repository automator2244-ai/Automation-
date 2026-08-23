// D1 access helpers and row types.
import type { Env } from "./util";
import type { QuoteStatus, FileType, SignMethod } from "../../shared/types";

export interface QuoteRow {
  id: string;
  token: string;
  title: string;
  file_key: string;
  file_type: FileType;
  sig_page: number;
  sig_x: number;
  sig_y: number;
  sig_w: number;
  sig_h: number;
  status: QuoteStatus;
  notify_email: string;
  created_at: string;
  viewed_at: string | null;
}

export interface SignatureRow {
  id: string;
  quote_id: string;
  signer_email: string;
  signer_name: string | null;
  method: SignMethod;
  signature_key: string;
  signed_pdf_key: string | null;
  signed_at: string;
  signer_ip: string | null;
  user_agent: string | null;
  client_wants_copy: number;
}

export async function getQuoteByToken(env: Env, token: string): Promise<QuoteRow | null> {
  return env.DB.prepare("SELECT * FROM quotes WHERE token = ?").bind(token).first<QuoteRow>();
}

export async function getQuoteById(env: Env, id: string): Promise<QuoteRow | null> {
  return env.DB.prepare("SELECT * FROM quotes WHERE id = ?").bind(id).first<QuoteRow>();
}

export async function getSignatureByQuoteId(
  env: Env,
  quoteId: string,
): Promise<SignatureRow | null> {
  return env.DB.prepare("SELECT * FROM signatures WHERE quote_id = ? ORDER BY signed_at DESC LIMIT 1")
    .bind(quoteId)
    .first<SignatureRow>();
}
