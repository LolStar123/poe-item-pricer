export const defaults = {
  cost: 110,
  priceScale: 1,
  missing: false,
  listings: [2, 98, 101, 105, 108, 110, 113, 116, 122, 125],
  outcomes: [
    { item: "ordinary roll", probability: 0.58, price: 45 },
    { item: "useful pairing", probability: 0.25, price: 140 },
    { item: "strong pairing", probability: 0.12, price: 310 },
    { item: "rare pairing", probability: 0.05, price: 920 },
  ],
};
export const controls = [
  {
    key: "cost",
    label: "Buy-in (chaos)",
    type: "number",
    min: 0,
    max: 2000,
    step: 5,
  },
  {
    key: "priceScale",
    label: "Resale-price multiplier",
    type: "number",
    min: 0.1,
    max: 4,
    step: 0.1,
  },
  { key: "missing", label: "Hide the rare outcome price", type: "checkbox" },
];
export function risk(outcomes, cost) {
  const p = outcomes.reduce((a, r) => a + r.probability, 0);
  if (
    Math.abs(p - 1) > 1e-8 ||
    outcomes.some((r) => r.probability < 0) ||
    cost < 0
  )
    throw Error("Probabilities must total 1 and costs must be nonnegative.");
  const priced = outcomes.filter(
    (r) => r.price !== null && Number.isFinite(r.price),
  );
  const coverage = priced.reduce((a, r) => a + r.probability, 0);
  if (coverage < 1 - 1e-8)
    return {
      coverage,
      ev: null,
      stdev: null,
      profitFactor: null,
      returnRisk: null,
    };
  const ev = priced.reduce((a, r) => a + r.probability * (r.price - cost), 0);
  const variance = priced.reduce(
      (a, r) => a + r.probability * (r.price - cost - ev) ** 2,
      0,
    ),
    stdev = Math.sqrt(variance);
  const gains = priced.reduce(
      (a, r) => a + r.probability * Math.max(0, r.price - cost),
      0,
    ),
    losses = priced.reduce(
      (a, r) => a + r.probability * Math.max(0, cost - r.price),
      0,
    );
  return {
    coverage,
    ev,
    stdev,
    profitFactor: losses ? gains / losses : null,
    returnRisk: stdev ? ev / stdev : null,
  };
}
export function medianBuyin(listings) {
  const s = listings
    .filter(Number.isFinite)
    .filter((x) => x > 0)
    .sort((a, b) => a - b)
    .slice(0, 10);
  if (!s.length) return null;
  const n = s.length;
  return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
}
export function run(i) {
  const outcomes = i.outcomes.map((r, n) => ({
      ...r,
      price:
        i.missing && n === i.outcomes.length - 1
          ? null
          : r.price === null
            ? null
            : r.price * i.priceScale,
    })),
    r = risk(outcomes, i.cost),
    fmt = (x) => (x === null ? "not available" : x.toFixed(2));
  return {
    summary:
      r.ev === null
        ? "A missing price stops the EV claim"
        : "Expected value is only part of the decision",
    metrics: {
      "net EV (chaos)": fmt(r.ev),
      "stdev (chaos)": fmt(r.stdev),
      "profit factor": fmt(r.profitFactor),
      "priced probability": (r.coverage * 100).toFixed(1) + "%",
      "median of cheapest 10": fmt(medianBuyin(i.listings)),
    },
    columns: ["variant", "probability", "resale (chaos)", "net (chaos)"],
    rows: outcomes.map((r) => [
      r.item,
      (r.probability * 100).toFixed(1) + "%",
      r.price ?? "missing",
      r.price === null ? "missing" : (r.price - i.cost).toFixed(2),
    ]),
    steps: [
      "Collect and log trade quotes",
      "Use a robust buy-in rather than one suspicious floor listing",
      "Join variant probabilities to prices",
      "Calculate EV and downside without hiding missing coverage",
    ],
    artifact: { ...r, outcomes },
  };
}
