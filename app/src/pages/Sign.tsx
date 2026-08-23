import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import TopBar from "../components/TopBar";
import QuoteViewer from "../components/QuoteViewer";
import SignaturePad from "../components/SignaturePad";
import { getPublicQuote, submitSignature, sendCopy, ApiError } from "../lib/api";
import type { PublicQuote, SignMethod } from "../../shared/types";
import { isEmail } from "../lib/validate";

type Stage = "loading" | "email" | "view" | "done" | "already";

export default function Sign() {
  const { token = "" } = useParams();
  const [stage, setStage] = useState<Stage>("loading");
  const [quote, setQuote] = useState<PublicQuote | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [pad, setPad] = useState(false);
  const [sig, setSig] = useState<{ dataUrl: string; method: SignMethod; name?: string } | null>(null);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);

  // copy step
  const [copySent, setCopySent] = useState(false);
  const [copyBusy, setCopyBusy] = useState(false);

  useEffect(() => {
    getPublicQuote(token)
      .then((q) => {
        setQuote(q);
        setStage(q.status === "signed" ? "already" : "email");
      })
      .catch(() => setError("ההצעה לא נמצאה או שהקישור אינו תקין"));
  }, [token]);

  function openDoc() {
    if (!isEmail(email)) {
      setError("נא להזין כתובת מייל תקינה");
      return;
    }
    setError(null);
    setStage("view");
  }

  async function confirmSign() {
    if (!sig || !consent) return;
    setBusy(true);
    setError(null);
    try {
      await submitSignature({
        token,
        signerEmail: email.trim(),
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

  // ---------- render ----------
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

  if (stage === "email") {
    return (
      <>
        <TopBar />
        <div className="center-screen">
          <div className="card" style={{ maxWidth: 440, width: "100%", textAlign: "center" }}>
            <div style={{ fontSize: 40 }}>📄</div>
            <h1 style={{ margin: "8px 0" }}>הצעת מחיר עבורך</h1>
            <p className="muted" style={{ marginBottom: 20 }}>{quote.title}</p>
            <div className="field" style={{ textAlign: "start" }}>
              <label>המייל שלך</label>
              <input
                type="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                onKeyDown={(e) => e.key === "Enter" && openDoc()}
              />
            </div>
            {error && <div className="error">{error}</div>}
            <button className="btn block" onClick={openDoc} style={{ marginTop: 6 }}>
              צפייה בהצעה
            </button>
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
                <div className="notice" style={{ textAlign: "start" }}>יישלח אל: {email}</div>
                <button className="btn block" onClick={requestCopy} disabled={copyBusy}>
                  {copyBusy ? "שולח…" : "שלח לי עותק למייל"}
                </button>
              </div>
            )}
            {error && <div className="error">{error}</div>}
          </div>
        </div>
      </>
    );
  }

  // stage === "view"
  return (
    <>
      <TopBar />
      <div className="container">
        <div className="notice" style={{ marginBottom: 12 }}>
          {sig ? "בדוק את החתימה ואשר למטה 👇" : "עבור על ההצעה ולחץ על תיבת החתימה כדי לחתום"}
        </div>

        <QuoteViewer
          fileUrl={quote.fileUrl}
          fileType={quote.fileType}
          renderOverlay={(pageNumber) =>
            quote.field.page === pageNumber ? (
              <div
                className="sig-box clickable"
                style={{
                  left: `${quote.field.x * 100}%`,
                  top: `${quote.field.y * 100}%`,
                  width: `${quote.field.w * 100}%`,
                  height: `${quote.field.h * 100}%`,
                }}
                onClick={() => setPad(true)}
              >
                {sig ? <img src={sig.dataUrl} alt="חתימה" /> : "לחץ לחתימה"}
              </div>
            ) : null
          }
        />

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
