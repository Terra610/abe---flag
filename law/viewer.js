// law/viewer.js
// ABE Law Viewer (Local-only) — v2.0.0 (CACHE BUSTER CHECK)
// If you don't see v2.0.0 in the status line, you're not running this file.

const $ = (id) => document.getElementById(id);

const PACKS = [
  { id: "t49_transport", label: "Title 49 — Transportation (Core FMCSA Scope)", file: "law/title_49_transport.json", tag: "USC" },
  { id: "t49_mcsap_fmcsa", label: "Title 49 — MCSAP & FMCSA Program Funding", file: "law/title_49_mcsap_fmcsa.json", tag: "Funding" },
  { id: "fmcsr_scope", label: "FMCSR Scope Map (49 CFR 390.3 / 390.5)", file: "law/fmcsr_scope.json", tag: "CFR" },
  { id: "mcsap_rules", label: "MCSAP Program Rules (49 CFR Part 350)", file: "law/mcsap_rules.json", tag: "CFR" }
];

let STATE = {
  packs: PACKS,
  selectedPack: null,
  entries: [],
  filtered: [],
  selectedEntry: null,
  filter: ""
};

function pick(obj, keys) {
  for (const k of keys) {
    const v = k.split(".").reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined), obj);
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }
  return null;
}

