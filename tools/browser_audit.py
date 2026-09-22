"""Exercise original workbook data and the functional item-risk calculator."""
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
    ('127.0.0.1', 0), functools.partial(Quiet, directory=str(ROOT / 'examples/portfolio'))
)
threading.Thread(target=server.serve_forever, daemon=True).start()
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(**({'channel': 'chrome'} if os.name == 'nt' else {}))
        page = browser.new_page(viewport={'width': 1280, 'height': 1000})
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(os.environ.get('AUDIT_URL', f'http://127.0.0.1:{server.server_port}'))
        page.wait_for_function('window.__poe?.ready')
        assert page.evaluate('__poe.outcomes') == 101
        assert abs(page.evaluate('__poe.result.profit') - 1.7920792079207921) < 1e-8
        page.locator('[data-price="100"]').fill('500')
        assert page.evaluate('__poe.result.profit') > 2
        page.locator('[data-price="100"]').fill('')
        assert page.evaluate('__poe.result.profit') is None
        assert page.evaluate('__poe.result.coverage') < 1
        page.locator('#restore').click()
        page.locator('#case').select_option('meaning')
        assert page.evaluate('__poe.outcomes') == 13
        with page.expect_download() as dl:
            page.locator('#export').click()
        assert 'energy shield' in Path(dl.value.path()).read_text()
        page.locator('[data-tab="archive"]').click()
        page.locator('[data-cell="I5"]').click()
        assert page.locator('#formula').inner_text() == '=H5/101'
        with page.expect_download() as dl:
            page.locator('#download').click()
        assert Path(dl.value.path()).read_bytes().startswith(b'PK')
        page.locator('#book').select_option('decks')
        assert '04/05/2024' in page.locator('#workbook').inner_text()
        page.locator('[data-tab="variants"]').click()
        assert page.evaluate('__poe.pairs') == 3741
        page.locator('#mod-search').fill('Anger')
        assert 'Anger' in page.locator('#pairs').inner_text()
        page.locator('[data-tab="calculator"]').click()
        page.locator('#case').select_option('adorned')
        page.evaluate('window.scrollTo(0,0)')
        page.screenshot(path=str(ROOT / 'examples/portfolio/preview.png'))
        page.set_viewport_size({'width': 390, 'height': 844})
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
        assert not errors, errors
        print('PASS: original formula parity, edited outcomes, missing coverage, downloads and variants')
        browser.close()
finally:
    server.shutdown()
