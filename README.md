# sheetato / PoE item research

[Open the dataset browser](https://lolstar123.github.io/poe-item-pricer/)

Search 3,741 priced Watcher's Eye pairs, filter by aura, and compare expected resale, profit and risk against an editable buy-in. Switch to the 105,995 three-mod combinations to explore a model based on the strongest contained pair. These are archived asking prices from August 2026, not a live market feed.

![Dataset browser](examples/portfolio/preview.png)

## Start here

1. Pick an item dataset in the left sidebar (the selector on mobile).
2. **Browse variants**: search modifiers, tap an aura, sort prices or export your matches.
3. **Check EV & risk**: enter a buy-in to see average resale, average profit and the probability of profit across the whole dataset.

The Watcher's Eye selector switches between observed two-mod prices and modelled three-mod values. Filters never silently change the EV calculation.

## Explore the data

- Watcher's Eye: all 3,741 priced pairs, plus derived three-mod combinations.
- Split Personality: 36 modifier pairs.
- Forbidden Flame and Flesh: 166 outcomes each, with missing prices retained.
- Sublime Vision: 17 aura variants, median quotes and separate floors.
- Balance of Terror: 153 pairs, 138 priced.
- Mageblood: 171 double-implicit outcomes, 66 priced. The model is conditional on hitting double implicits.
- Voices: four outcomes with the archived published drop weights.

Search, filter, sort, inspect the source row, change the buy-in, or export the filtered data as CSV. A comparison table links every dataset. Filters narrow the table without silently changing the probability model. Missing price coverage prevents full EV rather than becoming zero.

[Early spreadsheets](https://lolstar123.github.io/poe-item-pricer/archive.html) remain available with their original formulas and downloads.

## Run locally

```sh
python -m http.server 8000 --directory examples/portfolio
node --test examples/portfolio/model.test.mjs
python tools/browser_audit.py
```

Browser checks need Playwright and Chromium. `tools/export_datasets.py <workbook>` reproduces the public export from the recovered Sheetato workbook using openpyxl. The public JSON contains only whitelisted item descriptions, prices, counts, timestamps and source cells.

## Files

- `examples/portfolio/datasets.mjs`: dataset search, three-mod pricing and risk adapter.
- `examples/portfolio/browser.mjs`: dataset browser interactions.
- `examples/portfolio/model.mjs`: expected value, dispersion and profit-factor calculations.
- `examples/portfolio/data/datasets.json`: recovered archive data.
- `tools/export_datasets.py`: reproducible extraction.
- `original/`: original collection logic.

See [provenance](PROVENANCE.md) for model boundaries and source hashes.
