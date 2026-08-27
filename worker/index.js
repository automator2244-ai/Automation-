/**
 * EZ.Path.AI — lead form proxy.
 *
 * Sits between the landing page and the Make.com webhook so that:
 *   1. The Make webhook URL is never exposed in page source.
 *   2. Every submission must carry a valid Cloudflare Turnstile token.
 *   3. Submissions are rate limited per IP at the edge, before Make is called
 *      — so a flood costs zero Make.com operations.
 *
 * Secrets (set with `wrangler secret put <NAME>`, never committed):
 *   MAKE_WEBHOOK_URL   the real Make.com hook URL
 *   TURNSTILE_SECRET   Turnstile secret key
 *
 * Plain vars (wrangler.toml):
 *   ALLOWED_ORIGIN     e.g. https://ezpath-ai.com
 */

const LIMITS = { name: 100, email: 150, phone: 30, about: 2000 };
const MAX_BODY_BYTES = 8 * 1024;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
const PHONE_RE = /^[0-9+()\-\s]{7,30}$/;

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

function json(status, body, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  });
}

async function verifyTurnstile(token, ip, secret) {
  const form = new FormData();
  form.append('secret', secret);
  form.append('response', token);
  if (ip) form.append('remoteip', ip);

  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: form,
  });
  if (!res.ok) return false;
  const data = await res.json();
  return data.success === true;
}

export default {
  async fetch(request, env) {
    const allowed = env.ALLOWED_ORIGIN;
    const origin = request.headers.get('Origin');

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(allowed) });
    }
    if (request.method !== 'POST') {
      return json(405, { error: 'method_not_allowed' }, allowed);
    }
    // Reject cross-site callers outright. Not a security boundary on its own
    // (Origin is forgeable outside a browser) — Turnstile is what actually gates.
    if (origin !== allowed) {
      return json(403, { error: 'forbidden' }, allowed);
    }

    const ip = request.headers.get('CF-Connecting-IP') || '';

    // Rate limit before any parsing or outbound call.
    if (env.RATE_LIMITER) {
      const { success } = await env.RATE_LIMITER.limit({ key: ip || 'anonymous' });
      if (!success) {
        return json(429, { error: 'rate_limited' }, allowed);
      }
    }

    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) {
      return json(413, { error: 'payload_too_large' }, allowed);
    }

    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      return json(400, { error: 'bad_json' }, allowed);
    }

    const token = typeof data.turnstile_token === 'string' ? data.turnstile_token : '';
    if (!token) return json(400, { error: 'missing_token' }, allowed);

    const ok = await verifyTurnstile(token, ip, env.TURNSTILE_SECRET);
    if (!ok) return json(403, { error: 'failed_challenge' }, allowed);

    // Honeypot — a real browser never fills this.
    if (data.company_website) {
      // Look successful so bots get no signal, but forward nothing.
      return json(200, { ok: true }, allowed);
    }

    const name  = String(data.name  || '').trim();
    const email = String(data.email || '').trim();
    const phone = String(data.phone || '').trim();
    const about = String(data.about || '').trim();

    if (!name || !email || !phone) return json(400, { error: 'missing_fields' }, allowed);
    if (name.length  > LIMITS.name)  return json(400, { error: 'name_too_long' }, allowed);
    if (about.length > LIMITS.about) return json(400, { error: 'about_too_long' }, allowed);
    if (email.length > LIMITS.email || !EMAIL_RE.test(email)) return json(400, { error: 'bad_email' }, allowed);
    if (phone.length > LIMITS.phone || !PHONE_RE.test(phone)) return json(400, { error: 'bad_phone' }, allowed);

    // Forward a clean, whitelisted payload — never the raw client body.
    const upstream = await fetch(env.MAKE_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name, email, phone, about,
        source: 'landing_page',
        timestamp: new Date().toISOString(),
        ip,
      }),
    });

    if (!upstream.ok) {
      // Never surface upstream detail to the client.
      return json(502, { error: 'upstream_failed' }, allowed);
    }
    return json(200, { ok: true }, allowed);
  },
};
