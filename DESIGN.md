# Sheetato: an item ledger

## Direction, before implementation

A Path of Exile player inspects archived variant prices and changes acquisition assumptions. The working dataset is the opening view. Choose a family, inspect coverage, change buy-in, search/order and export.

References inspected: the original archived workbook supplies cell rules, formula inspection and price provenance. The locally inspected Linear render supplies quiet nested surfaces only. Sheetato keeps mineral/bronze colors, serif item names and a ledger; Quant uses a cool citation index and market plot. No shared hero or layout.

The signature is a family inventory beside a dark calculation ledger. Coverage belongs beside EV; editable assumptions occupy a separate band from archived observations. Replace simulated proxy/listing steps with an actual JSON reload and explicit archive date. The browser does not collect live listings or write an XLSX.

## Tokens and typography

| Role | Value |
| --- | --- |
| Canvas | `#161717` |
| Ledger / raised cells | `#202222` / `#292b2a` |
| Rules | `#41453f` |
| Text / secondary text | `#f0eee7` / `#b6b9af` |
| Bronze action | `#d9bb88` |
| Calculation / coverage | `#a3c9b5` |

Segoe UI / system sans controls, Georgia for 30px item-family names, Consolas / system monospace for currency, probability and source cells. System fonts only; no binaries or network fonts. Controls 14px, modifier text 13px, metadata 12px. Labels replace unexplained abbreviations and hover-only descriptions.

A 1200px shell has a 216px family rail and flexible workbook. Spacing 4/8/12/16/24/32px. Rules and shallow 5px control corners describe a workbook. No gradients, giant hero, decorative window buttons or invented saved-file state.

## Product states

Family buttons show priced/total counts. Two-mod observations and three-mod assumptions have explicit mode controls. Three-mod values preserve the existing maximum-pair quote rule and equal-probability scenario. Row inspection exposes source, timestamp, probability and observed floor where supplied.

Prices/probabilities are read-only. Buy-in is editable with restore for the archived default. Filters never change the EV distribution. Incomplete coverage keeps full EV unknown; blank buy-in retains resale EV but clears profit. Invalid cost clears misleading results and identifies the input fix.

Refresh fetches the bundled JSON with cache bypass and validation; preserves selected family, query/order/page and user buy-in where meaningful; then recalculates. Failure keeps loaded rows and enables retry. Family switching works during outstanding refresh. CSV retains source, measurement and observed/modelled status.

At 390px the family selector replaces the rail, assumptions stay visible, EV and profit use two columns, secondary risk measures expand on demand, and rows become stacks. Archived tables have contained scrolling. Primary actions are at least 40px, keyboard focus is visible and reduced motion disables transitions. No staged delays or artificial animation.

## Acceptance checklist

Inspect 1280px and 390px renders. Verify every family, two/three-mod mode, coverage/group/text search, ordering/pages, restore and invalid/blank costs, refreshed data and network failure, source inspection and CSV. Preserve model/data hashes and inspect archived formulas. QA is ignored under output/redesign; accepted README screenshots are versioned deliberately.

## Final review corrections

EV and profit stay prominent. Four secondary risk measures and their definitions live in one expandable section, which stays open across buy-in edits. The filters follow a short all-outcomes note and model disclosure. The archive date and asking-price state stay visible on phones; successful reload messages and duplicate loaded timestamps were removed. Row-level modelled labels remain explicit. Desktop/mobile renders were inspected after the independent review corrections.
