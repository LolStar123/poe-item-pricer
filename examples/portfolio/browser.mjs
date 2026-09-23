import { tripleRows, selectRows, calculate } from "./datasets.mjs";
const $ = (s) => document.querySelector(s),
    esc = (s) =>
        String(s ?? "").replace(
            /[&<>"']/g,
            (c) =>
                ({
                    "&": "&amp;",
                    "<": "&lt;",
                    ">": "&gt;",
                    '"': "&quot;",
                    "'": "&#39;",
                })[c],
        );
const fmt = (x) =>
    x === null || x === undefined
        ? "unknown"
        : x === Infinity
          ? "no losses"
          : Number(x).toLocaleString("en-GB", { maximumFractionDigits: 2 });
let data,
    current,
    rows = [],
    filtered = [],
    page = 0,
    result,
    cost = null,
    triples;
const size = 25,
    params = new URLSearchParams(location.search);
function money(x) {
    return x === null ? "unknown" : fmt(x) + " " + current.unit;
}
function state() {
    const q = new URLSearchParams({ dataset: current.id });
    if (current.id === "watchers") q.set("mode", $("#mode").value);
    for (const id of ["search", "group", "sort", "coverage"])
        if ($("#" + id).value) q.set(id, $("#" + id).value);
    history.replaceState(null, "", "?" + q);
}
function showView(view) {
    const risk = view === "risk";
    $("#risk-panel").hidden = !risk;
    $("#browse-panel").hidden = risk;
    $("#risk-view").setAttribute("aria-pressed", risk);
    $("#browse-view").setAttribute("aria-pressed", !risk);
    $("#export").hidden = risk;
}
$("#browse-view").onclick = () => showView("browse");
$("#risk-view").onclick = () => showView("risk");
$(".compare-link").onclick = () => { $("#comparison").open = true; };
function measure() {
    cost = $("#buyin").value === "" ? null : Number($("#buyin").value);
    $("#table-cost").textContent = cost === null ? "your buy-in" : money(cost);
    try {
        result = calculate(rows, cost);
        $("#error").textContent = "";
    } catch (e) {
        $("#error").textContent = e.message;
        $("#metrics").textContent = "";
        $("#interpretation").textContent = "Correct the buy-in to calculate profit.";
        $("#extra-stats").textContent = "";
        result = null;
        cost = null;
        if (window.__datasets) window.__datasets.result = null;
        renderTable();
        return;
    }
    const stats = [
        ["average resale (EV)", money(result.mean)],
        [
            "average profit after buy-in",
            cost === null ? "enter buy-in" : money(result.profit),
        ],
        [
            "chance of profit",
            result.win === null ? "unknown" : fmt(result.win * 100) + "%",
        ],
        ["price coverage", fmt(result.coverage * 100) + "%"],
    ];
    $("#metrics").innerHTML = stats
        .map(
            ([name, value], i) =>
                `<div class="metric"><span>${name}</span><strong class="${i === 1 && result.profit !== null ? (result.profit >= 0 ? "positive" : "negative") : ""}">${value}</strong></div>`,
        )
        .join("");
    $("#interpretation").textContent =
        result.coverage < 1 - 1e-8
            ? `${rows.filter((r) => r.price === null).length.toLocaleString()} outcomes have no price. Full EV and risk stay unknown; known outcomes contribute ${money(result.knownRevenue)} to expected resale.`
            : cost === null
              ? "Enter your buy-in to see profit and the chance of making money."
              : `At ${money(cost)} per item, the model expects ${money(Math.abs(result.profit))} ${result.profit >= 0 ? "profit" : "loss"} on average. Individual outcomes can differ sharply.`;
    $("#extra-stats").innerHTML = [
        ["standard deviation", money(result.stdev)],
        ["profit factor", fmt(result.profitFactor)],
        ["return / risk", fmt(result.ratio)],
    ]
        .map(([a, b]) => `<span>${a}: <strong>${b}</strong></span>`)
        .join("");
    window.__datasets = {
        ready: true,
        id: current.id,
        count: rows.length,
        result,
        cost,
        filtered: filtered.length,
    };
    renderTable();
}
function renderTable() {
    page = Math.max(0, Math.min(page, Math.ceil(filtered.length / size) - 1));
    $("#count").textContent =
        `${filtered.length.toLocaleString()} matching / ${rows.length.toLocaleString()} outcomes`;
    $("#rows").innerHTML = filtered
        .slice(page * size, (page + 1) * size)
        .map(
            (r, i) =>
                `<tr><td><button data-row="${page * size + i}">${(r.mods || [r.label]).map((m) => `<span class="mod">${esc(m)}</span>`).join("")}</button>${r.modelled ? "<small>modelled from best pair</small>" : ""}</td><td>${money(r.price)}</td><td class="${cost !== null && r.price !== null && r.price - cost > 0 ? "positive" : ""}">${cost === null ? "set buy-in" : r.price === null ? "unknown" : money(r.price - cost)}</td><td>${r.modelled ? "not observed" : fmt(r.listings)}</td></tr>`,
        )
        .join("");
    $("#empty").hidden = filtered.length > 0;
    $("#page").textContent = filtered.length
        ? `${page + 1} / ${Math.ceil(filtered.length / size)}`
        : "0 / 0";
    $("#prev").disabled = page === 0;
    $("#next").disabled = (page + 1) * size >= filtered.length;
    if (window.__datasets) window.__datasets.filtered = filtered.length;
}
function filter() {
    filtered = selectRows(rows, {
        query: $("#search").value,
        group: $("#group").value,
        sort: $("#sort").value,
        coverage: $("#coverage").value,
    });
    page = 0;
    renderTable();
    state();
}
function load(id, initial = false) {
    current = data.datasets.find((d) => d.id === id) || data.datasets[0];
    const triple = current.id === "watchers" && $("#mode").value === "triple";
    rows = triple ? (triples ??= tripleRows(current.rows)) : current.rows;
    $("#dataset-select").value = current.id;
    $("#quick-filters").innerHTML = current.id === "watchers"
        ? '<span>try an aura</span>' + ["Clarity", "Precision", "Hatred", "Malevolence", "Determination"].map(a => `<button data-aura="${a}">${a}</button>`).join("") : "";
    $("#title").textContent = current.name;
    $("#description").textContent = current.description;
    $("#assumption").textContent = current.assumption;
    $("#model-label").textContent =
        current.id === "voices"
            ? "probability model: archived published weights"
            : current.id === "mageblood"
              ? "conditional EV: double-implicit outcome only"
              : "scenario EV: equal outcome probabilities assumed";
    $("#unit").textContent = current.unit;
    $("#buyin").value = triple ? 426.5 : (current.cost ?? "");
    $("#cost-note").textContent =
        current.cost === null
            ? "No verified buy-in in this export. Enter your own."
            : "Archived buy-in. Change it to test another price.";
    $("#mode-wrap").hidden = current.id !== "watchers";
    $("#price-heading").textContent = triple
        ? "modelled value / chaos"
        : `asking price / ${current.unit}`;
    const groups = [
        ...new Set(
            rows
                .flatMap((r) =>
                    r.mods ? r.mods.map((m) => m.split(" - ")[0]) : [r.group],
                )
                .filter(Boolean),
        ),
    ].sort();
    $("#group").innerHTML =
        '<option value="">all categories</option>' +
        groups.map((g) => `<option>${esc(g)}</option>`).join("");
    for (const id of ["search", "group", "sort", "coverage"])
        $("#" + id).value = initial
            ? params.get(id) || { sort: "high", coverage: "all" }[id] || ""
            : { sort: "high", coverage: "all" }[id] || "";
    for (const b of document.querySelectorAll("[data-dataset]"))
        b.setAttribute("aria-pressed", b.dataset.dataset === current.id);
    $("#selection").open = false;
    $("#selected").textContent =
        "Select a variant to inspect its price, probability and measurement date.";
    filter();
    measure();
}
$("#quick-filters").onclick = (e) => {
    const b = e.target.closest("[data-aura]");
    if (!b) return;
    $("#search").value = "";
    $("#group").value = b.dataset.aura;
    $("#coverage").value = "all";
    filter();
};
$("#datasets").onclick = (e) => {
    const b = e.target.closest("[data-dataset]");
    if (b) load(b.dataset.dataset);
};
$("#dataset-select").onchange = () => load($("#dataset-select").value);
$("#mode").onchange = () => load(current.id);
$("#buyin").oninput = measure;
$("#reset-cost").onclick = () => {
    $("#buyin").value =
        current.id === "watchers" && $("#mode").value === "triple"
            ? 426.5
            : (current.cost ?? "");
    measure();
};
for (const id of ["search", "group", "sort", "coverage"])
    $("#" + id).addEventListener(id === "search" ? "input" : "change", filter);
$("#clear").onclick = () => {
    for (const id of ["search", "group", "coverage"])
        $("#" + id).value = id === "coverage" ? "all" : "";
    filter();
};
$("#prev").onclick = () => {
    page--;
    renderTable();
};
$("#next").onclick = () => {
    page++;
    renderTable();
};
$("#rows").onclick = (e) => {
    const b = e.target.closest("[data-row]");
    if (!b) return;
    const r = filtered[Number(b.dataset.row)];
    $("#selected").innerHTML =
        `<strong>${esc(r.label)}</strong><p>${r.modelled ? "Modelled value" : "Asking price"}: ${money(r.price)}${r.floor !== undefined ? ` / floor: ${money(r.floor)}` : ""}<br>Outcome probability under this model: ${(r.probability * 100).toLocaleString("en-GB", {maximumFractionDigits: 6})}%<br>Measured: ${r.measured ? esc(r.measured.replace("T", " ").replace("Z", " UTC")) : r.modelled ? "derived from archived pair quotes" : "date not recorded on this row"}<br>Source: ${esc(r.source)}</p>`;
    $("#selection").open = true;
    $("#selection").scrollIntoView({ block: "nearest" });
};
$("#export").onclick = () => {
    const quote = (x) => '"' + String(x ?? "").replaceAll('"', '""') + '"';
    const text = [
        [
            "variant",
            "price",
            "unit",
            "probability",
            "listings",
            "measured",
            "source",
            "modelled",
        ],
        ...filtered.map((r) => [
            r.label,
            r.price,
            current.unit,
            r.probability,
            r.listings,
            r.measured,
            r.source,
            !!r.modelled,
        ]),
    ]
        .map((r) => r.map(quote).join(","))
        .join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
    a.download = current.id + "-filtered.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};
$("#compare").onclick = (e) => {
    const b = e.target.closest("[data-open]");
    if (b) {
        load(b.dataset.open);
        showView("risk");
        $("#title").scrollIntoView({ block: "start" });
    }
};
try {
    const response = await fetch("data/datasets.json");
    if (!response.ok)
        throw Error("Could not load datasets. Reload to try again.");
    data = await response.json();
    $("#dataset-select").innerHTML = data.datasets
        .map(
            (d) =>
                `<option value="${d.id}">${esc(d.name)} / ${d.rows.length.toLocaleString()} outcomes</option>`,
        )
        .join("");
    $("#datasets").innerHTML = data.datasets
        .map(
            (d) =>
                `<button data-dataset="${d.id}" aria-pressed="false"><span>${esc(d.name)}</span><small>${d.rows.length.toLocaleString()} variants / ${d.rows.filter(r => r.price !== null).length.toLocaleString()} priced</small></button>`,
        )
        .join("");
    $("#compare").innerHTML = data.datasets
        .map((d) => {
            const r = calculate(d.rows, d.cost);
            return `<tr><td><button data-open="${d.id}">${esc(d.name)}</button></td><td>${d.rows.length.toLocaleString()}</td><td>${fmt(r.coverage * 100)}%</td><td>${d.cost === null ? "buy-in needed" : fmt(r.profit)}</td><td>${d.unit}</td></tr>`;
        })
        .join("");
    $("#mode").value = params.get("mode") === "triple" ? "triple" : "pair";
    load(params.get("dataset") || "watchers", true);
} catch (e) {
    $("#error").textContent = e.message;
    $("#datasets").textContent = "Dataset loading failed.";
}