function asArray(v) {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

function normalizeTags(entry) {
  const tags = []
    .concat(asArray(pick(entry, ["tags", "tag", "category", "type"])))
    .concat(asArray(pick(entry, ["meta.tags", "meta.tag", "meta.category", "meta.type"])))
    .filter(Boolean)
    .map(String);
  return Array.from(new Set(tags));
}

function normalizeCitation(entry) {
  const c = pick(entry, [
    "citation", "cite", "cites", "usc", "cfr", "authority", "ref", "reference",
    "meta.citation", "meta.cite", "meta.ref", "meta.reference"
  ]);

  if (c && typeof c === "object") {
    const t = pick(c, ["title", "usc_title", "cfr_title"]);
    const s = pick(c, ["section", "sec", "part", "subpart", "chapter"]);
    if (t && s) return `${t} § ${s}`;
    const raw = JSON.stringify(c);
    return raw.length < 160 ? raw : "";
  }

  return String(c || "").trim();
}

function normalizeTitle(entry) {
  return String(
    pick(entry, ["title", "name", "heading", "label", "short_title", "rule", "topic", "meta.title", "meta.name", "meta.heading", "meta.label"]) || ""
  ).trim();
}

function normalizeText(entry) {
  const t = pick(entry, ["text", "body", "content", "summary", "notes", "detail", "description", "preemption", "supremacy", "meta.text", "meta.notes"]);
  if (t && typeof t === "object") return JSON.stringify(t, null, 2);
  return String(t || "");
}

function normalizeLinks(entry) {
  const raw = pick(entry, ["links", "doctrine_links", "doctrines", "refs", "references", "meta.links"]) || [];
  const out = [];

  if (Array.isArray(raw)) {
    for (const it of raw) {
      if (!it) continue;
      if (typeof it === "string") out.push({ label: it, href: it });
      else if (typeof it === "object") {
        const href = pick(it, ["href", "url", "link"]);
        const label = pick(it, ["label", "title", "name"]) || href || "Reference";
        if (href) out.push({ label: String(label), href: String(href) });
      }
    }
  } else if (typeof raw === "object") {
    for (const [k, v] of Object.entries(raw)) {
      if (typeof v === "string") out.push({ label: k, href: v });
    }
  }

  return out;
}

function extractEntries(json) {
  if (Array.isArray(json)) return { entries: json, sourceKey: "root[]" };
  const keys = ["entries", "rules", "items", "provisions", "authority", "nodes"];
  for (const k of keys) {
    if (Array.isArray(json?.[k])) return { entries: json[k], sourceKey: k };
  }
  if (Array.isArray(json?.pack?.entries)) return { entries: json.pack.entries, sourceKey: "pack.entries" };
  return { entries: [], sourceKey: "(none)" };
}

function normalizeEntry(entry, i) {
  const citation = normalizeCitation(entry);
  const title = normalizeTitle(entry);
  const tags = normalizeTags(entry);
  const text = normalizeText(entry);
  const links = normalizeLinks(entry);

  const stableId =
    pick(entry, ["id", "key", "uid", "meta.id", "meta.key"]) ||
    (citation ? citation : `ENTRY_${String(i + 1).padStart(3, "0")}`);

  return {
    _id: String(stableId),
    citation: citation || "(citation missing)",
    title: title || "(untitled)",
    tags,
    text,
    links
  };
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeHref(href) {
  const v = String(href || "").trim();
  if (!v) return "#";
  if (v.startsWith("http://") || v.startsWith("https://")) return v;
  if (v.startsWith("/") || v.startsWith("./") || v.startsWith("../")) return v;
  return "#";
}

function setStatus(msg, cls = "") {
  const el = $("law-status");
  if (!el) return;
  el.className = "law-status " + cls;
  el.textContent = msg;
}

function renderPacks() {
  const list = $("law-pack-list");
  if (!list) return;

  list.innerHTML = "";
  for (const p of STATE.packs) {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.className = "law-pack-btn" + (STATE.selectedPack?.id === p.id ? " active" : "");
    btn.textContent = p.label;
    btn.addEventListener("click", () => selectPack(p));
    li.appendChild(btn);
    list.appendChild(li);
  }
}

function renderEntryList() {
  const list = $("law-node-list");
  if (!list) return;

  list.innerHTML = "";

  if (!STATE.filtered.length) {
    const li = document.createElement("li");
    li.className = "law-node";
    li.innerHTML = `<div style="padding:.6rem .6rem; color: var(--muted);">No entries match this filter.</div>`;
    list.appendChild(li);
    return;
  }

  for (const entry of STATE.filtered) {
    const li = document.createElement("li");
    li.className = "law-node";

    const btn = document.createElement("button");
    btn.addEventListener("click", () => renderDetail(entry));

    btn.innerHTML = `
      <div><strong>${escapeHtml(entry.citation)}</strong> — ${escapeHtml(entry.title)}</div>
      <small>${escapeHtml(entry.tags.join(" · "))}</small>
    `;

    li.appendChild(btn);
    list.appendChild(li);
  }
}

function renderDetail(entry) {
  const detail = $("law-detail");
  const linksEl = $("law-detail-links");
  if (detail) detail.textContent = "";
  if (linksEl) linksEl.innerHTML = "";

  if (!entry) {
    if (detail) detail.textContent = "Select a pack and an entry to view details here.";
    return;
  }

  const pills = entry.tags.map((t) => `<span class="law-pill">${escapeHtml(t)}</span>`).join(" ");
  const block = [
    pills ? pills : "",
    "",
    `${entry.citation} — ${entry.title}`,
    "",
    entry.text || "(no text available)"
  ].join("\n");

  if (detail) detail.textContent = block;

  if (linksEl) {
    if (entry.links && entry.links.length) {
      linksEl.innerHTML =
        `<div style="margin-top:.5rem;"><strong>References:</strong></div>` +
        `<ul style="margin:.3rem 0 0; padding-left:1.1rem;">` +
        entry.links
          .map((l) => `<li><a href="${safeHref(l.href)}">${escapeHtml(l.label)}</a></li>`)
          .join("") +
        `</ul>`;
    } else {
      linksEl.innerHTML = `<div class="law-sub" style="margin-top:.6rem;">No doctrine references attached yet.</div>`;
    }
  }
}

function applyFilter() {
  const q = (STATE.filter || "").trim().toLowerCase();
  if (!q) {
    STATE.filtered = [...STATE.entries];
    renderEntryList();
    return;
  }

  STATE.filtered = STATE.entries.filter((e) => {
    const hay = [e.citation, e.title, e.tags.join(" "), e.text].join(" ").toLowerCase();
    return hay.includes(q);
  });

  renderEntryList();
}

async function selectPack(pack) {
  STATE.selectedPack = pack;
  renderPacks();
  renderDetail(null);

  setStatus(`ABE Law Viewer v2.0.0 — loading pack…`, "law-status-warn");

  let json;
  try {
    const res = await fetch(pack.file, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    json = await res.json();
  } catch (e) {
    STATE.entries = [];
    STATE.filtered = [];
    renderEntryList();
    setStatus(`ABE Law Viewer v2.0.0 — failed to load ${pack.file}`, "law-status-bad");
    return;
  }

  const extracted = extractEntries(json);
  STATE.entries = extracted.entries.map((e, i) => normalizeEntry(e, i));
  STATE.filtered = [...STATE.entries];

  setStatus(
    `ABE Law Viewer v2.0.0 — loaded ${STATE.entries.length} entries (source: ${extracted.sourceKey})`,
    STATE.entries.length ? "law-status-ok" : "law-status-warn"
  );

  applyFilter();
}

function boot() {
  renderPacks();
  renderEntryList();
  renderDetail(null);

  const search = $("law-search");
  if (search) {
    search.addEventListener("input", (e) => {
      STATE.filter = e.target.value || "";
      applyFilter();
    });
  }

  setStatus("ABE Law Viewer v2.0.0 — choose a pack to begin.");
}

boot();
