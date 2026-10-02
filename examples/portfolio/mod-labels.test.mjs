import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { MOD_LABELS, compactMod } from "./mod-labels.mjs";

test("view aliases resolve exact observed modifiers to their archived stat IDs", () => {
    const catalogue = JSON.parse(readFileSync(new URL("data/archive.json", import.meta.url))).modifiers;
    const pairs = JSON.parse(readFileSync(new URL("data/datasets.json", import.meta.url))).datasets.find(d => d.id === "watchers").rows;
    const observed = new Set(pairs.flatMap(row => row.mods));
    for (const [id, canonical, label] of MOD_LABELS) {
        const stat = catalogue.find(mod => mod.mod_id === id);
        assert.ok(stat, id);
        assert.equal(canonical, `${stat.aura} - ${stat.display_text.replace(` while affected by ${stat.aura}`, "")}`);
        assert.ok(observed.has(canonical), canonical);
        assert.equal(compactMod(canonical), label);
    }
    const ambiguous = "Clarity - (15 to 20)% of Damage taken";
    assert.equal(compactMod(ambiguous), ambiguous);
    assert.equal(compactMod("unknown source text"), "unknown source text");
});
