// Types shared between the React frontend (src/) and the Pages Functions (functions/).

export type QuoteStatus = "sent" | "viewed" | "signed";
export type FileType = "pdf" | "image";
export type SignMethod = "draw" | "type";

export interface SignatureField {
  page: number; // 1-based (relevant for multi-page PDFs)
  x: number; // 0..1 fraction of page width (left edge of box)
  y: number; // 0..1 fraction of page height from top (top edge of box)
  w: number; // 0..1 fraction of page width
  h: number; // 0..1 fraction of page height
}

// What the admin dashboard sees for each quote.
export interface QuoteSummary {
  id: string;
  token: string;
  title: string;
  fileType: FileType;
  status: QuoteStatus;
  createdAt: string;
  viewedAt: string | null;
  signedAt: string | null;
  signerEmail: string | null;
  signUrl: string; // full public link
}

// What the public signing page needs to render a quote (no sensitive fields).
export interface PublicQuote {
  token: string;
  title: string;
  fileType: FileType;
  fileUrl: string; // served through the Worker
  field: SignatureField; // the CLIENT's signature box
  // The admin's own signature, applied at creation time, shown read-only.
  adminField: SignatureField | null;
  adminSignatureUrl: string | null;
  status: QuoteStatus;
}

export interface CreateQuoteResult {
  id: string;
  token: string;
  signUrl: string;
}

export interface SubmitSignaturePayload {
  token: string;
  signerEmail?: string; // optional — collected only after signing, if at all
  signerName?: string;
  method: SignMethod;
  signatureDataUrl: string; // PNG data URL of the signature image
  consent: boolean;
}

export interface SubmitSignatureResult {
  ok: true;
  signedAt: string;
}

export interface SendCopyPayload {
  token: string;
  email: string;
}
