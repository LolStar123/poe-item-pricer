# poe item pricer: working example

Change the buy-in and outcome prices; inspect EV, downside and incomplete price coverage.

**[Open the demo](https://lolstar123.github.io/poe-item-pricer/)** · [Calculation / workflow code](model.mjs) · [Checks](model.test.mjs)

![Example output](preview.png)

## Run it

From the repository root, with Python 3 and Node.js 22:

```sh
python -m http.server 8000 --directory examples/portfolio
```

Open http://localhost:8000. Change an input, or edit the JSON fixture, then export the computed result as JSON or CSV.

```sh
node --test examples/portfolio/model.test.mjs
```

## What it does

Residential-proxy collection logs item prices for the wider pipeline. Variant probabilities and buy-in costs feed linked sheets for expected value, dispersion and profit factor. Missing prices stay visible instead of becoming invented bargains.

## Scope and source

Authored chaos-price fixtures, no live trade connection. Return/risk is a per-outcome ratio, not an annualised investment Sharpe.

poe/gambles/buyin.py, formulaic.py and docs/ARCHITECTURE.md. The 50,000-variant scope comes from Atul; this example is deliberately smaller.

`model.mjs` is the small public implementation. `app.mjs` connects its inputs and outputs to the browser. No package install or network key is needed to run the example. GitHub Pages runs the same files after the checks pass.
