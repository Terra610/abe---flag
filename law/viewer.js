// law/viewer.js
// ABE Law Viewer (Local-only)
// Robust pack loader + entry normalizer so we don't get "No citation — (untitled)".
// Works with: {entries:[]}, {rules:[]}, {items:[]}, root array [], or nested pack.entries.

const $ = (id) => document.getElementById(id);

const PACKS = [
  {
    id: "t49_transport",
    label: "Title 49 — Transportation (Core FMCSA Scope)",
    file: "law/title_49_transport.json",
    tag: "USC"
  },
  {
    id: "t49_mcsap_fmcsa",
    label: "Title 49 — MCSAP & FMCSA Program Funding",
    file: "law/title_49_mcsap_fmcsa.json",
    tag: "Funding"
  },
  {
    id: "fmcsr_scope",
    label: "FMCSR Scope Map (49 CFR 390.3 / 390.5)",
    file: "law/fmcsr_scope.json",
    tag: "CFR"
  },
  {
    id: "mcsap_rules",
    label: "MCSAP Program Rules (49 CFR Part 350)",
    file: "law/mcsap_rules.json",
    tag: "CFR"
  }
];

let STATE = {
  packs: PACKS,
  selectedPack: null,
  rawPack: null,
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

  // de-dupe
  return Array.from(new Set(tags));
}

function normalizeCitation(entry) {
  // Try common keys
  const citation =
    pick(entry, [
      "citation",
      "cite",
      "cites",
      "usc",
      "cfr",
      "authority",
      "ref",
      "reference",
      "meta.citation",
      "meta.cite",
      "meta.ref",
      "meta.reference"
    ]) || "";

  // If citation is object-ish, format it
  if (citation && typeof citation === "object") {
    // Try to build something readable
    const t = pick(citation, ["title", "usc_title", "cfr_title"]);
    const s = pick(citation, ["section", "sec", "part", "subpart", "chapter"]);
    const raw = JSON.stringify(citation);
    if (t && s) return `${t} § ${s}`;
    return raw.length < 140 ? raw : "";
  }

  return String(citation).trim();
}

function normalizeTitle(entry) {
  const title =
    pick(entry, [
      "title",
      "name",
      "heading",
      "label",
      "short_title",
      "rule",
      "topic",
      "meta.title",
      "meta.name",
      "meta.heading",
      "meta.label",
      "meta.short_title"
    ]) || "";

  return String(title).trim();
}

function normalizeText(entry) {
  // Prefer richer fields
  const text =
    pick(entry, [
      "text",
      "body",
      "content",
      "summary",
      "notes",
      "detail",
      "description",
      "preemption",
      "supremacy",
      "meta.text",
      "meta.body",
      "meta.content",
      "meta.summary",
      "meta.notes"
    ]) || "";

  if (typeof text === "object") return JSON.stringify(text, null, 2);
  return String(text);
}

function normalizeLinks(entry) {
  const linksRaw = pick(entry, ["links", "doctrine_links", "doctrines", "refs", "references", "meta.links"]) || [];
  const links = [];

  // Accept array of strings OR array of objects OR object map
  if (Array.isArray(linksRaw)) {
    for (const it of linksRaw) {
      if (!it) continue;
      if (typeof it === "string") links.push({ label: it, href: it });
      else if (typeof it === "object") {
        const href = pick(it, ["href", "url", "link"]);
        const label = pick(it, ["label", "title", "name"]) || href || "Reference";
        if (href) links.push({ label: String(label), href: String(href) });
      }
    }
  } else if (typeof linksRaw === "object") {
    for (const [k, v] of Object.entries(linksRaw)) {
      if (typeof v === "string") links.push({ label: k, href: v });
    }
  }

  return links;
}

function normalizeEntry(entry, i = 0) {
  const citation = normalizeCitation(entry);
  const title = normalizeTitle(entry);

  // Strong fallback: generate a stable id-like citation so the list isn't blank
  const stableId =
    pick(entry, ["id", "key", "uid", "meta.id", "meta.key"]) ||
    (citation ? citation : `ENTRY_${String(i + 1).padStart(3, "0")}`);

  const tags = normalizeTags(entry);
  const text = normalizeText(entry);
  const links = normalizeLinks(entry);

  return {
    _raw: entry,
    _id: String(stableId),
    citation: citation || "(citation missing)",
    title: title || "(untitled)",
    tags,
    text,
    links
  };
}

