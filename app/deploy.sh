#!/usr/bin/env bash
# One-shot deploy for the EZ.Path.AI signature app to Cloudflare.
# Run from your own machine (this handles D1 + R2 + Pages end to end).
#
# Prereqs: Node 18+ and git installed, and either:
#   export CLOUDFLARE_API_TOKEN=<your token>     (recommended)
#   or run `npx wrangler login` first.
#
# Usage:  cd app && bash deploy.sh
set -euo pipefail
cd "$(dirname "$0")"

echo "==> 1/8 Verifying Cloudflare auth"
npx wrangler whoami

echo "==> 2/8 Installing dependencies"
npm install

echo "==> 3/8 Ensuring D1 database (ezpath-sign)"
DB_ID=$(npx wrangler d1 list --json 2>/dev/null | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const a=JSON.parse(s);const m=a.find(x=>x.name==="ezpath-sign");process.stdout.write(m?(m.uuid||m.database_id||""):"")}catch{process.stdout.write("")}})' || true)
if [ -z "${DB_ID}" ]; then
  OUT=$(npx wrangler d1 create ezpath-sign)
  echo "$OUT"
  DB_ID=$(printf '%s' "$OUT" | grep -oiE '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' | head -1)
fi
if [ -z "${DB_ID}" ]; then echo "!! Could not determine D1 database_id"; exit 1; fi
echo "   D1 id: ${DB_ID}"

echo "==> 4/8 Writing database_id into wrangler.toml"
sed -i.bak -E "s/database_id = \"[^\"]*\"/database_id = \"${DB_ID}\"/" wrangler.toml && rm -f wrangler.toml.bak

echo "==> 5/8 Ensuring R2 bucket (ezpath-sign-files)"
npx wrangler r2 bucket create ezpath-sign-files 2>/dev/null || echo "   (bucket already exists — ok)"

echo "==> 6/8 Building the app"
npm run build

echo "==> 7/8 Creating the database tables (remote)"
npx wrangler d1 execute ezpath-sign --remote --file=./schema.sql

echo "==> 8/8 Deploying to Cloudflare Pages"
npx wrangler pages project create ezpath-sign --production-branch main 2>/dev/null || echo "   (Pages project already exists — ok)"
npx wrangler pages deploy dist --project-name ezpath-sign --branch main

echo ""
echo "✅ Done! Your app is live at the *.pages.dev URL shown above."
echo "   Next: connect the custom domain (sign.ezpath-ai.com), set the Resend key,"
echo "   and turn on Cloudflare Access — see SETUP.md."
