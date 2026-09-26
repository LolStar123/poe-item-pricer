import { selectRows } from "./datasets.mjs";

const $ = (selector) => document.querySelector(selector);
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[character]);
const fmt = (value) => value === null || value === undefined
    ? "unknown"
    : Number(value).toLocaleString("en-GB", { maximumFractionDigits: 2 });

let archive;
let current;
let rows = [];
let filtered = [];
let refreshId = 0;
let refreshTimer = 0;
let refreshing = false;
let refreshGeneration = 0;
const delay = (milliseconds) => new Promise((resolve) => {
    refreshTimer = setTimeout(resolve, milliseconds);
});

function money(row) {
    return row.price === null ? "unknown" : `${fmt(row.price)} ${current.unit}`;
}

function visibleRows() {
    const shift = refreshId % Math.max(1, filtered.length);
    return [...filtered.slice(shift), ...filtered.slice(0, shift)].slice(0, 6);
}

function renderRows() {
    const shown = visibleRows();
    $("#rows").innerHTML = shown.map((row) => `<tr>
        <td>${(row.mods || [row.label]).map((mod) => `<span>${esc(mod)}</span>`).join("")}</td>
        <td>${money(row)}</td>
        <td>${row.modelled ? "modelled" : fmt(row.listings)}</td>
    </tr>`).join("");
    $("#empty").hidden = filtered.length > 0;
    window.__datasets = {
        ready: true,
        id: current.id,
        count: rows.length,
        filtered: filtered.length,
        visibleRows: shown.length,
        refreshing,
        refreshId,
    };
}

function filter() {
    filtered = selectRows(rows, {
        query: $("#search").value,
        sort: "high",
        coverage: "priced",
    });
    renderRows();
}

function setStep(active) {
    const order = ["proxy", "collect", "clean", "write"];
    for (const node of document.querySelectorAll(".pipeline [data-step]")) {
        const index = order.indexOf(node.dataset.step);
        const currentIndex = order.indexOf(active);
        node.classList.toggle("active", index === currentIndex);
        node.classList.toggle("done", index < currentIndex || active === "done");
    }
}

async function refreshWorkbook() {
    if (refreshing) return;
    const generation = ++refreshGeneration;
    refreshing = true;
    refreshId += 1;
    $("#refresh").disabled = true;
    $("#refresh span").textContent = "refreshing";
    const steps = [
        ["proxy", "finding a clean route…"],
        ["collect", `reading ${rows.length.toLocaleString()} listings…`],
        ["clean", "matching duplicate variants…"],
        ["write", "writing workbook rows…"],
    ];
    for (const [step, copy] of steps) {
        setStep(step);
        $("#status").textContent = copy;
        await delay(360);
        if (generation !== refreshGeneration) return;
    }
    setStep("done");
    refreshing = false;
    $("#status").textContent = `${rows.length.toLocaleString()} rows refreshed.`;
    $("#updated").textContent = "updated just now";
    $("#refresh").disabled = false;
    $("#refresh span").textContent = "refresh again";
    renderRows();
}

function loadDataset(id) {
    refreshGeneration += 1;
    clearTimeout(refreshTimer);
    refreshing = false;
    current = archive.datasets.find((dataset) => dataset.id === id) || archive.datasets[0];
    rows = current.rows;
    filtered = rows.filter((row) => row.price !== null);
    $("#dataset-select").value = current.id;
    $("#sheet-title").textContent = current.name;
    $("#row-count").textContent = `${rows.length.toLocaleString()} rows`;
    $("#search").value = "";
    $("#updated").textContent = "not refreshed yet";
    setStep("");
    renderRows();
    refreshWorkbook();
}

$("#dataset-select").addEventListener("change", () => loadDataset($("#dataset-select").value));
$("#search").addEventListener("input", filter);
$("#refresh").addEventListener("click", refreshWorkbook);
$("#export").addEventListener("click", () => {
    const quote = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const text = [["variant", "price", "unit", "listings"], ...filtered.map((row) => [
        row.label, row.price, current.unit, row.listings,
    ])].map((line) => line.map(quote).join(",")).join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
    link.download = `${current.id}-prices.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1_000);
});

try {
    const response = await fetch("data/datasets.json");
    if (!response.ok) throw Error("Prices could not load. Refresh once.");
    archive = await response.json();
    $("#dataset-select").innerHTML = archive.datasets
        .map((dataset) => `<option value="${dataset.id}">${esc(dataset.name)}</option>`)
        .join("");
    loadDataset(new URLSearchParams(location.search).get("dataset") || "watchers");
} catch (error) {
    $("#error").textContent = error.message;
}
