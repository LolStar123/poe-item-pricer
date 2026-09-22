export function risk(outcomes, cost) {
    if (!Number.isFinite(cost) || cost < 0)
        throw Error("Enter a non-negative buy-in.");
    if (!Array.isArray(outcomes) || !outcomes.length)
        throw Error("Add outcomes first.");
    for (const r of outcomes)
        if (
            !Number.isFinite(r.probability) ||
            r.probability < 0 ||
            (r.price !== null && (!Number.isFinite(r.price) || r.price < 0))
        )
            throw Error(
                "Use valid probabilities and non-negative prices; leave unknown prices blank.",
            );
    const mass = outcomes.reduce((n, r) => n + r.probability, 0);
    if (Math.abs(mass - 1) > 1e-8)
        throw Error("Outcome probabilities must sum to one.");
    const priced = outcomes.filter((r) => r.price !== null),
        coverage = priced.reduce((n, r) => n + r.probability, 0),
        knownRevenue = priced.reduce((n, r) => n + r.probability * r.price, 0);
    if (coverage < 1 - 1e-8)
        return {
            coverage,
            knownRevenue,
            mean: null,
            profit: null,
            stdev: null,
            win: null,
            profitFactor: null,
            ratio: null,
        };
    const mean = knownRevenue,
        profit = mean - cost,
        variance = priced.reduce(
            (n, r) => n + r.probability * (r.price - mean) ** 2,
            0,
        ),
        stdev = Math.sqrt(variance);
    const gains = priced.reduce(
            (n, r) => n + r.probability * Math.max(0, r.price - cost),
            0,
        ),
        losses = priced.reduce(
            (n, r) => n + r.probability * Math.max(0, cost - r.price),
            0,
        );
    return {
        coverage,
        knownRevenue,
        mean,
        profit,
        stdev,
        win: priced.reduce(
            (n, r) => n + (r.price > cost ? r.probability : 0),
            0,
        ),
        profitFactor: losses ? gains / losses : gains ? Infinity : null,
        ratio: stdev ? profit / stdev : null,
    };
}
export function histogram(outcomes, cost, count = 16) {
    const priced = outcomes.filter((o) => o.price !== null);
    if (!priced.length) return [];
    const low = Math.min(...priced.map((o) => o.price - cost)),
        high = Math.max(...priced.map((o) => o.price - cost)),
        width = (high - low || 1) / count;
    const bins = Array.from({ length: count }, (_, i) => ({
        low: low + i * width,
        high: low + (i + 1) * width,
        p: 0,
    }));
    for (const o of priced)
        bins[
            Math.min(count - 1, Math.floor((o.price - cost - low) / width))
        ].p += o.probability;
    return bins;
}
export function pairs(modifiers, query = "") {
    const q = query.toLowerCase(),
        rows = [];
    for (let i = 0; i < modifiers.length; i++)
        for (let j = i + 1; j < modifiers.length; j++) {
            const a = modifiers[i],
                b = modifiers[j];
            if (
                q &&
                !(a.display_text + " " + b.display_text)
                    .toLowerCase()
                    .includes(q)
            )
                continue;
            rows.push({ a, b });
        }
    return rows;
}
export function csv(outcomes, cost) {
    return (
        "outcome,probability,price,profit_if_priced\n" +
        outcomes
            .map((o) =>
                [
                    o.label,
                    o.probability,
                    o.price ?? "",
                    o.price === null ? "" : o.price - cost,
                ]
                    .map((v) => '"' + String(v).replaceAll('"', '""') + '"')
                    .join(","),
            )
            .join("\n")
    );
}
