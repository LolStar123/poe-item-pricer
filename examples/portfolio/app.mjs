import { risk, histogram, pairs, csv } from "./model.mjs";
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
    x === null
        ? "unknown"
        : x === Infinity
          ? "no losses"
          : Number(x).toLocaleString("en-GB", { maximumFractionDigits: 3 });
let data,
    current,
    outcomes = [],
    pairPage = 0,
    result;
const loadControls = ["case", "cost", "restore", "export", "book", "mod-search", "pair-prev", "pair-next"];
for (const id of loadControls) $("#"+id).disabled = true;
for (const tab of document.querySelectorAll("[data-tab]")) tab.disabled = true;
function update() {
    try {
        const cost = $("#cost").value === "" ? NaN : Number($("#cost").value);
        result = risk(outcomes, cost);
        $("#error").textContent = "";
        $("#metrics").innerHTML = [
            ["profit / roll", result.profit],
            ["one-roll SD", result.stdev],
            ["profit factor", result.profitFactor],
            ["price coverage", 100 * result.coverage],
        ]
            .map(
                ([label, value], i) =>
                    `<div class="metric"><span>${label}</span><strong>${fmt(value)}${i === 3 ? "%" : ""}</strong></div>`,
            )
            .join("");
        $("#risk-summary").textContent =
            result.profit === null
                ? `Prices cover ${(result.coverage * 100).toFixed(2)}% of probability. Known outcomes contribute ${fmt(result.knownRevenue)} revenue units; complete EV and risk remain unknown.`
                : `Mean revenue: ${fmt(result.mean)}. Chance of a positive profit: ${(result.win * 100).toFixed(2)}%. Return/risk ratio: ${fmt(result.ratio)}.`;
        const bins = histogram(outcomes, cost), chart = $("#chart"), width = Math.max(280,Math.round(chart.clientWidth || 600)), height = 260;
        const left = 46, right = width-14, top = 24, bottom = 216, max = Math.max(.01,...bins.map(b => b.p));
        const bw = (right-left)/Math.max(1,bins.length), y = p => bottom-p/max*(bottom-top);
        chart.setAttribute("viewBox",`0 0 ${width} ${height}`);
        chart.innerHTML = [0,.5,1].map(v => `<line x1="${left}" x2="${right}" y1="${y(max*v)}" y2="${y(max*v)}" stroke="#41453f"/><text x="${left-7}" y="${y(max*v)+4}" text-anchor="end" fill="#b6b9af" font-size="12">${(max*v*100).toFixed(0)}%</text>`).join("")+bins.map((b,i) => `<rect x="${left+i*bw+1}" y="${y(b.p)}" width="${Math.max(1,bw-2)}" height="${bottom-y(b.p)}" fill="${b.high <= 0 ? '#d9bb88' : '#a3c9b5'}"><title>${fmt(b.low)} to ${fmt(b.high)} profit: ${(b.p*100).toFixed(2)}% probability</title></rect>`).join("")+(bins.length ? `<text x="${left}" y="${height-15}" fill="#b6b9af" font-size="12">${fmt(bins[0].low)}</text><text x="${right}" y="${height-15}" text-anchor="end" fill="#b6b9af" font-size="12">${fmt(bins.at(-1).high)}</text><text x="${left}" y="14" fill="#b6b9af" font-size="12">Outcome probability</text>` : "");
        $("#export").disabled = false;
        for (const el of document.querySelectorAll("[data-profit]")) {
            const o = outcomes[Number(el.dataset.profit)];
            el.textContent = o.price === null ? "unknown" : fmt(o.price - cost);
        }
    } catch (e) {
        result = null;
        $("#export").disabled = true;
        $("#error").textContent = e.message;
        for (const output of document.querySelectorAll("[data-profit]")) output.textContent = "unknown";
        $("#metrics").innerHTML = "";
        $("#chart").innerHTML = "";
        $("#risk-summary").textContent =
            "Correct the input to calculate results.";
    }
    window.__poe = {
        ready: true,
        outcomes: outcomes.length,
        result,
        pairs: (data.modifiers.length * (data.modifiers.length - 1)) / 2,
        books: data.books.length,
    };
}
function renderOutcomes() {
    const q = $("#outcome-search").value.toLowerCase();
    $("#outcomes").innerHTML = outcomes
        .map((o, i) => ({ o, i }))
        .filter(({ o }) => o.label.toLowerCase().includes(q))
        .map(
            ({ o, i }) =>
                `<tr><td>${esc(o.label)}</td><td>${(o.probability * 100).toFixed(3)}%</td><td><input aria-label="Price for ${esc(o.label)}" data-price="${i}" type="number" min="0" step=".1" value="${o.price ?? ""}" placeholder="unknown"></td><td><output data-profit="${i}"></output></td><td>${o.source}</td></tr>`,
        )
        .join("");
    update();
}
function loadCase() {
    current = data.cases.find((c) => c.id === $("#case").value);
    outcomes = structuredClone(current.outcomes);
    $("#cost").value = current.cost;
    $("#case-note").textContent = `Historical · ${outcomes.length} equal-weight outcomes · source units`;
    $("#outcome-search").value = "";
    renderOutcomes();
}
$("#case").onchange = loadCase;
$("#restore").onclick = loadCase;
$("#cost").oninput = update;
$("#outcome-search").oninput = renderOutcomes;
$("#outcomes").oninput = (e) => {
    const i = e.target.dataset.price;
    if (i === undefined) return;
    outcomes[Number(i)].price =
        e.target.value === "" ? null : Number(e.target.value);
    update();
};
function loadBook() {
    const book = data.books.find((b) => b.id === $("#book").value),
        sheet = book.sheets[0],
        lookup = new Map(sheet.cells.map((c) => [c.address, c]));
    $("#download").href = book.file;
    $("#download").textContent =
        "Download XLSX";
    let html =
        "<thead><tr><th></th>" +
        Array.from(
            { length: sheet.columns },
            (_, i) => `<th>${String.fromCharCode(65 + i)}</th>`,
        ).join("") +
        "</tr></thead><tbody>";
    for (let row = 1; row <= sheet.rows; row++) {
        html += `<tr><th>${row}</th>`;
        for (let col = 1; col <= sheet.columns; col++) {
            const address = String.fromCharCode(64 + col) + row,
                c = lookup.get(address),
                value = c?.value;
            html += `<td><button data-cell="${address}" class="${c?.formula ? "has-formula" : ""}">${typeof value === "number" ? fmt(value) : esc(value ?? "")}</button></td>`;
        }
        html += "</tr>";
    }
    $("#workbook").innerHTML = html + "</tbody>";
    $("#cell-name").textContent = "select a cell";
    $("#formula").textContent = "";
    $("#book-note").textContent = "";
    $("#workbook").onclick = (e) => {
        const b = e.target.closest("[data-cell]");
        if (!b) return;
        for (const el of document.querySelectorAll("[data-cell]"))
            el.setAttribute("aria-pressed", el === b);
        const c = lookup.get(b.dataset.cell);
        $("#cell-name").textContent = b.dataset.cell;
        $("#formula").textContent =
            c?.formula || String(c?.value ?? "blank cell");
    };
}
$("#book").onchange = loadBook;
function renderPairs() {
    const rows = pairs(data.modifiers, $("#mod-search").value),
        size = 24;
    pairPage = Math.min(
        pairPage,
        Math.max(0, Math.ceil(rows.length / size) - 1),
    );
    $("#variant-count").textContent =
        `${rows.length.toLocaleString()} pairs · unpriced`;
    $("#pairs").innerHTML = rows
        .slice(pairPage * size, (pairPage + 1) * size)
        .map(
            (p, i) =>
                `<div class="pair"><small>${pairPage * size + i + 1}</small><p>${esc(p.a.display_text)}</p><p>${esc(p.b.display_text)}</p></div>`,
        )
        .join("");
    $("#pair-page").textContent =
        `${rows.length ? pairPage + 1 : 0} / ${Math.ceil(rows.length / size)}`;
    $("#pair-prev").disabled = pairPage === 0;
    $("#pair-next").disabled = (pairPage + 1) * size >= rows.length;
}
$("#mod-search").oninput = () => {
    pairPage = 0;
    renderPairs();
};
$("#pair-prev").onclick = () => {
    pairPage--;
    renderPairs();
};
$("#pair-next").onclick = () => {
    pairPage++;
    renderPairs();
};
for (const b of document.querySelectorAll("[data-tab]"))
    b.onclick = () => {
        for (const t of document.querySelectorAll("[data-tab]")) {
            t.setAttribute("aria-pressed", t === b);
            $("#" + t.dataset.tab).hidden = t !== b;
        }
    };
