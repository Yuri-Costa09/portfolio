"""Render /cv/ to public/cv.pdf using the site's own print styles.

Usage (after `npm run build`):
    pip install playwright && playwright install chromium
    python scripts/cv_pdf.py

Then rebuild so the PDF is copied into dist/.
"""
import functools
import http.server
import pathlib
import threading

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
DIST = ROOT / "dist"
OUT = ROOT / "public" / "cv.pdf"
PORT = 4399


def main() -> None:
    if not (DIST / "cv" / "index.html").exists():
        raise SystemExit("Run `npm run build` first.")

    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(DIST))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            page = browser.new_page(color_scheme="light")
            page.goto(f"http://127.0.0.1:{PORT}/cv/", wait_until="networkidle")
            page.emulate_media(media="print")
            page.pdf(path=str(OUT), format="A4", print_background=True, prefer_css_page_size=True)
            browser.close()
    finally:
        server.shutdown()
    print(f"Wrote {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
