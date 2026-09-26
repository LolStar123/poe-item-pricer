"""Exercise the refresh pipeline, workbook preview, export and archived workbook."""
import functools
import http.server
import os
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


server = http.server.ThreadingHTTPServer(
    ("127.0.0.1", 0),
    functools.partial(Quiet, directory=str(ROOT / "examples/portfolio")),
)
threading.Thread(target=server.serve_forever, daemon=True).start()
try:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            **({"channel": "chrome"} if os.name == "nt" else {})
        )
        page = browser.new_page(viewport={"width": 1280, "height": 940})
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        url = os.environ.get("AUDIT_URL", f"http://127.0.0.1:{server.server_port}/")
        page.goto(url)
        page.wait_for_function("window.__datasets?.ready")
        page.wait_for_function("window.__datasets.refreshId === 1 && !window.__datasets.refreshing")
        assert page.evaluate("window.__datasets.count") == 3741
        assert page.locator("#rows tr").count() == 6
        assert page.locator(".pipeline .done").count() == 4
        assert page.locator("#status").inner_text() == "3,741 rows refreshed."

        page.locator("#search").fill("clarity precision")
        assert 0 < page.evaluate("window.__datasets.filtered") < 3741
        previous = page.evaluate("window.__datasets.refreshId")
        page.locator("#refresh").click()
        page.wait_for_function(
            "previous => window.__datasets.refreshId > previous && !window.__datasets.refreshing",
            arg=previous,
        )

        with page.expect_download() as download:
            page.locator("#export").click()
        assert "Clarity" in Path(download.value.path()).read_text(encoding="utf-8")

        page.locator("#dataset-select").select_option("split")
        page.wait_for_function("window.__datasets.id === 'split' && !window.__datasets.refreshing")
        assert page.evaluate("window.__datasets.count") == 36
        previous = page.evaluate("window.__datasets.refreshId")
        page.locator("#dataset-select").select_option("watchers")
        page.wait_for_function(
            "previous => window.__datasets.id === 'watchers' && window.__datasets.refreshId > previous && !window.__datasets.refreshing",
            arg=previous,
        )
        page.screenshot(path=str(ROOT / "examples/portfolio/preview.png"), full_page=True)

        page.set_viewport_size({"width": 390, "height": 844})
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth + 1")

        page.set_viewport_size({"width": 1280, "height": 940})
        page.goto(url.rstrip("/") + "/archive.html")
        page.wait_for_function("window.__poe?.ready")
        assert page.evaluate("window.__poe.outcomes") == 101
        assert abs(page.evaluate("window.__poe.result.profit") - 1.7920792079207921) < 1e-8
        page.locator("[data-tab='archive']").click()
        page.locator("[data-cell='I5']").click()
        assert page.locator("#formula").inner_text() == "=H5/101"
        page.locator("[data-tab='variants']").click()
        assert page.evaluate("window.__poe.pairs") == 3741
        assert not errors, errors
        print("PASS: refresh pipeline, dataset switch, search, export, mobile and archived workbook")
        browser.close()
finally:
    server.shutdown()