function extractEntries(packJson) {
  // Accept a bunch of shapes:
  // 1) root array []
  // 2) { entries: [] }
  // 3) { rules: [] }
  // 4) { items: [] }
  // 5) { pack: { entries: [] } }
  if (Array.isArray(packJson)) return { entries: packJson, sourceKey: "root[]" };

  const keys = ["entries", "rules", "items", "provisions", "authority", "nodes"];
  for (const k of keys) {
    const v = packJson?.[k];
    if (Array.isArray(v)) return { entries: v, sourceKey: k };
  }

  const nested = packJson?.pack?.entries;
  if (Array.isArray(nested)) return { entries: nested, sourceKey: "pack.entries" };

  return { entries: [], sourceKey: "(none)" };
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

  const rows = STATE.filtered.length ? STATE.filtered : [];
  if (!rows.length) {
    const li = document.createElement("li");
    li.className = "law-node";
    li.innerHTML = `<div style="padding:.6rem .6rem; color: var(--muted);">No entries match this filter.</div>`;
    list.appendChild(li);
    return;
  }

  for (const entry of rows) {
    const li = document.createElement("li");
    li.className = "law-node";

    const btn = document.createElement("button");
    btn.addEventListener("click", () => selectEntry(entry));

    // This is the line that used to show "No citation — (untitled)"
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

  // Links (doctrines, references)
  if (linksEl) {
    if (entry.links && entry.links.length) {
      linksEl.innerHTML =
        `<div style="margin-top:.5rem;"><strong>References:</strong></div>` +
        `<ul style="margin:.3rem 0 0; padding-left:1.1rem;">` +
        entry.links
          .map((l) => {
            const href = safeHref(l.href);
            return `<li><a href="${href}">${escapeHtml(l.label)}</a></li>`;
          })
          .join("") +
        `</ul>`;
    } else {
      linksEl.innerHTML = `<div class="law-sub" style="margin-top:.6rem;">No doctrine references attached yet. You can still cross-check this rule from the Doctrines page.</div>`;
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
    const hay = [
      e.citation,
      e.title,
      e.tags.join(" "),
      e.text
    ].join(" ").toLowerCase();
    return hay.includes(q);
  });

  renderEntryList();
}

async function selectPack(pack) {
  STATE.selectedPack = pack;
  STATE.selectedEntry = null;
  renderPacks();
  renderDetail(null);

  setStatus(`Status: loading pack…`, "law-status-warn");

  let json;
  try {
    const res = await fetch(pack.file, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    json = await res.json();
  } catch (e) {
    STATE.rawPack = null;
    STATE.entries = [];
    STATE.filtered = [];
    renderEntryList();
    setStatus(`Status: failed to load pack (${pack.file})`, "law-status-bad");
    return;
  }

  STATE.rawPack = json;

  const extracted = extractEntries(json);
  const normalized = extracted.entries.map((e, i) => normalizeEntry(e, i));

  STATE.entries = normalized;
  STATE.filtered = normalized;

  // Helpful status to debug future mismatches
  setStatus(
    `Status: loaded ${normalized.length} entries from ${pack.label} (source: ${extracted.sourceKey})`,
    normalized.length ? "law-status-ok" : "law-status-warn"
  );

  applyFilter();
}

function selectEntry(entry) {
  STATE.selectedEntry = entry;
  renderDetail(entry);
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
  // Keep local-only safe browsing: allow relative links + https
  const v = String(href || "").trim();
  if (!v) return "#";
  if (v.startsWith("http://") || v.startsWith("https://")) return v;
  // allow local repo-relative
  if (v.startsWith("/") || v.startsWith("./") || v.startsWith("../")) return v;
  return "#";
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

  setStatus("Status: choose a pack to begin.");
}

boot();
