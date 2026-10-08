#!/usr/bin/env python3
"""Recompute the CSP sha256 hash for index.html's inline script.

The CSP pins the inline script by hash, so ANY edit to that script — even one
character — invalidates the hash and the browser refuses to run it, silently
breaking the whole page. Run this after every change to the script, then verify
in a real browser.

The hash covers the element's exact text content: everything between the ">" of
<script> and the "<" of </script>, including both surrounding newlines. Getting
those boundaries wrong produces a plausible-looking hash that fails at runtime,
so this deliberately slices rather than regex-matching, and refuses to run if
"<script>" appears more than once (e.g. quoted inside a comment).
"""
import base64
import hashlib
import re
import sys
from pathlib import Path

HTML = Path(__file__).resolve().parent.parent / "index.html"


def main() -> int:
    src = HTML.read_text(encoding="utf-8")

    n = src.count("<script>")
    if n != 1:
        print(f"ERROR: expected exactly one '<script>' in {HTML.name}, found {n}.")
        print("A literal '<script>' inside a comment or string will break this.")
        return 1

    start = src.index("<script>") + len("<script>")
    end = src.index("</script>", start)
    digest = hashlib.sha256(src[start:end].encode("utf-8")).digest()
    new_hash = base64.b64encode(digest).decode()

    csp_re = re.compile(r"(<meta http-equiv=\"Content-Security-Policy\" content=\")([^\"]*)(\">)")
    m = csp_re.search(src)
    if not m:
        print("ERROR: no Content-Security-Policy meta tag found.")
        return 1

    old = re.search(r"sha256-[A-Za-z0-9+/=]+", m.group(2))
    if old and old.group(0) == f"sha256-{new_hash}":
        print(f"Already correct: sha256-{new_hash}")
        return 0

    updated = re.sub(r"sha256-[A-Za-z0-9+/=]+", f"sha256-{new_hash}", m.group(2), count=1)
    HTML.write_text(src[: m.start(2)] + updated + src[m.end(2) :], encoding="utf-8")

    print(f"script content : {end - start} bytes")
    print(f"old hash       : {old.group(0) if old else '(none)'}")
    print(f"new hash       : sha256-{new_hash}")
    print("\nUpdated. Now verify in a browser that the script actually runs.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