$("#export").onclick = () => {
    const url = URL.createObjectURL(
        new Blob([csv(outcomes, Number($("#cost").value))], {
            type: "text/csv",
        }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = current.id + "-outcomes.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
};
try {
    const r = await fetch("data/archive.json");
    if (!r.ok) throw Error("Research archive could not load");
    data = await r.json();
    $("#case").innerHTML = data.cases
        .map((c) => `<option value="${c.id}">${esc(c.title)}</option>`)
        .join("");
    $("#book").innerHTML = data.books
        .map((b) => `<option value="${b.id}">${esc(b.title)}</option>`)
        .join("");
    const n = data.modifiers.length;
    $("#variant-summary").textContent =
        `${n} modifiers · ${((n * (n - 1)) / 2).toLocaleString()} pairs · ${((n * (n - 1) * (n - 2)) / 6).toLocaleString()} nominal triples before eligibility · ${data.league}, ${data.catalogueDate.slice(0, 10)}`;
    for (const id of loadControls) $("#"+id).disabled = false;
    for (const tab of document.querySelectorAll("[data-tab]")) tab.disabled = false;
    loadCase();
    loadBook();
    renderPairs();
} catch (e) {
    $("#error").textContent = e.message;
    $("#export").disabled = true;
}

new ResizeObserver(() => { if (data && !$("#calculator").hidden) update(); }).observe($("#chart"));
