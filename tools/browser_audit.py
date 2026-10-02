"""Headless checks for archived pricing, risk, reload and original formulas."""
import copy
import csv
import functools
import hashlib
import http.server
import io
import json
import os
import threading
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"output/redesign"
OUT.mkdir(parents=True,exist_ok=True)
DATA=json.loads((ROOT/"examples/portfolio/data/datasets.json").read_text(encoding="utf-8"))
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args):
        pass
server=http.server.ThreadingHTTPServer(("127.0.0.1",0),functools.partial(Quiet,directory=str(ROOT/"examples/portfolio")))
threading.Thread(target=server.serve_forever,daemon=True).start()
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(**({"channel":"chrome"} if os.name=="nt" else {}))
        page=browser.new_page(viewport={"width":1280,"height":940},reduced_motion="reduce")
        errors=[]
        page.on("pageerror",lambda e:errors.append(str(e)))
        url=os.environ.get("AUDIT_URL",f"http://127.0.0.1:{server.server_port}/")
        page.goto(url,wait_until="networkidle")
        page.wait_for_function("window.__datasets?.ready && !__datasets.refreshing")
        assert page.evaluate("__datasets.count")==3741
        assert page.locator("#sheet-kpis span").count()==6
        assert page.locator("#families button").count()==8
        page.locator(".risk-measures summary").click()
        assert page.locator(".risk-grid span").count()==4
        mean=page.evaluate("__datasets.result.mean")
        profit=page.evaluate("__datasets.result.profit")
        page.locator("#buy-in").fill("259")
        assert abs(page.evaluate("__datasets.result.profit")-(profit-100))<1e-8
        assert page.locator(".risk-measures").get_attribute("open") is not None
        page.locator(".risk-measures summary").click()
        for query in ["clarity precision","hatred","zzzz",""]*2:
            page.locator("#search").fill(query)
            n=page.evaluate("__datasets.filtered")
            assert n==0 if query=="zzzz" else n>0
            assert page.evaluate("__datasets.result.mean")==mean
        page.locator("#group").select_option("Clarity")
        assert 0<page.evaluate("__datasets.filtered")<3741
        page.locator("#group").select_option("")
        for sort in ["low","name","listings","high"]:
            page.locator("#sort").select_option(sort)
        page.locator("#rows [data-source]").first.click()
        assert "WEtato pairs!" in page.locator(".source-evidence").inner_text()
        assert "2026-08" in page.locator(".source-evidence").inner_text()
        page.locator("#rows [data-source]").first.click()
        assert page.locator(".source-evidence").count()==0
        page.locator("#next").click()
        first=page.evaluate("__datasets.firstVisible")
        assert page.evaluate("__datasets.page")==1
        page.locator("#refresh").click()
        page.wait_for_function("!__datasets.refreshing")
        assert page.evaluate("__datasets.page")==1
        assert page.evaluate("__datasets.firstVisible")==first
        assert page.locator("#buy-in").input_value()=="259"
        page.locator("#previous").click()
        page.locator("#search").fill("clarity precision")
        with page.expect_download() as dl:
            page.locator("#export").click()
        exported=list(csv.DictReader(io.StringIO(Path(dl.value.path()).read_text(encoding="utf-8"))))
        assert len(exported)==page.evaluate("__datasets.filtered")
        assert all(row["status"]=="observed" and "Clarity" in row["variant"] and row["source"] for row in exported)
        assert "measured" in exported[0] and "probability" in exported[0]
        page.locator("#search").fill("")
        page.locator("#buy-in").fill("-1")
        assert page.locator("#cost-error").is_visible()
        assert page.evaluate("__datasets.result.profit") is None
        assert page.evaluate("__datasets.result.mean")==mean
        page.locator("#buy-in").fill("")
        assert page.evaluate("__datasets.result.profit") is None
        assert page.locator("#cost-error").is_hidden()
        page.locator("#restore").click()
        assert page.locator("#buy-in").input_value()=="159"
        page.locator('[data-mode="triples"]').click()
        assert page.evaluate("__datasets.count")==105995
        assert page.locator("#buy-in").input_value()=="426.5"
        assert "Modelled triple" in page.locator("#rows").inner_text()
        page.locator("#buy-in").fill("500")
        page.locator("#search").fill("clarity precision hatred")
        with page.expect_download() as dl:
            page.locator("#export").click()
        triples=list(csv.DictReader(io.StringIO(Path(dl.value.path()).read_text(encoding="utf-8"))))
        assert triples and all(r["status"]=="modelled" and r["listings"]=="" for r in triples)
        page.locator('#rows [data-source]').first.click()
        assert "Maximum of the three" in page.locator(".source-evidence").inner_text()
        page.screenshot(path=str(OUT/"modelled-triple-desktop.png"),full_page=True)
        page.locator('[data-mode="pairs"]').click()
        assert page.evaluate("__datasets.count")==3741
        assert page.locator("#buy-in").input_value()=="159"
        page.locator('[data-mode="triples"]').click()
        assert page.locator("#buy-in").input_value()=="500"
        assert page.locator("#search").input_value()=="clarity precision hatred"
        page.locator('[data-mode="pairs"]').click()
        for d in DATA["datasets"]:
            page.locator('[data-family="'+d["id"]+'"]').click()
            assert page.evaluate("__datasets.count")==len(d["rows"])
            assert page.evaluate("__datasets.id")==d["id"]
            if any(r["price"] is None for r in d["rows"]):
                assert page.evaluate("__datasets.result.mean") is None
                page.locator("#coverage").select_option("missing")
                assert page.evaluate("__datasets.filtered")==sum(r["price"] is None for r in d["rows"])
                with page.expect_download() as dl:
                    page.locator("#export").click()
                missing=list(csv.DictReader(io.StringIO(Path(dl.value.path()).read_text(encoding="utf-8"))))
                assert all(r["price"]=="" for r in missing)
                page.locator("#coverage").select_option("all")
            if d["id"]=="sublime":
                assert page.locator("#buy-in").input_value()==""
                page.locator('#rows [data-source]').first.click()
                assert "Median of the ten" in page.locator(".source-evidence").inner_text()
            if d["id"]=="mageblood":
                page.locator(".model-note summary").click()
                assert "Conditional" in page.locator("#assumption").inner_text()
                page.screenshot(path=str(OUT/"missing-coverage-desktop.png"),full_page=True)
                page.locator(".model-note summary").click()
        page.locator('[data-family="watchers"]').click()
        # A held response proves family switching remains safe during a reload.
        held=[]
        page.route("**/data/datasets.json",lambda route:held.append(route))
        page.locator("#refresh").click()
        page.wait_for_function("__datasets.refreshing")
        page.locator('[data-family="split"]').click()
        assert page.evaluate("__datasets.id")=="split"
        assert held
        held.pop().fulfill(json=DATA)
        page.wait_for_function("!__datasets.refreshing")
        assert page.evaluate("__datasets.id")=="split"
        page.unroute("**/data/datasets.json")
        # Changed fixture prices prove Reload archive really applies the response.
        changed=copy.deepcopy(DATA)
        changed["datasets"][1]["rows"][0]["price"]+=100
        old=page.evaluate("__datasets.result.mean")
        page.route("**/data/datasets.json",lambda route:route.fulfill(json=changed))
        page.locator("#refresh").click()
        page.wait_for_function("!__datasets.refreshing")
        assert abs(page.evaluate("__datasets.result.mean")-old-100/36)<1e-8
        page.unroute("**/data/datasets.json")
        for bad in ["http","schema"]:
            page.route("**/data/datasets.json",lambda route:route.fulfill(status=503,body="unavailable") if bad=="http" else route.fulfill(json={"datasets":[]}))
            kept=page.evaluate("__datasets.result.mean")
            page.locator("#refresh").click()
            page.wait_for_function("!__datasets.refreshing")
            assert "Reload failed" in page.locator("#status").inner_text()
            assert page.evaluate("__datasets.result.mean")==kept
            assert page.locator("#refresh").is_enabled()
            page.unroute("**/data/datasets.json")
        page.locator("#refresh").click()
        page.wait_for_function("!__datasets.refreshing")
        assert abs(page.evaluate("__datasets.result.mean")-old)<1e-8
        page.goto(url,wait_until="networkidle")
        page.wait_for_function("__datasets.ready && !__datasets.refreshing")
        page.evaluate("scrollTo(0,0)")
        page.screenshot(path=str(OUT/"workbook-desktop.png"),full_page=True)
        page.screenshot(path=str(ROOT/"examples/portfolio/preview.png"),full_page=True)
        page.set_viewport_size({"width":390,"height":844})
        assert page.evaluate("document.documentElement.scrollWidth<=innerWidth+1")
        page.screenshot(path=str(OUT/"workbook-mobile.png"),full_page=True)
        page.locator("#dataset-select").select_option("terror")
        assert page.evaluate("__datasets.id")=="terror"
        assert page.evaluate("__datasets.result.mean") is None
        page.locator("#coverage").select_option("missing")
        page.locator('#rows [data-source]').first.click()
        assert page.evaluate("document.documentElement.scrollWidth<=innerWidth+1")
        page.screenshot(path=str(OUT/"missing-coverage-mobile.png"),full_page=True)
        # Original calculation, formula inspection and untouched workbook downloads.
        page.goto(url.split('?')[0]+"archive.html",wait_until="networkidle")
        page.wait_for_function("window.__poe?.ready")
        assert page.evaluate("__poe.outcomes")==101
        assert abs(page.evaluate("__poe.result.profit")-1.7920792079207921)<1e-8
        assert page.locator("#chart text").first.get_attribute("font-size")=="12"
        assert page.evaluate("document.documentElement.scrollWidth<=innerWidth+1")
        page.screenshot(path=str(OUT/"original-calculator-mobile.png"))
        page.locator('[data-price]').first.fill("")
        assert page.evaluate("__poe.result.profit") is None
        page.locator("#restore").click()
        page.locator("#cost").fill("")
        assert page.locator("#export").is_disabled()
        page.locator("#restore").click()
        page.locator("#chart").scroll_into_view_if_needed()
        page.screenshot(path=str(OUT/"original-histogram-mobile.png"))
        page.locator('[data-tab="archive"]').click()
        page.locator('[data-cell="I5"]').click()
        assert page.locator("#formula").inner_text()=="=H5/101"
        with page.expect_download() as dl:
            page.locator("#download").click()
        original=ROOT/"examples/portfolio/assets/adorned profit.xlsx"
        assert hashlib.sha256(Path(dl.value.path()).read_bytes()).digest()==hashlib.sha256(original.read_bytes()).digest()
        assert page.evaluate("document.documentElement.scrollWidth<=innerWidth+1")
        page.screenshot(path=str(OUT/"original-workbook-mobile.png"))
        page.set_viewport_size({"width":1280,"height":940})
        page.evaluate("scrollTo(0,0)")
        page.screenshot(path=str(OUT/"original-workbook-desktop.png"))
        page.locator('[data-tab="variants"]').click()
        assert page.evaluate("__poe.pairs")==3741
        page.locator("#mod-search").fill("Anger")
        assert page.locator(".pair").count()>0
        page.locator('[data-tab="pipeline"]').click()
        assert page.locator(".workflow li").count()==4
        failed=browser.new_page()
        failed.on("pageerror",lambda e:errors.append(str(e)))
        failed.route("**/data/datasets.json",lambda route:route.fulfill(status=500,body="unavailable"))
        failed.goto(url,wait_until="networkidle")
        assert "could not load" in failed.locator("#status").inner_text()
        assert failed.locator("#refresh").is_enabled()
        assert failed.locator("#export").is_disabled()
        failed.unroute("**/data/datasets.json")
        failed.locator("#refresh").click()
        failed.wait_for_function("__datasets.ready && !__datasets.refreshing")
        failed_archive=browser.new_page()
        failed_archive.on("pageerror",lambda e:errors.append(str(e)))
        failed_archive.route("**/data/archive.json",lambda route:route.fulfill(status=500,body="unavailable"))
        failed_archive.goto(url.split('?')[0]+"archive.html",wait_until="networkidle")
        assert failed_archive.locator("#restore").is_disabled()
        assert failed_archive.locator("#export").is_disabled()
        assert "could not load" in failed_archive.locator("#error").inner_text()
        assert not errors,errors
        (OUT/"checks.json").write_text(json.dumps({"passed":True,"browser_errors":errors,"viewports":[1280,390],"checks":["8 real families","2/3mod mode and retained assumptions","all six risk measures","filter-invariant full EV","negative/blank buy-in","source cells/timestamps/floors","CSV provenance/modelled/missing fields","real reload response application","switch during held reload","HTTP/schema failure and retry","initial failure and recovery","mobile ledger/source inspection","original formula I5","byte-identical XLSX download","original histogram and variant catalogue"]},indent=2))
        print("PASS: family ledger, 105995 triples, full risk/coverage, source exports, real reload/failures and original workbook")
        browser.close()
finally:
    server.shutdown()
