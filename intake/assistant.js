// intake/assistant.js
// ABE Intake Assistant (local-only) — v1.0.0
// No API. No backend. No logins. No tracking.
// Reads selected files (metadata only) + (optional) local text extraction for .txt/.md/.json/.csv
// Writes nothing by itself unless you call saveToScenario() from UI code.

const $ = (id) => document.getElementById(id);

export const INTAKE_ASSISTANT_VERSION = "1.0.0";

// LocalStorage keys (kept consistent with your intake page)
export const LS_KEYS = {
  INTAKE_ARTIFACT: "ABE_FLAG:intake_artifact",
  SCENARIO: "ABE_FLAG:scenario"
};

export function nowISO() {
  return new Date().toISOString();
}

export function loadJSON(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveJSON(key, obj) {
  localStorage.setItem(key, JSON.stringify(obj, null, 2));
}

export function downloadJSON(filename, obj) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function fileMeta(filesLike) {
  const files = Array.from(filesLike || []);
  return files.map((f) => ({
    name: f.name,
    size: f.size,
    type: f.type,
    lastModified: f.lastModified
  }));
}

function lower(s) {
  return String(s || "").toLowerCase();
}

export function classifyFile(name, type) {
  const n = lower(name);
  const t = lower(type);

  if (t.includes("pdf") || n.endsWith(".pdf")) {
    return { kind: "PDF", moduleHints: ["intake", "cda", "ciri", "cff", "ccri"], note: "PDF detected. OCR is optional and can be added later (local-only)." };
  }
  if (t.includes("image") || n.match(/\.(png|jpg|jpeg|webp|gif)$/)) {
    return { kind: "Image", moduleHints: ["intake", "cda"], note: "Image detected. If it’s a scan/photo, OCR is needed to extract text (local-only)." };
  }
  if (n.endsWith(".csv")) {
    return { kind: "CSV", moduleHints: ["ciri", "cibs", "cii", "cff"], note: "CSV detected. Often inputs/budgets/portfolios." };
  }
  if (n.endsWith(".json")) {
    return { kind: "JSON", moduleHints: ["intake", "system", "law", "ccri"], note: "JSON detected. Often config/packs/structured inputs." };
  }
  if (n.endsWith(".txt") || n.endsWith(".md") || t.includes("text")) {
    return { kind: "Text", moduleHints: ["cda", "ciri", "cae"], note: "Text detected. Good for policies, notes, excerpts, citations." };
  }
  return { kind: "File", moduleHints: ["intake"], note: "Unknown type. It can still be indexed and hashed later." };
}

function safeSlice(s, max = 1200) {
  const str = String(s || "");
  if (str.length <= max) return str;
  return str.slice(0, max) + "\n…(truncated)…";
}

/**
 * Optional local extraction (NO OCR):
 * - Reads only text-like files: .txt, .md, .json, .csv
 * - PDF/image extraction is intentionally not done here (to keep it simple + local-only + predictable)
 */
export async function extractLocalText(filesLike, opts = {}) {
  const files = Array.from(filesLike || []);
  const maxBytes = typeof opts.maxBytes === "number" ? opts.maxBytes : 200_000; // ~200KB per file
  const results = [];

  for (const f of files) {
    const name = lower(f.name);
    const isTexty =
      name.endsWith(".txt") ||
      name.endsWith(".md") ||
      name.endsWith(".csv") ||
      name.endsWith(".json") ||
      lower(f.type).startsWith("text/") ||
      lower(f.type).includes("json") ||
      lower(f.type).includes("csv");

    if (!isTexty) continue;

    try {
      if (f.size > maxBytes) {
        results.push({
          name: f.name,
          ok: false,
          reason: `Skipped text read (file too large: ${Math.round(f.size / 1024)} KB).`
        });
        continue;
      }

      const text = await f.text();
      results.push({
        name: f.name,
        ok: true,
        extracted: safeSlice(text, 2500)
      });
    } catch (e) {
      results.push({
        name: f.name,
        ok: false,
        reason: e?.message || String(e)
      });
    }
  }

  return results;
}

export function buildAssistant(intakeArtifact, extractedSnippets = []) {
  const files = intakeArtifact?.files || [];
  const out = {
    module: "INTAKE_ASSISTANT",
    module_version: INTAKE_ASSISTANT_VERSION,
    generated_at: nowISO(),
    local_only: true,
    headline: "",
    what_you_uploaded: [],
    likely_modules_to_care: [],
    next_steps: [],
    file_notes: [],
    extracted_snippets: [],
    warnings: []
  };

  if (!files.length) {
    out.headline = "No uploads yet.";
    out.next_steps = [
      "Upload documents here (local-only), or run a default scenario in Integration.",
      "If you upload PDFs or photos, OCR can be added later (still local-only).",
      "When ready: Integration → Run Engine → download receipt + scenario."
    ];
    out.warnings = ["Nothing is uploaded yet, so the assistant has nothing to classify."];
    return out;
  }

  const byKind = {};
  const moduleHits = {};
  const notes = [];

  for (const f of files) {
    const c = classifyFile(f.name, f.type);
    byKind[c.kind] = (byKind[c.kind] || 0) + 1;
    for (const m of c.moduleHints) moduleHits[m] = (moduleHits[m] || 0) + 1;
    if (c.note) notes.push(`${f.name}: ${c.note}`);
  }

  out.headline = "Assistant summary (local-only)";
  out.what_you_uploaded = Object.entries(byKind)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k}: ${v}`);

  out.likely_modules_to_care = Object.entries(moduleHits)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k} (${v})`);

  out.next_steps = [
    "If these are tickets/policies/contracts: go to Integration and click Run Engine.",
    "Download audit_certificate.json for proof and scenario.json for the full local record.",
    "If you need text extraction from PDFs/images, add OCR later (still local-only)."
  ];

  out.file_notes = notes.slice(0, 24);

  // Include extraction results if any
  if (Array.isArray(extractedSnippets) && extractedSnippets.length) {
    out.extracted_snippets = extractedSnippets.slice(0, 12);
  }

  const hasPdfOrImage = files.some((f) => {
    const n = lower(f.name);
    const t = lower(f.type);
    return n.endsWith(".pdf") || t.includes("pdf") || t.includes("image");
  });
  if (hasPdfOrImage) {
    out.warnings.push("Some uploads are PDFs/images. This assistant does not OCR by default. OCR can be added later (local-only).");
  }

  return out;
}

