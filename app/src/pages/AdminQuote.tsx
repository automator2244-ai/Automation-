import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import TopBar from "../components/TopBar";
import { getQuoteDetail, type QuoteDetail } from "../lib/api";

const STATUS_LABEL = { sent: "נשלח", viewed: "נצפה", signed: "נחתם" } as const;

export default function AdminQuote() {
  const { id } = useParams();
  const [quote, setQuote] = useState<QuoteDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getQuoteDetail(id)
      .then(setQuote)
      .catch((e) => setError(e instanceof Error ? e.message : "שגיאה"));
  }, [id]);

  function row(label: string, value: React.ReactNode) {
    return (
      <div className="quote-row">
        <span className="muted">{label}</span>
        <span style={{ fontWeight: 600, textAlign: "start", wordBreak: "break-word" }}>{value}</span>
      </div>
    );
  }

  return (
    <>
      <TopBar right={<Link className="btn ghost small" to="/admin">חזרה</Link>} />
      <div className="container">
        {error && <div className="card error">{error}</div>}
        {!quote && !error && (
          <div className="card" style={{ display: "flex", justifyContent: "center" }}>
            <div className="spinner" />
          </div>
        )}

        {quote && (
          <>
            <div className="card">
              <div className="row" style={{ justifyContent: "space-between" }}>
                <h1>{quote.title}</h1>
                <span className={`pill ${quote.status}`}>{STATUS_LABEL[quote.status]}</span>
              </div>
              <div style={{ marginTop: 8 }}>
                {row("נוצר", new Date(quote.createdAt).toLocaleString("he-IL"))}
                {quote.viewedAt && row("נצפה", new Date(quote.viewedAt).toLocaleString("he-IL"))}
                <div className="quote-row">
                  <span className="muted">קישור לחתימה</span>
                  <a href={quote.signUrl} target="_blank" rel="noreferrer" style={{ wordBreak: "break-all" }}>
                    פתח
                  </a>
                </div>
              </div>
              <div className="row" style={{ marginTop: 12 }}>
                <a className="btn secondary small" href={quote.fileUrl} target="_blank" rel="noreferrer">
                  צפה בקובץ המקורי
                </a>
                <button
                  className="btn ghost small"
                  onClick={() => navigator.clipboard.writeText(quote.signUrl)}
                >
                  העתק קישור
                </button>
              </div>
            </div>

            {quote.signature ? (
              <div className="card">
                <h2 style={{ marginBottom: 12 }}>פרטי החתימה</h2>
                {row("מייל החותם", quote.signature.signerEmail)}
                {quote.signature.signerName && row("שם", quote.signature.signerName)}
                {row("שיטה", quote.signature.method === "draw" ? "ציור" : "הקלדת שם")}
                {row("מועד", new Date(quote.signature.signedAt).toLocaleString("he-IL"))}
                {quote.signature.signerIp && row("כתובת IP", quote.signature.signerIp)}
                {row("ביקש עותק", quote.signature.clientWantsCopy ? "כן" : "לא")}
                {quote.signature.signedPdfUrl && (
                  <div style={{ marginTop: 14 }}>
                    <a className="btn block" href={quote.signature.signedPdfUrl} target="_blank" rel="noreferrer">
                      הורד PDF חתום
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <div className="card">
                <p className="muted">ההצעה עדיין לא נחתמה.</p>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
