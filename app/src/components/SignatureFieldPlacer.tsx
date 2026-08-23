import { useRef } from "react";
import QuoteViewer from "./QuoteViewer";
import type { FileType, SignatureField } from "../../shared/types";

interface Props {
  fileUrl: string;
  fileType: FileType;
  field: SignatureField;
  onChange: (field: SignatureField) => void;
}

const MIN_W = 0.1;
const MIN_H = 0.035;
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

// Lets the admin position the signature box on the document. Click a page to
// move the box there; drag the box to reposition; drag the corner to resize.
// Coordinates are stored as fractions of the page (0..1) so they scale to any
// screen — including the client's phone.
export default function SignatureFieldPlacer({ fileUrl, fileType, field, onChange }: Props) {
  const mode = useRef<null | "drag" | "resize">(null);
  const grabOffset = useRef({ dx: 0, dy: 0 });

  function layerFrac(layer: HTMLElement, clientX: number, clientY: number) {
    const r = layer.getBoundingClientRect();
    return { fx: clamp01((clientX - r.left) / r.width), fy: clamp01((clientY - r.top) / r.height) };
  }

  function onLayerPointerDown(e: React.PointerEvent<HTMLDivElement>, pageNumber: number) {
    // Clicking empty page area (re)places the box centered on the click.
    if (mode.current) return;
    const { fx, fy } = layerFrac(e.currentTarget, e.clientX, e.clientY);
    onChange({
      page: pageNumber,
      w: field.w,
      h: field.h,
      x: clamp01(fx - field.w / 2),
      y: clamp01(fy - field.h / 2),
    });
  }

  function startDrag(e: React.PointerEvent<HTMLDivElement>) {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const layer = e.currentTarget.parentElement as HTMLElement;
    const { fx, fy } = layerFrac(layer, e.clientX, e.clientY);
    grabOffset.current = { dx: fx - field.x, dy: fy - field.y };
    mode.current = "drag";
  }

  function startResize(e: React.PointerEvent<HTMLDivElement>) {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    mode.current = "resize";
  }

  function onBoxMove(e: React.PointerEvent<HTMLDivElement>) {
    if (mode.current !== "drag") return;
    const layer = e.currentTarget.parentElement as HTMLElement;
    const { fx, fy } = layerFrac(layer, e.clientX, e.clientY);
    onChange({
      ...field,
      x: clamp01(Math.min(fx - grabOffset.current.dx, 1 - field.w)),
      y: clamp01(Math.min(fy - grabOffset.current.dy, 1 - field.h)),
    });
  }

  function onResizeMove(e: React.PointerEvent<HTMLDivElement>) {
    if (mode.current !== "resize") return;
    e.stopPropagation();
    const box = e.currentTarget.parentElement as HTMLElement;
    const layer = box.parentElement as HTMLElement;
    const { fx, fy } = layerFrac(layer, e.clientX, e.clientY);
    onChange({
      ...field,
      w: clamp01(Math.max(MIN_W, Math.min(fx - field.x, 1 - field.x))),
      h: clamp01(Math.max(MIN_H, Math.min(fy - field.y, 1 - field.y))),
    });
  }

  function endGesture(e: React.PointerEvent<HTMLDivElement>) {
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    mode.current = null;
  }

  return (
    <QuoteViewer
      fileUrl={fileUrl}
      fileType={fileType}
      renderOverlay={(pageNumber) => (
        <div
          style={{ position: "absolute", inset: 0 }}
          onPointerDown={(e) => onLayerPointerDown(e, pageNumber)}
        >
          {field.page === pageNumber && (
            <div
              className="sig-box draggable"
              style={{
                left: `${field.x * 100}%`,
                top: `${field.y * 100}%`,
                width: `${field.w * 100}%`,
                height: `${field.h * 100}%`,
              }}
              onPointerDown={startDrag}
              onPointerMove={onBoxMove}
              onPointerUp={endGesture}
            >
              חתימה כאן
              <div
                className="resize-handle"
                onPointerDown={startResize}
                onPointerMove={onResizeMove}
                onPointerUp={endGesture}
              />
            </div>
          )}
        </div>
      )}
    />
  );
}
