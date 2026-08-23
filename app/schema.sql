-- EZ.Path.AI signature app — D1 (SQLite) schema.
-- Run: npm run db:init:local   (local dev)  /  npm run db:init:remote  (production)

CREATE TABLE IF NOT EXISTS quotes (
  id            TEXT PRIMARY KEY,           -- internal uuid
  token         TEXT NOT NULL UNIQUE,       -- unguessable public link token
  title         TEXT NOT NULL,              -- e.g. "הצעת מחיר – חברת X"
  file_key      TEXT NOT NULL,              -- R2 key of the uploaded quote
  file_type     TEXT NOT NULL,             -- 'pdf' | 'image'
  sig_page      INTEGER NOT NULL DEFAULT 1, -- 1-based page for the signature (PDF)
  sig_x         REAL NOT NULL,              -- signature box, % of page width (0..1)
  sig_y         REAL NOT NULL,              -- % of page height, from top (0..1)
  sig_w         REAL NOT NULL,              -- width as % of page width
  sig_h         REAL NOT NULL,              -- height as % of page height
  status        TEXT NOT NULL DEFAULT 'sent', -- 'sent' | 'viewed' | 'signed'
  notify_email  TEXT NOT NULL,             -- owner address that gets the alert
  created_at    TEXT NOT NULL,
  viewed_at     TEXT
);

CREATE TABLE IF NOT EXISTS signatures (
  id                TEXT PRIMARY KEY,
  quote_id          TEXT NOT NULL,
  signer_email      TEXT NOT NULL,
  signer_name       TEXT,                   -- when the "typed name" method is used
  method            TEXT NOT NULL,          -- 'draw' | 'type'
  signature_key     TEXT NOT NULL,          -- R2 key of the signature PNG
  signed_pdf_key    TEXT,                   -- R2 key of the final stamped PDF
  signed_at         TEXT NOT NULL,
  signer_ip         TEXT,
  user_agent        TEXT,
  client_wants_copy INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (quote_id) REFERENCES quotes(id)
);

CREATE INDEX IF NOT EXISTS idx_quotes_token ON quotes(token);
CREATE INDEX IF NOT EXISTS idx_signatures_quote ON signatures(quote_id);
