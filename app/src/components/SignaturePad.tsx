import { useEffect, useRef, useState } from "react";
import type { SignMethod } from "../../shared/types";

interface Props {
  onDone: (dataUrl: string, method: SignMethod, name?: string) => void;
  onCancel: () => void;
}

// Draw is the default; typed name is the fallback.
export default function SignaturePad({ onDone, onCancel }: Props) {
  const [tab, setTab] = useState<SignMethod>("draw");
  const [name, setName] = useState("");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const hasDrawnRef = useRef(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  // Size the drawing canvas to its box, accounting for device pixel ratio.
  useEffect(() => {
    if (tab !== "draw") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const setup = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      const ctx = canvas.getContext("2d")!;
      ctx.scale(dpr, dpr);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = "#0f172a";
    };
    setup();
    window.addEventListener("resize", setup);
    return () => window.removeEventListener("resize", setup);
  }, [tab]);

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }
  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    drawingRef.current = true;
  }
  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    if (!hasDrawnRef.current) {
      hasDrawnRef.current = true;
      setHasDrawn(true);
    }
  }
  function end() {
    drawingRef.current = false;
  }
  function clearCanvas() {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasDrawnRef.current = false;
    setHasDrawn(false);
  }

  async function confirm() {
    if (tab === "draw") {
      if (!hasDrawn) return;
      onDone(canvasRef.current!.toDataURL("image/png"), "draw");
    } else {
      const clean = name.trim();
      if (!clean) return;
      const dataUrl = await typedNameToPng(clean);
      onDone(dataUrl, "type", clean);
    }
  }

  const canConfirm = tab === "draw" ? hasDrawn : name.trim().length > 0;

  return (
    <div className="overlay" onClick={onCancel}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h2 style={{ marginBottom: 14 }}>חתימה</h2>
        <div className="sigpad-tabs">
          <button className={tab === "draw" ? "active" : ""} onClick={() => setTab("draw")}>
            ✍️ ציור חתימה
          </button>
          <button className={tab === "type" ? "active" : ""} onClick={() => setTab("type")}>
            ⌨️ הקלדת שם
          </button>
        </div>

        {tab === "draw" ? (
          <>
            <canvas
              ref={canvasRef}
              className="sigpad-canvas"
              onPointerDown={start}
              onPointerMove={move}
              onPointerUp={end}
              onPointerLeave={end}
            />
            <div className="row" style={{ marginTop: 10, justifyContent: "space-between" }}>
              <button className="btn ghost small" onClick={clearCanvas}>
                נקה
              </button>
              <span className="muted" style={{ fontSize: 13 }}>
                חתום באצבע או בעכבר בתוך המסגרת
              </span>
            </div>
          </>
        ) : (
          <>
            <div className="field">
              <label>השם המלא שלך</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ישראל ישראלי"
                autoFocus
              />
            </div>
            <div className="type-preview" style={{ fontFamily: "Heebo, cursive" }}>
              {name.trim() || "התצוגה תופיע כאן"}
            </div>
          </>
        )}

        <div className="row" style={{ marginTop: 18 }}>
          <button className="btn block" disabled={!canConfirm} onClick={confirm}>
            אישור חתימה
          </button>
        </div>
        <button className="btn ghost small block" style={{ marginTop: 8 }} onClick={onCancel}>
          ביטול
        </button>
      </div>
    </div>
  );
}

// Render a typed name as a transparent PNG so it stamps like a drawn signature.
async function typedNameToPng(name: string): Promise<string> {
  try {
    await (document as unknown as { fonts?: { ready: Promise<unknown> } }).fonts?.ready;
  } catch {
    /* ignore */
  }
  const w = 640;
  const h = 200;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#0f172a";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  let size = 90;
  do {
    ctx.font = `600 ${size}px Heebo, sans-serif`;
    if (ctx.measureText(name).width <= w - 40) break;
    size -= 6;
  } while (size > 24);
  ctx.fillText(name, w / 2, h / 2);
  return canvas.toDataURL("image/png");
}
