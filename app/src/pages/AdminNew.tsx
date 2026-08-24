import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import TopBar from "../components/TopBar";
import SignatureFieldPlacer from "../components/SignatureFieldPlacer";
import SignaturePad from "../components/SignaturePad";
import { createQuote } from "../lib/api";
import type { FileType, SignatureField, SignMethod, CreateQuoteResult } from "../../shared/types";

// Boxes default to ~half the previous size; the placer snaps them to the last
// page once the document's page count is known.
const DEFAULT_CLIENT: SignatureField = { page: 1, x: 0.6, y: 0.85, w: 0.18, h: 0.06 };
const DEFAULT_ADMIN: SignatureField = { page: 1, x: 0.15, y: 0.85, w: 0.18, h: 0.06 };

export default function AdminNew() {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [clientField, setClientField] = useState<SignatureField>(DEFAULT_CLIENT);
  const [adminField, setAdminField] = useState<SignatureField>(DEFAULT_ADMIN);
  const [adminSig, setAdminSig] = useState<{ dataUrl: string; method: SignMethod } | null>(null);
  const [pad, setPad] = useState(false);
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
    setClientField(DEFAULT_CLIENT);
    setAdminField(DEFAULT_ADMIN);
    setAdminSig(null);
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
      const res = await createQuote(file, title.trim(), clientField, {
        adminField: adminSig ? adminField : null,
        adminSignatureDataUrl: adminSig?.dataUrl ?? null,
        adminMethod: adminSig?.method,
      });
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
            <h2 style={{ marginBottom: 6 }}>מיקום החתימות</h2>
            <p className="muted" style={{ marginBottom: 10, fontSize: 14 }}>
              גרור כל משבצת למקומה ושנה גודל מהפינה. <br />
              🔵 <b>המשבצת שלך</b> (המנהל) · 🟢 <b>משבצת הלקוח</b>
            </p>

            <div className="row" style={{ marginBottom: 12 }}>
              <button className="btn secondary small" onClick={() => setPad(true)}>
                {adminSig ? "✍️ שנה את החתימה שלך" : "✍️ חתום במשבצת שלך"}
              </button>
              {adminSig && <span className="muted" style={{ fontSize: 13 }}>החתימה שלך נוספה ✓</span>}
            </div>

            <SignatureFieldPlacer
              fileUrl={fileUrl}
              fileType={fileType}
              clientField={clientField}
              onClientChange={setClientField}
              adminField={adminField}
              onAdminChange={setAdminField}
              adminSignatureDataUrl={adminSig?.dataUrl ?? null}
            />
            <p className="muted" style={{ marginTop: 10, fontSize: 13 }}>
              חתימת המנהל היא אופציונלית — אם לא תחתום, רק משבצת הלקוח תופיע בהצעה.
            </p>
          </div>
        )}

        {error && <div className="error" style={{ marginTop: 12 }}>{error}</div>}

        <div style={{ marginTop: 16 }}>
          <button className="btn block" disabled={!file || !title.trim() || busy} onClick={submit}>
            {busy ? "יוצר קישור…" : "צור קישור לחתימה"}
          </button>
        </div>
      </div>

      {pad && (
        <SignaturePad
          onCancel={() => setPad(false)}
          onDone={(dataUrl, method) => {
            setAdminSig({ dataUrl, method });
            setPad(false);
          }}
        />
      )}
    </>
  );
}
