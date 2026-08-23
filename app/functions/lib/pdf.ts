// Produces the final signed PDF by stamping the signature image onto the quote.
// Runs inside the Cloudflare Worker (nodejs_compat) using pdf-lib.
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { SignatureField, FileType } from "../../shared/types";

export interface Stamp {
  signaturePng: Uint8Array;
  field: SignatureField;
}

interface StampArgs {
  originalBytes: Uint8Array;
  fileType: FileType;
  // One or more signatures to stamp (e.g. admin + client).
  stamps: Stamp[];
  // ASCII-only audit caption (Helvetica cannot render Hebrew). The visible
  // signature — including any Hebrew handwriting/typed name — is an image.
  // Drawn just under the last stamp's box (the client signature).
  auditLine: string;
}

export async function buildSignedPdf(args: StampArgs): Promise<Uint8Array> {
  const doc =
    args.fileType === "pdf"
      ? await PDFDocument.load(args.originalBytes)
      : await imageToPdf(args.originalBytes);

  const pages = doc.getPages();

  let lastBox: { left: number; bottom: number; page: (typeof pages)[number] } | null = null;
  for (const stamp of args.stamps) {
    const pageIndex = Math.min(Math.max((stamp.field.page || 1) - 1, 0), pages.length - 1);
    const page = pages[pageIndex];
    const pw = page.getWidth();
    const ph = page.getHeight();

    const sig = await doc.embedPng(stamp.signaturePng);

    // Target box in PDF points (pdf-lib origin is bottom-left; our y is from top).
    const boxW = stamp.field.w * pw;
    const boxH = stamp.field.h * ph;
    const boxLeft = stamp.field.x * pw;
    const boxBottom = ph - stamp.field.y * ph - boxH;

    // Fit the signature inside the box, preserving aspect ratio, centered.
    const scale = Math.min(boxW / sig.width, boxH / sig.height);
    const drawW = sig.width * scale;
    const drawH = sig.height * scale;
    page.drawImage(sig, {
      x: boxLeft + (boxW - drawW) / 2,
      y: boxBottom + (boxH - drawH) / 2,
      width: drawW,
      height: drawH,
    });
    lastBox = { left: boxLeft, bottom: boxBottom, page };
  }

  // Small audit caption just under the client (last) signature box.
  if (lastBox) {
    const font = await doc.embedFont(StandardFonts.Helvetica);
    lastBox.page.drawText(args.auditLine, {
      x: lastBox.left,
      y: Math.max(lastBox.bottom - 10, 4),
      size: 7,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });
  }

  return doc.save();
}

async function imageToPdf(imageBytes: Uint8Array): Promise<PDFDocument> {
  const doc = await PDFDocument.create();
  let img;
  try {
    img = await doc.embedPng(imageBytes);
  } catch {
    img = await doc.embedJpg(imageBytes);
  }
  const page = doc.addPage([img.width, img.height]);
  page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
  return doc;
}
