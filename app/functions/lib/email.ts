// Transactional email via Resend. Hebrew RTL templates.
import type { Env } from "./util";
import { resendApiKey } from "./util";

interface Attachment {
  filename: string;
  content: string; // base64
}

interface SendArgs {
  to: string | string[];
  subject: string;
  html: string;
  attachments?: Attachment[];
}

export async function sendEmail(env: Env, args: SendArgs): Promise<void> {
  // In local dev without a key we skip real sending but log to the console so
  // the flow can be exercised end-to-end. In production a missing key is a real
  // error — surface it instead of pretending the mail was sent.
  const apiKey = resendApiKey(env);
  if (!apiKey) {
    if (env.DEV_MODE) {
      console.log("[email:skipped-no-key]", args.subject, "->", args.to);
      return;
    }
    throw new Error("RESEND_API_KEY not configured");
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: `${env.MAIL_FROM_NAME} <${env.MAIL_FROM}>`,
      to: Array.isArray(args.to) ? args.to : [args.to],
      subject: args.subject,
      html: args.html,
      attachments: args.attachments,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend failed (${res.status}): ${body}`);
  }
}

function shell(bodyHtml: string): string {
  return `<!doctype html><html lang="he" dir="rtl"><body style="margin:0;background:#f0fdf4;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px">
    <div style="background:#fff;border:1px solid #bbf7d0;border-radius:16px;overflow:hidden">
      <div style="background:linear-gradient(135deg,#22c55e,#16a34a);padding:20px 28px">
        <span style="color:#fff;font-size:20px;font-weight:700;letter-spacing:.5px">EZ.Path.AI</span>
      </div>
      <div style="padding:28px">${bodyHtml}</div>
    </div>
    <p style="text-align:center;color:#64748b;font-size:12px;margin-top:16px">הודעה זו נשלחה אוטומטית ממערכת החתימות של EZ.Path.AI</p>
  </div></body></html>`;
}

// Sent to the business owner whenever a quote is signed.
export function ownerSignedHtml(opts: {
  title: string;
  signerEmail?: string | null;
  signerName?: string | null;
  signedAt: string;
  ip?: string | null;
}): string {
  const when = new Date(opts.signedAt).toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" });
  const row = (label: string, value: string) =>
    `<tr><td style="padding:8px 0;color:#64748b">${label}</td><td style="padding:8px 0;font-weight:600">${escapeHtml(value)}</td></tr>`;
  return shell(`
    <h2 style="margin:0 0 8px;font-size:22px">✅ הצעת מחיר נחתמה</h2>
    <p style="margin:0 0 20px;color:#475569">לקוח חתם על הצעת מחיר. ה-PDF החתום מצורף להודעה זו.</p>
    <table style="width:100%;border-collapse:collapse;font-size:15px">
      ${row("הצעה", opts.title)}
      ${opts.signerName ? row("שם החותם", opts.signerName) : ""}
      ${opts.signerEmail ? row("מייל החותם", opts.signerEmail) : ""}
      ${row("מועד החתימה", when)}
      ${opts.ip ? row("כתובת IP", opts.ip) : ""}
    </table>
  `);
}

// Sent to the client if they ask for a copy.
export function clientCopyHtml(opts: { title: string }): string {
  return shell(`
    <h2 style="margin:0 0 8px;font-size:22px">העותק החתום שלך 📄</h2>
    <p style="margin:0 0 12px;color:#475569">תודה שחתמת על הצעת המחיר. מצורף עותק ה-PDF החתום עבור <strong>${escapeHtml(opts.title)}</strong>.</p>
    <p style="margin:0;color:#475569">נשמח לעמוד לשירותך. — צוות EZ.Path.AI</p>
  `);
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );
}
