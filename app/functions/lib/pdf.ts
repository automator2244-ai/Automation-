// Produces the final signed PDF by stamping the signature image onto the quote.
// Runs inside the Cloudflare Worker (nodejs_compat) using pdf-lib.
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { SignatureField, FileType } from "../../shared/types";

interface StampArgs {
  originalBytes: Uint8Array;
  fileType: FileType;
  signaturePng: Uint8Array;
  field: SignatureField;
  // ASCII-only audit caption (Helvetica cannot render Hebrew). The visible
  // signature — including any Hebrew handwriting/typed name — is an image.
  auditLine: string;
}

export async function buildSignedPdf(args: StampArgs): Promise<Uint8Array> {
  const doc =
    args.fileType === "pdf"
      ? await PDFDocument.load(args.originalBytes)
      : await imageToPdf(args.originalBytes);

  const pages = doc.getPages();
  const pageIndex = Math.min(Math.max(args.field.page - 1, 0), pages.length - 1);
  const page = pages[pageIndex];
  const pw = page.getWidth();
  const ph = page.getHeight();

  const sig = await doc.embedPng(args.signaturePng);

  // Target box in PDF points (pdf-lib origin is bottom-left; our y is from top).
  const boxW = args.field.w * pw;
  const boxH = args.field.h * ph;
  const boxLeft = args.field.x * pw;
  const boxBottom = ph - args.field.y * ph - boxH;

  // Fit the signature inside the box, preserving aspect ratio, centered.
  const scale = Math.min(boxW / sig.width, boxH / sig.height);
  const drawW = sig.width * scale;
  const drawH = sig.height * scale;
  const drawX = boxLeft + (boxW - drawW) / 2;
  const drawY = boxBottom + (boxH - drawH) / 2;

  page.drawImage(sig, { x: drawX, y: drawY, width: drawW, height: drawH });

  // Small audit caption just under the signature box.
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const size = 7;
  const captionY = Math.max(boxBottom - 10, 4);
  page.drawText(args.auditLine, {
    x: boxLeft,
    y: captionY,
    size,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });

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