/**
 * Build + store intake_artifact.json in localStorage (metadata only).
 * filesLike: FileList from <input type="file" multiple>
 */
export function storeIntakeArtifact(filesLike) {
  const meta = fileMeta(filesLike);
  const existing = loadJSON(LS_KEYS.INTAKE_ARTIFACT);

  const artifact = {
    module: "INTAKE",
    module_version: "1.0",
    created_at: existing?.created_at || nowISO(),
    updated_at: nowISO(),
    files: meta,
    notes: "Local-only intake index. No OCR performed here."
  };

  saveJSON(LS_KEYS.INTAKE_ARTIFACT, artifact);
  return artifact;
}

/**
 * Save Intake into Scenario localStorage (so Integration can use it)
 */
export function saveIntakeToScenario() {
  const scenario = loadJSON(LS_KEYS.SCENARIO) || {
    engine: { engine_id: "ABE_FLAG", engine_version: "1.0" },
    created_at: nowISO(),
    updated_at: nowISO(),
    inputs: {},
    derived: {},
    module_status: {},
    hashes: {}
  };

  const artifact = loadJSON(LS_KEYS.INTAKE_ARTIFACT) || { files: [], updated_at: nowISO() };

  scenario.inputs = scenario.inputs || {};
  scenario.inputs.intake_files_meta = artifact.files || [];
  scenario.inputs.intake = scenario.inputs.intake || {
    source: "intake_page",
    created_at: nowISO(),
    notes: "Saved from intake UI (local-only)."
  };
  scenario.updated_at = nowISO();

  saveJSON(LS_KEYS.SCENARIO, scenario);
  return scenario;
}

/**
 * Wire up the Intake UI (optional helper).
 * Expects these IDs (same as the HTML I gave you):
 * - fileInput, fileList, intakeCount, intakeUpdated, assistantPreview
 * - btnDownloadIntake, btnSaveToScenario, btnRefreshAssistant, btnCopyAssistant
 */
export function attachIntakeAssistantUI(opts = {}) {
  const fileInputId = opts.fileInputId || "fileInput";

  const fileInput = $(fileInputId);
  if (!fileInput) {
    console.warn("Intake assistant: file input not found:", fileInputId);
    return;
  }

  const renderFileList = (files) => {
    const el = $("fileList");
    if (!el) return;
    el.innerHTML = "";
    if (!files || !files.length) return;

    const ul = document.createElement("ul");
    for (const f of files) {
      const li = document.createElement("li");
      li.textContent = `${f.name} (${Math.round(f.size / 1024)} KB)`;
      ul.appendChild(li);
    }
    el.appendChild(ul);
  };

  const refresh = async () => {
    const artifact = loadJSON(LS_KEYS.INTAKE_ARTIFACT) || { files: [], updated_at: null };
    const countEl = $("intakeCount");
    const updEl = $("intakeUpdated");
    if (countEl) countEl.textContent = String(artifact.files?.length || 0);
    if (updEl) updEl.textContent = artifact.updated_at || "—";

    const assistantPre = $("assistantPreview");
    if (assistantPre) {
      const extracted = opts.readTextSnippets
        ? await extractLocalText(fileInput.files, { maxBytes: 200_000 })
        : [];
      const assistant = buildAssistant(artifact, extracted);
      assistantPre.textContent = JSON.stringify(assistant, null, 2);
    }
  };

  // File selection
  fileInput.addEventListener("change", async (e) => {
    renderFileList(e.target.files);
    storeIntakeArtifact(e.target.files);
    await refresh();
  });

  // Buttons (optional)
  const btnDownload = $("btnDownloadIntake");
  if (btnDownload) {
    btnDownload.addEventListener("click", () => {
      const artifact = loadJSON(LS_KEYS.INTAKE_ARTIFACT) || { module: "INTAKE", files: [], updated_at: nowISO() };
      downloadJSON("intake_artifact.json", artifact);
    });
  }

  const btnSave = $("btnSaveToScenario");
  if (btnSave) {
    btnSave.addEventListener("click", () => {
      saveIntakeToScenario();
      alert("Saved intake into local scenario store. Now open Integration and Run Engine.");
    });
  }

  const btnRefresh = $("btnRefreshAssistant");
  if (btnRefresh) {
    btnRefresh.addEventListener("click", async () => {
      await refresh();
    });
  }

  const btnCopy = $("btnCopyAssistant");
  if (btnCopy) {
    btnCopy.addEventListener("click", async () => {
      try {
        const text = $("assistantPreview")?.textContent || "";
        await navigator.clipboard.writeText(text);
        alert("Copied assistant guidance.");
      } catch {
        alert("Clipboard blocked. You can still select and copy manually.");
      }
    });
  }

  // Boot refresh
  refresh();
}
```0
