import { risk } from "./model.mjs";
export function tripleRows(pairs) {
    const mods = [...new Set(pairs.flatMap((r) => r.mods))].sort();
    const keys = new Map(pairs.map((r) => [[...r.mods].sort().join("|"), r]));
    const total = (mods.length * (mods.length - 1) * (mods.length - 2)) / 6,
        out = [];
    for (let i = 0; i < mods.length; i++)
        for (let j = i + 1; j < mods.length; j++)
            for (let k = j + 1; k < mods.length; k++) {
                const trio = [mods[i], mods[j], mods[k]];
                const sources = [
                    [i, j],
                    [i, k],
                    [j, k],
                ].map(([a, b]) => keys.get([mods[a], mods[b]].join("|")));
                const complete = sources.every((r) => r && r.price !== null);
                out.push({
                    label: trio.join(" + "),
                    mods: trio,
                    group: trio[0].split(" - ")[0],
                    price: complete
                        ? Math.max(...sources.map((r) => r.price))
                        : null,
                    probability: 1 / total,
                    listings: null,
                    measured: null,
                    source: sources
                        .map((r) => r?.source || "missing pair")
                        .join("; "),
                    modelled: true,
                });
            }
    return out;
}
export function selectRows(
    rows,
    { query = "", group = "", coverage = "all", sort = "high" } = {},
) {
    const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
    return rows
        .filter(
            (r) =>
                terms.every((t) => r.label.toLowerCase().includes(t)) &&
                (!group ||
                    (r.mods
                        ? r.mods.some((m) => m.split(" - ")[0] === group)
                        : r.group === group)) &&
                (coverage === "all" ||
                    (coverage === "priced"
                        ? r.price !== null
                        : r.price === null)),
        )
        .sort((a, b) =>
            sort === "name"
                ? a.label.localeCompare(b.label)
                : sort === "listings"
                  ? (b.listings ?? -1) - (a.listings ?? -1)
                  : a.price === null
                    ? b.price === null
                        ? 0
                        : 1
                    : b.price === null
                      ? -1
                      : sort === "low"
                        ? a.price - b.price
                        : b.price - a.price,
        );
}
export function calculate(rows, cost) {
    const r = risk(rows, cost === null ? 0 : cost);
    if (cost === null)
        return {
            ...r,
            profit: null,
            win: null,
            profitFactor: null,
            ratio: null,
        };
    return r;
}
