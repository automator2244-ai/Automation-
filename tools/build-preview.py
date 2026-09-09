#!/usr/bin/env python3
"""Turn index.html into a self-contained Artifact preview.

The Artifact host wraps the file in its own <!doctype>/<html>/<head>/<body> and
applies its own CSP, and it will not serve our sibling asset files. So this:

  - strips the document skeleton and our CSP meta,
  - inlines every font, logo and photo as a data: URI,
  - swaps the Turnstile mount for a static placeholder, since the Artifact CSP
    blocks challenges.cloudflare.com and the widget can never render there.

The result renders identically to the real page for review purposes. The form
cannot submit inside the Artifact — that is expected, and only the visual layer
is under review.

Usage: python3 tools/build-preview.py [out.html]
"""
import base64
import mimetypes
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "index.html"
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "preview.artifact.html"


def data_uri(path: Path) -> str:
    mime, _ = mimetypes.guess_type(path.name)
    if path.suffix == ".woff2":
        mime = "font/woff2"
    mime = mime or "application/octet-stream"
    return f"data:{mime};base64,{base64.b64encode(path.read_bytes()).decode()}"


def main() -> int:
    html = SRC.read_text(encoding="utf-8")

    # 1. drop the skeleton — the Artifact host supplies its own
    html = re.sub(r"^<!DOCTYPE html>\s*<html[^>]*>\s*<head>\s*", "", html, flags=re.I)
    html = re.sub(r"\s*</head>\s*<body>\s*", "\n", html, flags=re.I)
    html = re.sub(r"\s*</body>\s*</html>\s*$", "\n", html, flags=re.I)

    # 2. drop our CSP + the icon links the host cannot resolve
    html = re.sub(r'<meta http-equiv="Content-Security-Policy"[^>]*>\s*', "", html)
    html = re.sub(r'<link rel="(?:icon|apple-touch-icon)"[^>]*>\s*', "", html)
    html = re.sub(r'<link rel="preload" as="font"[^>]*>\s*', "", html)

    # 3. inline fonts (referenced from CSS url(...)) and the photo
    for font in sorted((ROOT / "assets" / "fonts").glob("*.woff2")):
        ref = f"assets/fonts/{font.name}"
        if ref in html:
            html = html.replace(f"url({ref})", f"url({data_uri(font)})")

    photo = ROOT / "bnaya.jpg"
    html = html.replace('src="bnaya.jpg"', f'src="{data_uri(photo)}"')

    # 4. logos are resolved at runtime by logoUrl(); hand it a lookup table
    logos = {p.name: data_uri(p) for p in sorted((ROOT / "assets" / "logos").iterdir()) if p.is_file()}
    table = ",\n".join(f'  {name!r}: {uri!r}' for name, uri in logos.items())
    html = html.replace(
        "function logoUrl(p){ return 'assets/logos/' + p.icon; }",
        "const LOGO_DATA = {\n" + table + "\n};\n"
        "function logoUrl(p){ return LOGO_DATA[p.icon] || ''; }",
    )

    # 5. Turnstile cannot load under the Artifact CSP — show its footprint instead
    html = html.replace(
        '<div id="turnstileBox" class="turnstile-box" hidden></div>',
        '<div id="turnstileBox" class="turnstile-box">'
        '<div style="display:flex;align-items:center;gap:.5rem;width:300px;height:65px;'
        'border:1px dashed var(--rule);color:var(--neutral);font-size:.8rem;'
        'justify-content:center;background:var(--paper-2)">'
        'אימות Cloudflare — לא נטען בתצוגה מקדימה</div></div>',
    )

    # Assert on real references only — a prose mention in a comment is harmless.
    assert "url(assets/fonts/" not in html, "a font reference survived"
    assert "'assets/logos/' +" not in html, "the runtime logo path survived"
    assert 'src="assets/' not in html, "an asset src survived"
    assert 'src="bnaya.jpg"' not in html, "the photo reference survived"

    OUT.write_text(html, encoding="utf-8")
    print(f"wrote {OUT.name}  ({OUT.stat().st_size/1024:.0f} KB, {len(logos)} logos inlined)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
