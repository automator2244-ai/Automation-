import { useEffect, useState, type CSSProperties } from "react";
import { useParams } from "react-router-dom";
import TopBar from "../components/TopBar";
import QuoteViewer from "../components/QuoteViewer";
import SignaturePad from "../components/SignaturePad";
import { getPublicQuote, submitSignature, sendCopy, ApiError } from "../lib/api";
import type { PublicQuote, SignMethod, SignatureField } from "../../shared/types";
import { isEmail } from "../lib/validate";

type Stage = "loading" | "view" | "done" | "already";

export default function Sign() {
  const { token = "" } = useParams();
  const [stage, setStage] = useState<Stage>("loading");
  const [quote, setQuote] = useState<PublicQuote | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [pad, setPad] = useState(false);
  const [sig, setSig] = useState<{ dataUrl: string; method: SignMethod; name?: string } | null>(null);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);

  // final optional email step
  const [email, setEmail] = useState("");
  const [copySent, setCopySent] = useState(false);
  const [copyBusy, setCopyBusy] = useState(false);

  useEffect(() => {
    getPublicQuote(token)
      .then((q) => {
        setQuote(q);
        setStage(q.status === "signed" ? "already" : "view");
      })
      .catch(() => setError("ההצעה לא נמצאה או שהקישור אינו תקין"));
  }, [token]);

  async function confirmSign() {
    if (!sig || !consent) return;
    setBusy(true);
    setError(null);
    try {
      await submitSignature({
        token,
        signerName: sig.name,
        method: sig.method,
        signatureDataUrl: sig.dataUrl,
        consent: true,
      });
      setStage("done");
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) setStage("already");
      else setError("אירעה שגיאה בשמירת החתימה. נסה שוב.");
    } finally {
      setBusy(false);
    }
  }

  async function requestCopy() {
    if (!isEmail(email)) {
      setError("נא להזין כתובת מייל תקינה");
      return;
    }
    setError(null);
    setCopyBusy(true);
    try {
      await sendCopy(token, email.trim());
      setCopySent(true);
    } catch {
      setError("שליחת העותק נכשלה. נסה שוב.");
    } finally {
      setCopyBusy(false);
    }
  }

  // ---------- simple states ----------
  if (error && !quote) {
    return (
      <>
        <TopBar />
        <div className="center-screen">
          <div className="card" style={{ textAlign: "center", maxWidth: 420 }}>
            <div style={{ fontSize: 40 }}>⚠️</div>
            <h1 style={{ margin: "8px 0" }}>הקישור אינו תקין</h1>
            <p className="muted">{error}</p>
          </div>
        </div>
      </>
    );
  }

  if (stage === "loading" || !quote) {
    return (
      <>
        <TopBar />
        <div className="center-screen">
          <div className="spinner" />
        </div>
      </>
    );
  }

  if (stage === "already") {
    return (
      <>
        <TopBar />
        <div className="center-screen">
          <div className="card" style={{ textAlign: "center", maxWidth: 420 }}>
            <div style={{ fontSize: 44 }}>✅</div>
            <h1 style={{ margin: "8px 0" }}>ההצעה כבר נחתמה</h1>
            <p className="muted">הצעת המחיר "{quote.title}" נחתמה בהצלחה. תודה!</p>
          </div>
        </div>
      </>
    );
  }

  if (stage === "done") {
    return (
      <>
        <TopBar />
        <div className="center-screen">
          <div className="card" style={{ maxWidth: 460, width: "100%", textAlign: "center" }}>
            <div style={{ fontSize: 48 }}>🎉</div>
            <h1 style={{ margin: "8px 0" }}>החתימה התקבלה!</h1>
            <p className="muted" style={{ marginBottom: 20 }}>
              תודה שחתמת על הצעת המחיר. רוצה לקבל עותק חתום למייל?
            </p>
            {copySent ? (
              <div className="notice">📧 העותק נשלח אל {email}</div>
            ) : (
              <div className="stack">
                <div className="field" style={{ textAlign: "start", marginBottom: 0 }}>
                  <label>המייל שלך (לא חובה)</label>
                  <input
                    type="email"
                    inputMode="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                  />
                </div>
                {error && <div className="error">{error}</div>}
                <button className="btn block" onClick={requestCopy} disabled={copyBusy}>
                  {copyBusy ? "שולח…" : "שלח לי עותק למייל"}
                </button>
                <button className="btn ghost block" onClick={() => setCopySent(true)}>
                  לא תודה, סיום
                </button>
              </div>
            )}
          </div>
        </div>
      </>
    );
  }

  // ---------- stage === "view" ----------
  function overlay(pageNumber: number, _dims: { wPx: number; hPx: number }) {
    if (!quote) return null;
    const nodes = [];
    // admin signature (read-only) — shows the business already signed
    if (quote.adminField && quote.adminSignatureUrl && quote.adminField.page === pageNumber) {
      nodes.push(
        <div key="admin" className="sig-box readonly" style={boxStyle(quote.adminField)}>
          <img src={quote.adminSignatureUrl} alt="חתימת המנהל" />
        </div>,
      );
    }
    // client signature box
    if (quote.field.page === pageNumber) {
      nodes.push(
        <div
          key="client"
          className={`sig-box signable client ${sig ? "done" : ""}`}
          style={boxStyle(quote.field)}
          onClick={() => setPad(true)}
        >
          {sig ? <img src={sig.dataUrl} alt="חתימה" /> : <span className="sign-pill">✍️ חתום כאן</span>}
        </div>,
      );
    }
    return <>{nodes}</>;
  }

  return (
    <>
      <TopBar />
      <div className="container">
        <div className="notice" style={{ marginBottom: 12 }}>
          {sig ? "בדוק את החתימה ואשר למטה 👇" : "עבור על ההצעה ולחץ על 'חתום כאן' כדי לחתום"}
        </div>

        <QuoteViewer fileUrl={quote.fileUrl} fileType={quote.fileType} renderOverlay={overlay} />

        {sig && (
          <div className="card" style={{ marginTop: 16 }}>
            <label className="checkbox-row">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              <span>אני מאשר/ת שקראתי את הצעת המחיר וחתימתי הדיגיטלית מהווה הסכמה מלאה לתנאים.</span>
            </label>
            {error && <div className="error">{error}</div>}
            <div className="stack" style={{ marginTop: 14 }}>
              <button className="btn block" disabled={!consent || busy} onClick={confirmSign}>
                {busy ? "שומר…" : "אישור וחתימה"}
              </button>
              <button className="btn ghost block" onClick={() => setPad(true)}>
                חתום מחדש
              </button>
            </div>
          </div>
        )}
      </div>

      {pad && (
        <SignaturePad
          onCancel={() => setPad(false)}
          onDone={(dataUrl, method, name) => {
            setSig({ dataUrl, method, name });
            setPad(false);
          }}
        />
      )}
    </>
  );
}

function boxStyle(f: SignatureField): CSSProperties {
  return {
    left: `${f.x * 100}%`,
    top: `${f.y * 100}%`,
    width: `${f.w * 100}%`,
    height: `${f.h * 100}%`,
  };
}
