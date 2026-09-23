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
        url=os.environ.get('AUDIT_URL', f'http://127.0.0.1:{server.server_port}/')
        page.goto(url)
        page.wait_for_function('window.__datasets?.ready')
        assert page.evaluate('__datasets.count') == 3741
        assert page.locator('#metrics').is_visible()
        before=page.evaluate('__datasets.result.profit')
        page.locator('#buyin').fill('259')
        assert abs(page.evaluate('__datasets.result.profit')-(before-100))<1e-8
        page.locator('#buyin').fill('-1')
        assert page.locator('#error').inner_text()
        assert page.evaluate('__datasets.result') is None
        page.locator('#buyin').fill('259')
        page.locator('#search').fill('clarity precision')
        assert 0<page.evaluate('__datasets.filtered')<3741
        with page.expect_download() as dl:
            page.locator('#export').click()
        assert 'Clarity' in Path(dl.value.path()).read_text(encoding='utf-8')
        page.locator('#clear').click()
        page.locator('#mode').select_option('triple')
        assert page.evaluate('__datasets.count') == 105995
        page.locator('[data-dataset="terror"]').click()
        assert page.evaluate('__datasets.result.profit') is None
        page.locator('#coverage').select_option('missing')
        assert page.evaluate('__datasets.filtered')==15
        page.locator('[data-dataset="watchers"]').click()
        page.locator('#mode').select_option('pair')
        page.locator('#search').fill('no-such-mod-zzzz')
        assert page.locator('#empty').is_visible()
        page.locator('#clear').click()
        page.screenshot(path=str(ROOT / 'examples/portfolio/preview.png'))
        page.set_viewport_size({'width':390,'height':844})
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
        page.locator('#dataset-select').select_option('split')
        assert page.evaluate('__datasets.count')==36
        page.set_viewport_size({'width':1280,'height':1000})
        page.goto(url.rstrip('/')+'/archive.html')
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

        page.set_viewport_size({'width': 390, 'height': 844})
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
        assert not errors, errors
        print('PASS: priced dataset landing, EV edits, 105995 triples, filters, missing coverage, mobile switching, archive parity and downloads')
        browser.close()
finally:
    server.shutdown()
