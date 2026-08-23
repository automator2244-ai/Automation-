import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import TopBar from "../components/TopBar";
import SignatureFieldPlacer from "../components/SignatureFieldPlacer";
import { createQuote } from "../lib/api";
import type { FileType, SignatureField, CreateQuoteResult } from "../../shared/types";

const DEFAULT_FIELD: SignatureField = { page: 1, x: 0.55, y: 0.82, w: 0.35, h: 0.1 };

export default function AdminNew() {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [field, setField] = useState<SignatureField>(DEFAULT_FIELD);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CreateQuoteResult | null>(null);

  const fileUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  const fileType: FileType = file?.type === "application/pdf" ? "pdf" : "image";

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.type !== "application/pdf" && !f.type.startsWith("image/")) {
      setError("יש להעלות PDF או תמונה בלבד");
      return;
    }
    setError(null);
    setField(DEFAULT_FIELD);
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ""));
  }

  async function submit() {
    if (!file || !title.trim()) {
      setError("יש לבחור קובץ ולתת שם להצעה");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await createQuote(file, title.trim(), field);
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה ביצירת ההצעה");
    } finally {
      setBusy(false);
    }
  }

  function whatsapp(url: string) {
    const msg = `שלום, מצורפת הצעת מחיר לחתימה דיגיטלית:\n${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  }

  if (result) {
    return (
      <>
        <TopBar />
        <div className="container">
          <div className="card" style={{ textAlign: "center" }}>
            <div style={{ fontSize: 44 }}>✅</div>
            <h1 style={{ margin: "8px 0" }}>הקישור מוכן!</h1>
            <p className="muted" style={{ marginBottom: 16 }}>שלח אותו ללקוח בוואטסאפ.</p>
            <div className="notice" style={{ wordBreak: "break-all", marginBottom: 16 }}>
              {result.signUrl}
            </div>
            <div className="stack">
              <button className="btn block" onClick={() => whatsapp(result.signUrl)}>
                שליחה בוואטסאפ
              </button>
              <button
                className="btn secondary block"
                onClick={() => navigator.clipboard.writeText(result.signUrl)}
              >
                העתק קישור
              </button>
              <Link className="btn ghost block" to="/admin">
                חזרה לרשימה
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar right={<Link className="btn ghost small" to="/admin">חזרה</Link>} />
      <div className="container">
        <h1 style={{ marginBottom: 16 }}>הצעת מחיר חדשה</h1>

        <div className="card">
          <div className="field">
            <label>שם ההצעה</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="הצעת מחיר – חברת X"
            />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>קובץ ההצעה (PDF או תמונה)</label>
            <input type="file" accept="application/pdf,image/*" onChange={onPick} />
          </div>
        </div>

        {fileUrl && (
          <div className="card">
            <h2 style={{ marginBottom: 6 }}>מקם את שדה החתימה</h2>
            <p className="muted" style={{ marginBottom: 12, fontSize: 14 }}>
              לחץ במקום הרצוי, גרור את התיבה, ושנה גודל מהפינה.
            </p>
            <SignatureFieldPlacer
              fileUrl={fileUrl}
              fileType={fileType}
              field={field}
              onChange={setField}
            />
          </div>
        )}

        {error && <div className="error" style={{ marginTop: 12 }}>{error}</div>}

        <div style={{ marginTop: 16 }}>
          <button className="btn block" disabled={!file || !title.trim() || busy} onClick={submit}>
            {busy ? "יוצר קישור…" : "צור קישור לחתימה"}
          </button>
        </div>
      </div>
    </>
  );
}
