// Thin fetch client for the Pages Functions API.
import type {
  QuoteSummary,
  PublicQuote,
  CreateQuoteResult,
  SubmitSignaturePayload,
  SubmitSignatureResult,
  SignatureField,
} from "../../shared/types";

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    let msg = `error ${res.status}`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body?.error) msg = body.error;
    } catch {
      /* ignore */
    }
    throw new ApiError(msg, res.status);
  }
  return (await res.json()) as T;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// ---- admin ----
export async function listQuotes(): Promise<QuoteSummary[]> {
  const data = await req<{ quotes: QuoteSummary[] }>("/api/admin/quotes");
  return data.quotes;
}

export async function createQuote(
  file: File,
  title: string,
  field: SignatureField,
): Promise<CreateQuoteResult> {
  const form = new FormData();
  form.append("file", file);
  form.append("title", title);
  form.append("field", JSON.stringify(field));
  return req<CreateQuoteResult>("/api/admin/quotes", { method: "POST", body: form });
}

export interface QuoteDetail {
  id: string;
  token: string;
  title: string;
  fileType: "pdf" | "image";
  status: "sent" | "viewed" | "signed";
  field: SignatureField;
  createdAt: string;
  viewedAt: string | null;
  signUrl: string;
  fileUrl: string;
  signature: {
    signerEmail: string;
    signerName: string | null;
    method: "draw" | "type";
    signedAt: string;
    signerIp: string | null;
    userAgent: string | null;
    clientWantsCopy: boolean;
    signedPdfUrl: string | null;
  } | null;
}

export async function getQuoteDetail(id: string): Promise<QuoteDetail> {
  return req<QuoteDetail>(`/api/admin/quote?id=${encodeURIComponent(id)}`);
}

// ---- public ----
export async function getPublicQuote(token: string): Promise<PublicQuote> {
  return req<PublicQuote>(`/api/s?token=${encodeURIComponent(token)}`);
}

export async function submitSignature(
  payload: SubmitSignaturePayload,
): Promise<SubmitSignatureResult> {
  return req<SubmitSignatureResult>("/api/sign", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function sendCopy(token: string, email: string): Promise<void> {
  await req<{ ok: true }>("/api/send-copy", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token, email }),
  });
}
