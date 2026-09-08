import http from 'node:http';
import worker from './index.js';

// Local stand-in for Make, so we can see exactly what gets forwarded.
const received = [];
const make = http.createServer((req, res) => {
  let body = '';
  req.on('data', c => body += c);
  req.on('end', () => { received.push(JSON.parse(body)); res.writeHead(200); res.end('ok'); });
});
await new Promise(r => make.listen(0, r));
const MAKE_URL = `http://127.0.0.1:${make.address().port}/hook`;

const ORIGIN = 'https://ezpath-ai.com';
const PASS = '1x0000000000000000000000000000000AA';  // real Cloudflare test secret: always passes
const FAIL = '2x0000000000000000000000000000000AA';  // real Cloudflare test secret: always fails

const baseEnv = { ALLOWED_ORIGIN: ORIGIN, MAKE_WEBHOOK_URL: MAKE_URL, TURNSTILE_SECRET: PASS };
const lead = { name:'בניה', email:'real@example.com', phone:'050-1234567', about:'שלום', turnstile_token:'tok' };

function req(body, { method='POST', origin=ORIGIN, ip='1.2.3.4' } = {}) {
  return new Request('https://worker.example/', {
    method,
    headers: { 'Content-Type':'application/json', 'Origin':origin, 'CF-Connecting-IP':ip },
    body: method === 'POST' ? JSON.stringify(body) : undefined,
  });
}
const call = (body, env = baseEnv, opts) => worker.fetch(req(body, opts), env);

let pass = 0, fail = 0;
async function check(label, got, want) {
  const ok = got === want;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(46)} ${got}${ok ? '' : `  (expected ${want})`}`);
  ok ? pass++ : fail++;
}

console.log('Worker behaviour (Turnstile calls hit the REAL Cloudflare API):\n');
await check('OPTIONS preflight',            (await worker.fetch(req(null,{method:'OPTIONS'}), baseEnv)).status, 204);
await check('GET rejected',                 (await worker.fetch(req(null,{method:'GET'}),     baseEnv)).status, 405);
await check('foreign Origin rejected',      (await call(lead, baseEnv, { origin:'https://evil.example' })).status, 403);
await check('missing Turnstile token',      (await call({ ...lead, turnstile_token:undefined })).status, 400);
await check('invalid token (real API)',     (await call(lead, { ...baseEnv, TURNSTILE_SECRET: FAIL })).status, 403);
await check('malformed email',              (await call({ ...lead, email:'not-an-email' })).status, 400);
await check('malformed phone',              (await call({ ...lead, phone:'abc' })).status, 400);
await check('over-long name',               (await call({ ...lead, name:'x'.repeat(101) })).status, 400);
await check('oversized body',               (await call({ ...lead, about:'x'.repeat(9000) })).status, 413);

const before = received.length;
await check('honeypot filled -> fake 200',  (await call({ ...lead, company_website:'spam' })).status, 200);
await check('  ...and NOT forwarded',       received.length - before, 0);

const n = received.length;
await check('valid lead accepted',          (await call(lead)).status, 200);
await check('  ...and forwarded to Make',   received.length - n, 1);

const limiter = { RATE_LIMITER: { limit: async () => ({ success:false }) } };
await check('rate limited -> 429',          (await call(lead, { ...baseEnv, ...limiter })).status, 429);

// The Worker must forward only whitelisted fields, never the raw client body.
const fwd = received[received.length - 1];
const extra = await call({ ...lead, isAdmin:true, injected:'x' });
const last = received[received.length - 1];
await check('client cannot inject fields',  Object.keys(last).some(k => k==='isAdmin'||k==='injected') ? 'leaked' : 'clean', 'clean');
console.log('\n  forwarded payload keys:', Object.keys(fwd).join(', '));

make.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
