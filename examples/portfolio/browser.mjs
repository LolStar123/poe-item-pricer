import { tripleRows, selectRows, calculate } from "./datasets.mjs";
import { histogram } from "./model.mjs";
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
    triples,
    selectedRow = null,
    saved = [];
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
    renderDistribution();
    renderSensitivity();
    window.__datasets = {
        ready: true,
        id: current.id,
        count: rows.length,
        result,
        cost,
        filtered: filtered.length,
        saved: saved.length,
    };
    renderTable();
}
function renderDistribution() {
    const svg = $("#distribution");
    if (cost === null || !result || result.coverage < 1 - 1e-8) {
        svg.innerHTML = '<text x="360" y="110" text-anchor="middle" fill="#a9b2be" font-size="14">complete prices and a buy-in are needed</text>';
        return;
    }
    const bins = histogram(rows, cost, 22), max = Math.max(...bins.map((bin) => bin.p), .0001), bar = 620 / bins.length;
    const zero = bins[0].low >= 0 ? 54 : bins.at(-1).high <= 0 ? 674 : 54 + (-bins[0].low / (bins.at(-1).high - bins[0].low)) * 620;
    svg.innerHTML = bins.map((bin, index) => {
        const height = bin.p / max * 142, x = 54 + index * bar, tone = bin.high <= 0 ? '#ba806f' : '#8db8a7';
        return `<rect x="${x.toFixed(2)}" y="${(174-height).toFixed(2)}" width="${Math.max(1,bar-2).toFixed(2)}" height="${height.toFixed(2)}" fill="${tone}"><title>${fmt(bin.low)} to ${fmt(bin.high)} ${current.unit}: ${(bin.p*100).toFixed(2)}%</title></rect>`;
    }).join('') + `<path d="M54 174H674M${zero.toFixed(2)} 22V180" fill="none" stroke="#596575" stroke-width="1"/><text x="54" y="202" fill="#a9b2be" font-size="12">${fmt(bins[0].low)}</text><text x="674" y="202" text-anchor="end" fill="#a9b2be" font-size="12">${fmt(bins.at(-1).high)} profit</text><text x="${Math.min(650,Math.max(78,zero+6)).toFixed(2)}" y="34" fill="#e3b978" font-size="11">break-even</text>`;
}
function renderSensitivity() {
    const body = $("#sensitivity");
    if (cost === null || !result) { body.innerHTML = '<tr><td colspan="3">enter a buy-in</td></tr>'; return; }
    body.innerHTML = [.8,.9,1,1.1,1.2].map(multiplier => {
        const trial = cost * multiplier, measured = calculate(rows, trial), profit = measured.profit;
        return `<tr><td>${money(trial)}</td><td class="${profit === null ? '' : profit >= 0 ? 'positive' : 'negative'}">${profit === null ? 'unknown' : money(profit)}</td><td>${measured.win === null ? 'unknown' : fmt(measured.win*100)+'%'}</td></tr>`;
    }).join('');
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
    $("#dataset-state").textContent = `${rows.length.toLocaleString()} outcomes · ${current.unit}`;
    const priced = rows.filter(row => row.price !== null).length;
    $("#coverage-badge").textContent = `${priced.toLocaleString()} priced`;
    $("#coverage-badge").classList.toggle('complete', priced === rows.length);
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
    selectedRow = null;
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
    selectedRow = r;
    $("#selected").innerHTML =
        `<strong>${esc(r.label)}</strong><p>${r.modelled ? "Modelled value" : "Asking price"}: ${money(r.price)}${r.floor !== undefined ? ` / floor: ${money(r.floor)}` : ""}<br>Outcome probability under this model: ${(r.probability * 100).toLocaleString("en-GB", {maximumFractionDigits: 6})}%<br>Measured: ${r.measured ? esc(r.measured.replace("T", " ").replace("Z", " UTC")) : r.modelled ? "derived from archived pair quotes" : "date not recorded on this row"}<br>Source: ${esc(r.source)}</p>`;
    $("#selection").open = true;
    $("#save-selection").textContent = saved.some(item => item.key === rowKey(r)) ? 'saved' : 'save variant';
    $("#selection").scrollIntoView({ block: "nearest" });
};
const rowKey = row => `${current.id}|${row.label}`;
function renderShortlist() {
    $("#saved-count").textContent = saved.length;
    $("#shortlist-empty").hidden = saved.length > 0;
    $("#shortlist").innerHTML = saved.map((item,index) => `<tr><td>${esc(item.label)}<small>${esc(item.dataset)}</small></td><td>${item.price === null ? 'unknown' : fmt(item.price)+' '+item.unit}</td><td>${cost === null || item.price === null || item.datasetId !== current.id ? '—' : money(item.price-cost)}</td><td><button data-remove="${index}" aria-label="Remove ${esc(item.label)}">remove</button></td></tr>`).join('');
    if(window.__datasets) window.__datasets.saved=saved.length;
}
$("#save-selection").onclick = () => {
    if(!selectedRow) return;
    const key=rowKey(selectedRow),index=saved.findIndex(item=>item.key===key);
    if(index>=0) saved.splice(index,1); else saved.push({key,label:selectedRow.label,price:selectedRow.price,unit:current.unit,dataset:current.name,datasetId:current.id});
    $("#save-selection").textContent=index>=0?'save variant':'saved';
    renderShortlist();
};
$("#view-shortlist").onclick=()=>{const panel=$("#shortlist-panel");panel.hidden=!panel.hidden;if(!panel.hidden)panel.scrollIntoView({block:'nearest'});};
$("#clear-shortlist").onclick=()=>{saved=[];renderShortlist();};
$("#shortlist").onclick=e=>{const button=e.target.closest('[data-remove]');if(!button)return;saved.splice(Number(button.dataset.remove),1);renderShortlist();};
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
    renderShortlist();
} catch (e) {
    $("#error").textContent = e.message;
    $("#datasets").textContent = "Dataset loading failed.";
}
