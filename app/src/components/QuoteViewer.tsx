import { useEffect, useRef, useState, type ReactNode } from "react";
import * as pdfjsLib from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import type { FileType } from "../../shared/types";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

interface PageImage {
  pageNumber: number;
  src: string;
  wPx: number;
  hPx: number;
}

interface Props {
  fileUrl: string;
  fileType: FileType;
  // Draw an overlay layer on top of a given page (e.g. the signature box).
  renderOverlay?: (pageNumber: number, dims: { wPx: number; hPx: number }) => ReactNode;
  onReady?: () => void;
}

export default function QuoteViewer({ fileUrl, fileType, renderOverlay, onReady }: Props) {
  const [pages, setPages] = useState<PageImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const readyRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    readyRef.current = false;
    setLoading(true);
    setError(null);
    setPages([]);

    (async () => {
      try {
        if (fileType === "image") {
          const dims = await imageSize(fileUrl);
          if (cancelled) return;
          setPages([{ pageNumber: 1, src: fileUrl, wPx: dims.w, hPx: dims.h }]);
        } else {
          const buf = await (await fetch(fileUrl)).arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
          const out: PageImage[] = [];
          for (let n = 1; n <= pdf.numPages; n++) {
            const page = await pdf.getPage(n);
            const viewport = page.getViewport({ scale: 2 });
            const canvas = document.createElement("canvas");
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext("2d")!;
            await page.render({ canvasContext: ctx, viewport }).promise;
            out.push({
              pageNumber: n,
              src: canvas.toDataURL("image/png"),
              wPx: viewport.width,
              hPx: viewport.height,
            });
          }
          if (cancelled) return;
          setPages(out);
        }
      } catch (e) {
        if (!cancelled) setError("שגיאה בטעינת הקובץ");
        console.error(e);
      } finally {
        if (!cancelled) {
          setLoading(false);
          if (!readyRef.current) {
            readyRef.current = true;
            onReady?.();
          }
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileUrl, fileType]);

  if (error) return <div className="error">{error}</div>;

  return (
    <div className="viewer">
      {loading && (
        <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
          <div className="spinner" />
        </div>
      )}
      {pages.map((p) => (
        <div
          key={p.pageNumber}
          className="doc-page"
          style={{ aspectRatio: `${p.wPx} / ${p.hPx}` }}
        >
          <img src={p.src} alt={`עמוד ${p.pageNumber}`} />
          {renderOverlay?.(p.pageNumber, { wPx: p.wPx, hPx: p.hPx })}
        </div>
      ))}
    </div>
  );
}

function imageSize(url: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = reject;
    img.src = url;
  });
}
