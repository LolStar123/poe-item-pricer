import { calculate, selectRows, tripleRows } from "./datasets.mjs";
import { compactMod } from "./mod-labels.mjs";
const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? "").replace(/[&<>"']/g,c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
const fmt = (value, digits = 2) => value === null || value === undefined ? "unknown" : value === Infinity ? "\u221e" : Number(value).toLocaleString("en-GB",{maximumFractionDigits:digits});
const PAGE_SIZE = 6;
// The archived level-86 boss input is documented in PROVENANCE.md.
const THREE_MOD_BUY_IN = 426.5;
let archive, current, rows = [], filtered = [], tripleCache, mode = "pairs", page = 0;
let refreshing = false, refreshId = 0, inspected = -1, result;
const states = new Map();
const stateKey = () => current.id + ":" + (current.id === "watchers" ? mode : "observed");
const defaultCost = () => current.id === "watchers" && mode === "triples" ? THREE_MOD_BUY_IN : current.cost;
function saveState() {
    if (!current) return;
    states.set(stateKey(),{cost:$("#buy-in").value, query:$("#search").value, group:$("#group").value, coverage:$("#coverage").value, sort:$("#sort").value, page});
}
function validateArchive(value) {
    if (!value || !Array.isArray(value.datasets) || !value.datasets.length || typeof value.archiveDate !== "string") throw Error("Archive format is invalid.");
    const ids = new Set();
    for (const dataset of value.datasets) {
        if (!dataset.id || ids.has(dataset.id) || typeof dataset.name !== "string" || !["chaos","divine"].includes(dataset.unit)) throw Error("Archive family metadata is invalid.");
        ids.add(dataset.id);
        if (dataset.cost !== null && (!Number.isFinite(dataset.cost) || dataset.cost < 0)) throw Error("Archive buy-in is invalid.");
        calculate(dataset.rows,null); // Validate prices and probability mass with the unchanged model.
        if (dataset.rows.some(row => typeof row.label !== "string" || typeof row.source !== "string")) throw Error("Archive source rows are invalid.");
    }
    return value;
}
function renderFamilies() {
    $("#dataset-select").innerHTML = archive.datasets.map(d => `<option value="${esc(d.id)}">${esc(d.name)}</option>`).join("");
    $("#dataset-select").value = current.id;
    $("#families").innerHTML = archive.datasets.map(d => `<button data-family="${esc(d.id)}" aria-pressed="${d.id === current.id}"><strong>${esc(d.name)}</strong></button>`).join("");
}
function renderMetrics() {
    const raw = $("#buy-in").value;
    let cost = raw === "" ? null : Number(raw);
    $("#cost-error").hidden = true;
    $("#buy-in").removeAttribute("aria-invalid");
    try { result = calculate(rows,cost); }
    catch (error) {
        result = calculate(rows,null);
        $("#cost-error").textContent = error.message;
        $("#cost-error").hidden = false;
        $("#buy-in").setAttribute("aria-invalid","true");
        cost = null;
    }
    const m = value => value === null || value === undefined ? "Unknown" : fmt(value);
    const money = value => value === null ? "Unknown" : `${fmt(value)} ${current.unit}`;
    const cells = [
        ["Expected resale",money(result.mean)],
        ["Expected profit",money(result.profit)],
        ["Profitable outcomes",result.win === null ? "Unknown" : fmt(result.win*100,1)+"%"],
        ["One-roll volatility",money(result.stdev)],
        ["Profit / volatility",m(result.ratio)],
        ["Profit factor",m(result.profitFactor)],
    ];
    const metric = ([label,value]) => `<span><small>${label}</small><strong>${value}</strong></span>`;
    const riskOpen = $(".risk-measures")?.open || false;
    $("#sheet-kpis").innerHTML = `<div class="primary-metrics">${cells.slice(0,2).map(metric).join("")}</div><details class="risk-measures" ${riskOpen ? "open" : ""}><summary>Risk measures</summary><div class="risk-grid">${cells.slice(2).map(metric).join("")}</div><a href="https://github.com/LolStar123/poe-item-pricer/blob/main/README.md#archive-contents">Definitions &#8599;</a></details>`;
    $("#coverage-value").textContent = fmt(result.coverage*100,2)+"%";
    $("#coverage-fill").style.width = Math.min(100,result.coverage*100)+"%";
    const missing = rows.filter(r => r.price === null).length;
    $("#coverage-note").textContent = missing ? `${missing.toLocaleString()} unpriced outcomes. Full EV remains unknown.` : cost === null ? "Enter a buy-in to calculate profit." : "";
    saveState();
    window.__datasets = {...window.__datasets, result, cost};
}
function renderRows() {
    const pages = Math.max(1,Math.ceil(filtered.length/PAGE_SIZE));
    page = Math.min(page,pages-1);
    const shown = filtered.slice(page*PAGE_SIZE,(page+1)*PAGE_SIZE);
    $("#rows").innerHTML = shown.map((row,index) => {
        const price = row.price === null ? "Unknown" : `${fmt(row.price)} ${current.unit}`;
        return `<tr><td>${(row.mods || [row.label]).map(mod => `<span class="mod" title="${esc(mod)}">${esc(row.modelled ? mod : compactMod(mod))}</span>`).join("")}<div class="row-meta"><button class="source-toggle" data-source="${index}" aria-expanded="${inspected === index}" aria-controls="evidence-${index}">Source</button></div></td><td>${price}</td><td>${row.modelled ? "Not observed" : row.listings === null ? "Unknown" : fmt(row.listings)}</td></tr>${inspected === index ? `<tr id="evidence-${index}" class="source-evidence"><td colspan="3"><dl>${row.mods ? `<dt>Modifiers</dt><dd>${row.mods.map(mod => `<span class="mod">${esc(mod)}</span>`).join("")}</dd>` : ""}<dt>Source cell${row.modelled ? "s" : ""}</dt><dd>${esc(row.source)}</dd><dt>Measured</dt><dd>${esc(row.measured || (row.modelled ? "Derived from archived pair quotes" : "Not recorded"))}</dd><dt>Outcome weight</dt><dd>${fmt(row.probability*100,5)}%</dd><dt>Observed floor</dt><dd>${row.floor === undefined ? "Not separately supplied" : fmt(row.floor)+" "+current.unit}</dd><dt>Price definition</dt><dd>${row.modelled ? "Maximum of the three contained pair quotes" : current.id === "sublime" ? "Median of the ten cheapest quotes" : "Archived asking-price observation"}</dd></dl></td></tr>` : ""}`;
    }).join("");
    $("#empty").hidden = filtered.length > 0;
    $("#row-count").textContent = `${current.unit}`;
    $("#page-info").textContent = filtered.length ? `${page*PAGE_SIZE+1}\u2013${Math.min((page+1)*PAGE_SIZE,filtered.length)} of ${filtered.length.toLocaleString()}` : "0 matches";
    $("#previous").disabled = page === 0;
    $("#next").disabled = page >= pages-1;
    $("#export").disabled = filtered.length === 0;
    saveState();
    window.__datasets = {...window.__datasets, ready:true,id:current.id,count:rows.length,filtered:filtered.length,visibleRows:shown.length,page,pages,firstVisible:shown[0]?.label || null,coverage:$("#coverage").value,sort:$("#sort").value,group:$("#group").value,mode,refreshing,refreshId};
}
function filter(resetPage = true) {
    if (!current) return;
    if (resetPage) page = 0;
    inspected = -1;
    filtered = selectRows(rows,{query:$("#search").value,group:$("#group").value,coverage:$("#coverage").value,sort:$("#sort").value});
    renderRows();
}
function loadDataset(id, {preserve = false} = {}) {
    if (!preserve) saveState();
    current = archive.datasets.find(d => d.id === id) || archive.datasets[0];
    rows = current.id === "watchers" && mode === "triples" ? (tripleCache ||= tripleRows(current.rows)) : current.rows;
    renderFamilies();
    const state = states.get(stateKey());
    const groups = [...new Set(rows.flatMap(row => row.mods ? row.mods.map(m => m.split(" - ")[0]) : [row.group]).filter(Boolean))].sort();
    $("#group").innerHTML = '<option value="">All groups</option>'+groups.map(g => `<option>${esc(g)}</option>`).join("");
    $("#group").disabled = !groups.length;
    $("#group").value = groups.includes(state?.group) ? state.group : "";
    $("#buy-in").value = state?.cost ?? defaultCost() ?? "";
    $("#search").value = state?.query || "";
    $("#coverage").value = state?.coverage || "priced";
    $("#sort").value = state?.sort || "high";
    page = state?.page || 0;
    $("#sheet-title").textContent = current.name;
    $("#cost-unit").textContent = current.unit;
    $("#watcher-controls").hidden = current.id !== "watchers";
    for (const button of document.querySelectorAll('[data-mode]')) button.setAttribute("aria-pressed",button.dataset.mode === mode);
    $("#assumption").textContent = current.id === "mageblood" ? "Conditional on double implicits." : current.id === "voices" ? "Archived weights: 670 / 300 / 25 / 5." : "Equal weights are a scenario assumption.";
    if (current.id === "watchers" && mode === "triples") $("#assumption").textContent += " Price = maximum contained pair quote.";

    for (const id of ["dataset-select","buy-in","restore","search","coverage","sort"]) $("#"+id).disabled = false;
    history.replaceState(null,"","?dataset="+current.id+(current.id === "watchers" && mode === "triples" ? "&mode=triples" : ""));
    renderMetrics(); filter(false);
}
async function reloadArchive() {
    if (refreshing) return;
    refreshing = true; refreshId += 1;
    $("#refresh").disabled = true;
    $("#refresh").textContent = "Loading archive...";
    $("#status").textContent = "Loading archive...";
    window.__datasets = {...window.__datasets,refreshing,refreshId};
    try {
        const response = await fetch("data/datasets.json",{cache:"no-store",signal:AbortSignal.timeout(20000)});
        if (!response.ok) throw Error(`Archive returned HTTP ${response.status}.`);
        const next = validateArchive(await response.json());
        saveState();
        const selected = current?.id || new URLSearchParams(location.search).get("dataset") || "watchers";
        archive = next; tripleCache = null;
        $("#archive-date").textContent = "\u00b7 " + new Date(archive.archiveDate+"T00:00:00Z").toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric",timeZone:"UTC"});
        loadDataset(selected,{preserve:true});
        $("#status").textContent = "";
        $("#error").textContent = "";
    } catch (error) {
        $("#status").textContent = archive ? `Reload failed. Loaded observations kept. ${error.message} Retry with Reload archive.` : `Archive could not load. ${error.message} Retry with Reload archive.`;
        if (!archive) $("#error").textContent = "The ledger needs the bundled datasets.json. Keep the local server running and reload the archive.";
    } finally {
        refreshing = false;
        $("#refresh").disabled = false;
        $("#refresh").textContent = "Reload archive";
        window.__datasets = {...window.__datasets,refreshing,refreshId};
    }
}
$("#dataset-select").onchange = () => loadDataset($("#dataset-select").value);
$("#families").onclick = e => {const b=e.target.closest('[data-family]');if(b) loadDataset(b.dataset.family);};
$("#watcher-controls").onclick = e => {
    const b=e.target.closest('[data-mode]');
    if (!b || mode === b.dataset.mode) return;
    saveState(); mode=b.dataset.mode; loadDataset("watchers",{preserve:true});
};
for (const id of ["search","group","coverage","sort"]) $("#"+id).addEventListener(id === "search" ? "input" : "change",() => filter());
$("#buy-in").oninput = renderMetrics;
$("#restore").onclick = () => {$("#buy-in").value=defaultCost() ?? "";renderMetrics();};
$("#rows").onclick = e => {const b=e.target.closest('[data-source]');if(b){const index=+b.dataset.source;inspected=inspected === index ? -1 : index;renderRows();$('[data-source="'+index+'"]')?.focus();}};
$("#previous").onclick = () => {if(page>0){page-=1;inspected=-1;renderRows();}};
$("#next").onclick = () => {if((page+1)*PAGE_SIZE<filtered.length){page+=1;inspected=-1;renderRows();}};
$("#refresh").onclick = reloadArchive;
$("#export").onclick = () => {
    const quote = value => `"${String(value ?? "").replaceAll('"','""')}"`;
    const keys = ["variant","price","unit","probability","listings","measured","source","status","floor"];
    const text = [keys,...filtered.map(row => [row.label,row.price,current.unit,row.probability,row.listings,row.measured,row.source,row.modelled ? "modelled" : "observed",row.floor])].map(line => line.map(quote).join(",")).join("\n");
    const a=document.createElement("a"),url=URL.createObjectURL(new Blob([text],{type:"text/csv"}));
    a.href=url;a.download=current.id+(current.id === "watchers" ? "-"+mode : "")+"-prices.csv";a.click();setTimeout(() => URL.revokeObjectURL(url),1000);
};
mode = new URLSearchParams(location.search).get("mode") === "triples" ? "triples" : "pairs";
reloadArchive();
