import { useRef, useState } from "react";
import QuoteViewer from "./QuoteViewer";
import type { FileType, SignatureField } from "../../shared/types";

type Target = "client" | "admin";

interface Props {
  fileUrl: string;
  fileType: FileType;
  clientField: SignatureField;
  onClientChange: (f: SignatureField) => void;
  adminField: SignatureField;
  onAdminChange: (f: SignatureField) => void;
  adminSignatureDataUrl?: string | null;
}

const MIN_W = 0.1;
const MIN_H = 0.035;
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

// Positions two signature boxes on the document: the admin's (blue) and the
// client's (green). Each is independently draggable and resizable. Coordinates
// are fractions of the page (0..1) so they scale to any screen.
export default function SignatureFieldPlacer({
  fileUrl,
  fileType,
  clientField,
  onClientChange,
  adminField,
  onAdminChange,
  adminSignatureDataUrl,
}: Props) {
  const mode = useRef<null | { kind: "drag" | "resize"; target: Target }>(null);
  const grab = useRef({ dx: 0, dy: 0 });
  const [pageCount, setPageCount] = useState(1);

  const getField = (t: Target) => (t === "client" ? clientField : adminField);
  const setField = (t: Target, f: SignatureField) =>
    (t === "client" ? onClientChange : onAdminChange)(f);

  function setPage(t: Target, page: number) {
    const p = Math.min(Math.max(page, 1), pageCount);
    setField(t, { ...getField(t), page: p });
  }

  function frac(layer: HTMLElement, cx: number, cy: number) {
    const r = layer.getBoundingClientRect();
    return { fx: clamp01((cx - r.left) / r.width), fy: clamp01((cy - r.top) / r.height) };
  }

  function startDrag(e: React.PointerEvent<HTMLDivElement>, t: Target) {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const layer = e.currentTarget.parentElement as HTMLElement;
    const { fx, fy } = frac(layer, e.clientX, e.clientY);
    const f = getField(t);
    grab.current = { dx: fx - f.x, dy: fy - f.y };
    mode.current = { kind: "drag", target: t };
  }

  function moveDrag(e: React.PointerEvent<HTMLDivElement>, t: Target) {
    if (mode.current?.kind !== "drag" || mode.current.target !== t) return;
    const layer = e.currentTarget.parentElement as HTMLElement;
    const { fx, fy } = frac(layer, e.clientX, e.clientY);
    const f = getField(t);
    setField(t, {
      ...f,
      x: clamp01(Math.min(fx - grab.current.dx, 1 - f.w)),
      y: clamp01(Math.min(fy - grab.current.dy, 1 - f.h)),
    });
  }

  function startResize(e: React.PointerEvent<HTMLDivElement>, t: Target) {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    mode.current = { kind: "resize", target: t };
  }

  function moveResize(e: React.PointerEvent<HTMLDivElement>, t: Target) {
    if (mode.current?.kind !== "resize" || mode.current.target !== t) return;
    e.stopPropagation();
    const box = e.currentTarget.parentElement as HTMLElement;
    const layer = box.parentElement as HTMLElement;
    const { fx, fy } = frac(layer, e.clientX, e.clientY);
    const f = getField(t);
    setField(t, {
      ...f,
      w: clamp01(Math.max(MIN_W, Math.min(fx - f.x, 1 - f.x))),
      h: clamp01(Math.max(MIN_H, Math.min(fy - f.y, 1 - f.y))),
    });
  }

  function endGesture(e: React.PointerEvent<HTMLDivElement>) {
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    mode.current = null;
  }

  function box(t: Target, pageNumber: number) {
    const f = getField(t);
    if (f.page !== pageNumber) return null;
    const isAdmin = t === "admin";
    return (
      <div
        className={`sig-box draggable ${isAdmin ? "admin" : "client"}`}
        style={{
          left: `${f.x * 100}%`,
          top: `${f.y * 100}%`,
          width: `${f.w * 100}%`,
          height: `${f.h * 100}%`,
        }}
        onPointerDown={(e) => startDrag(e, t)}
        onPointerMove={(e) => moveDrag(e, t)}
        onPointerUp={endGesture}
      >
        {isAdmin && adminSignatureDataUrl ? (
          <img src={adminSignatureDataUrl} alt="חתימת המנהל" />
        ) : (
          <span className="sig-tag">{isAdmin ? "🔵 המנהל" : "🟢 הלקוח"}</span>
        )}
        <div
          className="resize-handle"
          onPointerDown={(e) => startResize(e, t)}
          onPointerMove={(e) => moveResize(e, t)}
          onPointerUp={endGesture}
        />
      </div>
    );
  }

  function pageControl(t: Target, label: string) {
    const f = getField(t);
    return (
      <div className="page-control">
        <span>{label}</span>
        <button type="button" onClick={() => setPage(t, f.page - 1)} disabled={f.page <= 1}>
          ‹
        </button>
        <b>עמוד {f.page}</b>
        <button type="button" onClick={() => setPage(t, f.page + 1)} disabled={f.page >= pageCount}>
          ›
        </button>
      </div>
    );
  }

  return (
    <>
      {pageCount > 1 && (
        <div className="page-controls">
          {pageControl("admin", "🔵 המנהל")}
          {pageControl("client", "🟢 הלקוח")}
        </div>
      )}
      <QuoteViewer
        fileUrl={fileUrl}
        fileType={fileType}
        onPageCount={setPageCount}
        renderOverlay={(pageNumber) => (
          <div style={{ position: "absolute", inset: 0 }}>
            {box("admin", pageNumber)}
            {box("client", pageNumber)}
          </div>
        )}
      />
    </>
  );
}
