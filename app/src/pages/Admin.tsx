import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import TopBar from "../components/TopBar";
import { listQuotes } from "../lib/api";
import type { QuoteSummary } from "../../shared/types";

const STATUS_LABEL: Record<QuoteSummary["status"], string> = {
  sent: "נשלח",
  viewed: "נצפה",
  signed: "נחתם",
};

export default function Admin() {
  const [quotes, setQuotes] = useState<QuoteSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    listQuotes()
      .then(setQuotes)
      .catch((e) => setError(e.message === "unauthorized" ? "יש להתחבר כדי לגשת לניהול" : "שגיאה בטעינה"));
  }, []);

  async function copyLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(url);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      window.prompt("העתק את הקישור:", url);
    }
  }

  function whatsapp(q: QuoteSummary) {
    const msg = `שלום, מצורפת הצעת מחיר לחתימה דיגיטלית:\n${q.signUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  }

  return (
    <>
      <TopBar
        right={
          <button className="btn small" onClick={() => navigate("/admin/new")}>
            + הצעה חדשה
          </button>
        }
      />
      <div className="container">
        <h1 style={{ marginBottom: 4 }}>הצעות מחיר לחתימה</h1>
        <p className="muted" style={{ marginBottom: 20 }}>
          העלה הצעה, מקם את שדה החתימה, ושלח קישור בוואטסאפ.
        </p>

        {error && <div className="card error">{error}</div>}

        {!quotes && !error && (
          <div className="card" style={{ display: "flex", justifyContent: "center" }}>
            <div className="spinner" />
          </div>
        )}

        {quotes && quotes.length === 0 && (
          <div className="card" style={{ textAlign: "center" }}>
            <p className="muted" style={{ marginBottom: 16 }}>אין עדיין הצעות מחיר.</p>
            <button className="btn" onClick={() => navigate("/admin/new")}>
              צור הצעה ראשונה
            </button>
          </div>
        )}

        {quotes && quotes.length > 0 && (
          <div className="card">
            {quotes.map((q) => (
              <div className="quote-row" key={q.id}>
                <div className="meta">
                  <div className="title">{q.title}</div>
                  <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>
                    <span className={`pill ${q.status}`}>{STATUS_LABEL[q.status]}</span>{" "}
                    {new Date(q.createdAt).toLocaleDateString("he-IL")}
                    {q.signerEmail ? ` · ${q.signerEmail}` : ""}
                  </div>
                </div>
                <div className="row-actions">
                  <button className="btn ghost small" onClick={() => copyLink(q.signUrl)}>
                    {copied === q.signUrl ? "הועתק ✓" : "העתק קישור"}
                  </button>
                  <button className="btn secondary small" onClick={() => whatsapp(q)}>
                    וואטסאפ
                  </button>
                  <Link className="btn secondary small" to={`/admin/q/${q.id}`}>
                    פרטים
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
