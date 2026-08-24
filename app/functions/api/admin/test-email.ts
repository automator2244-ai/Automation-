// GET /api/admin/test-email  (admin-gated) — diagnostic.
// Attempts a real send to NOTIFY_EMAIL and returns the exact Resend response,
// so misconfigurations surface with their real error message.
import type { Env } from "../../lib/util";
import { json } from "../../lib/util";

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const info = {
    hasResendKey: !!env.RESEND_API_KEY,
    keyPrefix: env.RESEND_API_KEY ? env.RESEND_API_KEY.slice(0, 3) : null,
    mailFrom: env.MAIL_FROM,
    mailFromName: env.MAIL_FROM_NAME,
    notifyEmail: env.NOTIFY_EMAIL,
    appBaseUrl: env.APP_BASE_URL,
    devMode: !!env.DEV_MODE,
  };

  if (!env.RESEND_API_KEY) {
    return json({ ...info, send: "NO_KEY_AT_RUNTIME" });
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: `${env.MAIL_FROM_NAME} <${env.MAIL_FROM}>`,
        to: [env.NOTIFY_EMAIL],
        subject: "בדיקת מערכת · EZ.Path.AI",
        html: "<p>זהו מייל בדיקה. אם קיבלת אותו — שליחת המיילים עובדת ✅</p>",
      }),
    });
    const body = await res.text();
    return json({ ...info, send: { status: res.status, ok: res.ok, body: body.slice(0, 600) } });
  } catch (e) {
    return json({ ...info, send: { error: String(e) } });
  }
};
