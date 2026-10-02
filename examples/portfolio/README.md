# Sheetato workbook demo

See the [repository guide](../../README.md) for local serving, model tests, browser checks and source boundaries.

The main ledger reads `data/datasets.json`. `browser.mjs` keeps edited assumptions and filters separate from archived observations; `datasets.mjs` and `model.mjs` preserve the calculations. `archive.html` reads the early worksheets from `data/archive.json` and serves the unchanged XLSX downloads.
