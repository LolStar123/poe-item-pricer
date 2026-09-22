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
