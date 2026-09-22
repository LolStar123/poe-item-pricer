# poe item research

**[Open the research desk](https://lolstar123.github.io/poe-item-pricer/)**

The spreadsheets that grew into a larger item-pricing pipeline. Browse the original work, change outcome values and see expected profit, dispersion, probability of profit and profit factor update.

![Item research desk](examples/portfolio/preview.png)

## Real work to inspect

- **Adorned valuation:** 101 outcomes from the original 50-150 roll worksheet. The browser reproduces its saved profit-per-identification result.
- **Light of Meaning:** 13 original outcomes and weights. The calculated mean matches the saved workbook total.
- **Stacked decks:** the original opening log, starting 04/05/2024, with costs, card counts and realised proceeds.
- **Watcher's Eye:** the actual 87-aura-modifier catalogue, searchable across 3,741 two-mod combinations. These pairs do not carry invented prices.

Download the three original Excel files unchanged, or inspect their formulas and saved values in the browser. The two valuation sheets do not state a currency unit, so the app preserves source units. These are historical assumptions, not current profitability claims.

## Try it

Change buy-in or an outcome price. Blank a price to see coverage fall: complete EV and risk become unknown. Restore archive values, export edited outcomes, or inspect a cell formula. The histogram uses discrete probability weights.

## The later pipeline

Local residential-proxy collection records item prices, league and collection time. Defined modifier combinations make observations comparable. The [original buy-in logic](original/buyin.py) uses the median of the ten cheapest listings while showing the floor separately. Linked formulas feed EV and risk calculations; missing coverage remains explicit.

The public desk presents the archive and workflow. It has no live trade session, proxy connection or private credentials. Nominal modifier combinations are a catalogue calculation, not a claim that every pair is eligible or equally probable in game.

## Run and check

```sh
python -m http.server 8000 --directory examples/portfolio
node --test examples/portfolio/model.test.mjs
pip install playwright
python -m playwright install chromium
python tools/browser_audit.py
```

Open http://localhost:8000. [Risk calculations](examples/portfolio/model.mjs), [archive extraction](tools/export_archive.py), [source notes](PROVENANCE.md). Extraction uses openpyxl to read existing workbooks without rewriting them.
