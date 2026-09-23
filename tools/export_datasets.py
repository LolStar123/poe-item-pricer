"""Export whitelisted item-price fields from the recovered Sheetato archive.
No account data, formulas, hidden sheets or Timeless seeds are published.
"""
import argparse
import hashlib
import json
from datetime import datetime
from pathlib import Path
import openpyxl

parser = argparse.ArgumentParser()
parser.add_argument("workbook", type=Path)
a = parser.parse_args()
w = openpyxl.load_workbook(a.workbook, read_only=True, data_only=True)
root = Path(__file__).resolve().parents[1] / "examples/portfolio/data"
def num(v):
    return v if isinstance(v, (int, float)) and not isinstance(v, bool) else None
def stamp(v):
    return v.isoformat() + "Z" if isinstance(v, datetime) else None
def rows(name, start, end):
    return list(w[name].iter_rows(min_row=start, max_row=end, values_only=True))
def item(label, price, listed, date, source, **extra):
    return dict(label=label, price=num(price), listings=num(listed), measured=stamp(date), source=source, **extra)
datasets=[]
def add(id, name, description, unit, cost, note, records, weighted=False):
    if not weighted:
        for r in records: r["probability"] = 1 / len(records)
    datasets.append(dict(id=id, name=name, description=description, unit=unit, cost=cost,
                         assumption=note, rows=records))
records=[]
for i,r in enumerate(rows("WEtato pairs",6,3746),6):
    records.append(item(r[0]+" + "+r[1],r[3],r[4],r[5],f"WEtato pairs!A{i}:F{i}", mods=[r[0],r[1]], group=r[0].split(" - ")[0]))
assert len(records)==3741 and len({tuple(sorted(r["mods"])) for r in records})==3741
add("watchers","Watcher's Eye", "Search every two-mod pair, or value three-mod eyes from their strongest pair.","chaos",159,
    "Equal pair probabilities are an assumption. Prices are the cheapest asking listings containing both mods, not completed sales. Three-mod values use the maximum of their three pair prices; they are modelled, not observed triple listings.",records)
for id,name,end,pricecol,listcol,datecol,cost in [
    ("split","Split Personality",41,3,5,6,1.79124),
    ("flame","Forbidden Flame",171,2,3,6,2270),
    ("flesh","Forbidden Flesh",171,2,3,6,2330),
    ("sublime","Sublime Vision",22,1,5,9,None),
]:
    records=[]
    for i,r in enumerate(rows(name,6,end),6):
        label=r[0]+" + "+r[1] if id=="split" else r[0]
        records.append(item(label,r[pricecol],r[listcol],r[datecol],f"{name}!A{i}",group=r[1] if id in ("flame","flesh") else "",floor=num(r[2]) if id=="sublime" else num(r[pricecol])))
    add(id,name,"Browse variant prices and test the cost of identifying one.","chaos",cost,
        "Equal variant probabilities are a what-if assumption, not verified drop rates. " + ("Prices use the median of the ten cheapest quotes; floors are shown separately." if id=="sublime" else "Asking prices do not establish sale prices."),records)
records=[]
for i,r in enumerate(rows("Balance of Terror",15,167),15):
    records.append(item(r[0]+" + "+r[1],r[3],r[2],None,f"Balance of Terror!A{i}:H{i}",group="",probability=1/153))
add("terror","Balance of Terror","Compare curse-modifier pairs and see where missing prices prevent a full EV.","chaos",125,"Uniform pair scenario. Missing prices retain their probability, so incomplete coverage never becomes a complete EV.",records,True)
records=[]
for i,r in enumerate(rows("Mageblood DC",6,176),6):
    records.append(item(r[0]+" + "+r[1],r[2],r[4],r[8],f"Mageblood DC!A{i}:I{i}",group="",probability=r[6]))
add("mageblood","Mageblood double implicits","Compare 171 double-implicit pairs and their weighted resale values.","divine",None,"Conditional on hitting double implicits. This excludes brick, white-socket and other corruption outcomes, so it is not the EV of an entire double-corruption attempt. Set a cost to compare acquisition against this conditional basket.",records,True)
records=[]
for i,r in enumerate(rows("Voices EV",6,9),6):
    label=str(r[0].day if isinstance(r[0],datetime) else r[0])+" small passives"
    records.append(item(label,r[3],r[7],r[8],f"Voices EV!A{i}:I{i}",group="",probability=r[2]))
add("voices","Voices","Four passive-count outcomes with the archived published drop weights.","divine",w['Voices EV']['B12'].value,"Uses the workbook's 670 / 300 / 25 / 5 weights. Prices and buy-in are historical asking-price inputs.",records,True)
for d in datasets:
    assert all(isinstance(r['label'],str) and r['label'] for r in d['rows']),d['id']
    assert abs(sum(r['probability'] for r in d['rows'])-1)<1e-8,d['id']
    assert all(r['price'] is None or r['price']>=0 for r in d['rows'])
(root/'datasets.json').write_text(json.dumps(dict(source="Sheetato-recalculated.xlsx",sha256=hashlib.sha256(a.workbook.read_bytes()).hexdigest(),archiveDate="2026-08-15",datasets=datasets),ensure_ascii=False,separators=(',',':')),encoding='utf-8')
print([(d['id'],len(d['rows']),sum(r['price'] is not None for r in d['rows'])) for d in datasets])
