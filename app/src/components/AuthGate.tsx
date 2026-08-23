import { useEffect, useState, type ReactNode } from "react";
import TopBar from "./TopBar";
import { checkAuth, login } from "../lib/api";

// Wraps the admin area: shows a password screen until authenticated.
export default function AuthGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<"loading" | "in" | "out">("loading");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    checkAuth().then((ok) => setState(ok ? "in" : "out"));
  }, []);

  async function submit() {
    if (!password) return;
    setBusy(true);
    setError(null);
    try {
      await login(password);
      setState("in");
    } catch {
      setError("סיסמה שגויה");
    } finally {
      setBusy(false);
    }
  }

  if (state === "loading") {
    return (
      <>
        <TopBar />
        <div className="center-screen">
          <div className="spinner" />
        </div>
      </>
    );
  }

  if (state === "in") return <>{children}</>;

  return (
    <>
      <TopBar />
      <div className="center-screen">
        <div className="card" style={{ maxWidth: 400, width: "100%", textAlign: "center" }}>
          <div style={{ fontSize: 40 }}>🔒</div>
          <h1 style={{ margin: "8px 0" }}>אזור ניהול</h1>
          <p className="muted" style={{ marginBottom: 20 }}>הזן סיסמה כדי להיכנס</p>
          <div className="field" style={{ textAlign: "start" }}>
            <label>סיסמה</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              autoFocus
            />
          </div>
          {error && <div className="error">{error}</div>}
          <button className="btn block" onClick={submit} disabled={busy} style={{ marginTop: 6 }}>
            {busy ? "מתחבר…" : "כניסה"}
          </button>
        </div>
      </div>
    </>
  );
}
