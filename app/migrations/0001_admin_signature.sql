-- Round 2 migration: add the optional ADMIN signature box to existing quotes.
-- Run once in the D1 Console (dashboard) for the already-created database.
ALTER TABLE quotes ADD COLUMN admin_sig_page INTEGER;
ALTER TABLE quotes ADD COLUMN admin_sig_x REAL;
ALTER TABLE quotes ADD COLUMN admin_sig_y REAL;
ALTER TABLE quotes ADD COLUMN admin_sig_w REAL;
ALTER TABLE quotes ADD COLUMN admin_sig_h REAL;
ALTER TABLE quotes ADD COLUMN admin_signature_key TEXT;
ALTER TABLE quotes ADD COLUMN admin_sig_method TEXT;
