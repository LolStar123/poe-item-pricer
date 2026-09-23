import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { risk, histogram, pairs } from "./model.mjs";
const data = JSON.parse(
    readFileSync(new URL("./data/archive.json", import.meta.url)),
);
test("actual archived Adorned values reproduce original cached profit", () => {
    const c = data.cases[0],
        r = risk(c.outcomes, c.cost),
        cell = data.books[0].sheets[0].cells.find((c) => c.address === "I5");
    assert.ok(Math.abs(r.profit - cell.value) < 1e-9);
    assert.equal(c.outcomes.length, 101);
});
test("Light of Meaning revenue matches original worksheet", () => {
    const c = data.cases[1],
        r = risk(c.outcomes, c.cost),
        cell = data.books[1].sheets[0].cells.find((c) => c.address === "E16");
    assert.ok(Math.abs(r.mean - cell.value) < 1e-9);
});
test("missing price does not become zero or renormalise coverage", () => {
    const rows = [
            { probability: 0.8, price: 10 },
            { probability: 0.2, price: null },
        ],
        r = risk(rows, 5);
    assert.equal(r.coverage, 0.8);
    assert.equal(r.profit, null);
    assert.equal(r.knownRevenue, 8);
    assert.ok(
        Math.abs(histogram(rows, 5).reduce((n, b) => n + b.p, 0) - 0.8) < 1e-9,
    );
});
test("risk metrics for known outcomes and input validation", () => {
    const r = risk(
        [
            { probability: 0.5, price: 0 },
            { probability: 0.5, price: 20 },
        ],
        5,
    );
    assert.equal(r.profit, 5);
    assert.equal(r.stdev, 10);
    assert.equal(r.profitFactor, 3);
    assert.equal(r.win, 0.5);
    assert.throws(() => risk([{ probability: 0.9, price: 0 }], 5));
    assert.throws(() => risk([{ probability: 1, price: -2 }], 5));
});
test("87 source modifiers yield unique pairs and genuine search results", () => {
    assert.equal(data.modifiers.length, 87);
    const all = pairs(data.modifiers);
    assert.equal(all.length, 3741);
    assert.equal(
        new Set(all.map((p) => p.a.mod_id + "|" + p.b.mod_id)).size,
        3741,
    );
    assert.ok(pairs(data.modifiers, "Anger").length > 0);
});

import { tripleRows, selectRows, calculate } from "./datasets.mjs";
const market = JSON.parse(
    readFileSync(new URL("./data/datasets.json", import.meta.url), "utf8"),
);
test("recovered priced pairs are unique, complete, and searchable by both auras", () => {
    const rows = market.datasets[0].rows;
    assert.equal(rows.length, 3741);
    assert.equal(
        new Set(rows.map((r) => [...r.mods].sort().join("|"))).size,
        3741,
    );
    assert.equal(rows.filter((r) => r.price !== null).length, 3741);
    const found = selectRows(rows, { query: "clarity precision" });
    assert(found.length > 0);
    assert(
        found.every(
            (r) =>
                r.label.toLowerCase().includes("clarity") &&
                r.label.toLowerCase().includes("precision"),
        ),
    );
});
test("triple pricing exhaustively enumerates and does not invent observed quotes", () => {
    const rows = tripleRows(market.datasets[0].rows);
    assert.equal(rows.length, 105995);
    assert(rows.every((r) => r.modelled && r.listings === null));
    assert(Math.abs(rows.reduce((s, r) => s + r.probability, 0) - 1) < 1e-8);
    const small = [
        { mods: ["a", "b"], price: 3, source: "a" },
        { mods: ["a", "c"], price: 7, source: "b" },
        { mods: ["b", "c"], price: 2, source: "c" },
    ];
    assert.equal(tripleRows(small)[0].price, 7);
    small[0].price = null;
    assert.equal(tripleRows(small)[0].price, null);
});
test("incomplete recovered data blocks full EV, changing cost propagates", () => {
    const terror = market.datasets.find((d) => d.id === "terror");
    const incomplete = calculate(terror.rows, terror.cost);
    assert.equal(incomplete.profit, null);
    assert(Math.abs(incomplete.coverage - 138 / 153) < 1e-10);
    const rows = market.datasets[0].rows;
    const a = calculate(rows, 159),
        b = calculate(rows, 259);
    assert(Math.abs(a.profit - b.profit - 100) < 1e-8);
    assert.equal(a.stdev, b.stdev);
    assert.equal(calculate(rows, null).profit, null);
    assert.equal(selectRows(terror.rows, { coverage: "missing" }).length, 15);
});
