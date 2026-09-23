# Dataset provenance

The primary browser uses a read-only export of `Sheetato-recalculated.xlsx`, recovered from the author's 15 August 2026 verification archive. Its SHA-256 is recorded in `examples/portfolio/data/datasets.json`. `tools/export_datasets.py` selects explicit row ranges and whitelists public item fields. It does not export hidden sheets, account records, proxy settings, credentials or Timeless seeds.

Prices are historical asking-price observations. Measurement dates stay attached to individual rows. The workbook's cached aggregate EVs are not copied: the browser recalculates from the exported outcome prices and probability model. This avoids mixing the workbook's separate historical conversion bases. Chaos and divine datasets retain their own source units; they are not compared as though they were the same currency.

Watcher?s Eye has 87 aura modifiers and all 3,741 unique two-mod pairs priced. Three-mod mode enumerates 105,995 combinations and values each at the maximum of its three contained pair quotes. This is a model, not 105,995 measured triple listings. Equal outcome probabilities are an explicit scenario assumption, not verified drop rates. Boss-drop buy-ins use the workbook's level-85 and level-86 historical inputs, 159 and 426.5 chaos.

Sublime Vision uses median-of-ten prices and shows the separately observed floor. Other exported datasets preserve their sheet's price definition. Forbidden jewels contain one missing outcome each. Balance of Terror has 15 unpriced outcomes; Mageblood has 105. Missing probability is never renormalised away. Mageblood weights are conditional on the double-implicit branch and do not represent full corruption-attempt EV. Voices preserves the workbook's published weights. An absent buy-in remains blank.

Only a dated archive is available here; these prices are not suitable as current trade quotes.

## Earlier workbooks

Three original workbooks are copied byte-for-byte: adorned profit.xlsx, light of meaning ID EV.xlsx and stacked deck data.xlsx. The JSON view extracts formulas and saved values using read-only access. No external workbook links or macros exist in these files; a credential-pattern scan found no matches in their XML.

Adorned C5:E105 contains 101 historical rolls from 50 to 150. Equal weights match the source SUM(F5:F105)/101 calculation. Original zero valuations remain deliberate archived inputs. Light of Meaning B3:D15 carries its saved probability assumptions. Neither valuation workbook labels the currency unit. Stacked decks records a start date of 04/05/2024.

The aura modifiers come from the author's catalogue_v1.json, exporting only mod_id, aura and display_text. The catalogue date and league remain in archive.json. All 87 choose 2 pairs are enumerated without invented prices or probabilities.

The broader collection workflow is described from the original code. The earlier-workbooks surface is an archive, catalogue and functional risk calculator, not a live trade collector. No account credentials or proxy addresses are included.
