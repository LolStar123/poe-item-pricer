# Sheetato demo design

## Job

Let a first-time visitor understand the product in one glance: choose an item family, refresh its archived prices into a workbook, inspect EV and risk, then export the rows.

## Visual system

- Auction terminal shell: `#111713`, `#172019`, muted rules and warm amber action ink.
- Familiar workbook surface: paper `#f2efe4`, sheet green `#397557`, dark green text.
- Georgia gives the workbook and item names some history. Segoe UI handles controls. Monospace is reserved for formulas, values and rows.
- Square corners and ruled cells belong to the spreadsheet. The page avoids cards, dashboard chrome, gradients and decorative data graphics.

## Signature

The working sheet is the hero. A four-stage refresh line feeds it, and each completed refresh rewrites the visible rows in sequence. The animation explains the pipeline without competing with the result.

## Responsive behaviour

Desktop keeps the pipeline and workbook wide enough to scan. Mobile stacks the refresh controls, uses a two-column metric ledger and keeps all three table columns inside a contained horizontal region. Every primary action remains at least 38px tall.

## Motion

Button presses scale to `0.96`. Refresh motion is limited to the active pipeline signal and one short row-write sequence. Reduced-motion users get the same state changes without travel or pulsing.
