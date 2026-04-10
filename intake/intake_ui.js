// intake/intake_ui.js
// Local-only Intake Builder + "AI-style" assistant (deterministic, no APIs).
// Writes: scenario.inputs.intake  (+ hash)

import {
  getOrCreateScenario,
  saveScenario,
  scenarioSet,
  scenarioGet,
  storeHash,
  downloadJSON
} from "../engine/core/session.js";

const $ = (id) => document.getElementById(id);

function listFiles(files) {
  const el = $("fileList");
  if (!el) return;
  el.innerHTML = "";
  if (!files || !files.length) return;

  const ul = document.createElement("ul");
  ul.className = "list";
  for (const f of files) {
    const li = document.createElement("li");
    li.textContent = `${f.name} (${Math.round(f.size / 1024)} KB)`;
    ul.appendChild(li);
  }
  el.appendChild(ul);
}

// Read only text-like files locally for preview.
// PDFs/images stay metadata-only unless user pastes text.
async function readTextIfPossible(file) {
  const name = (file?.name || "").toLowerCase();
  const type = (file?.type || "").toLowerCase();

  const looksText =
    type.startsWith("text/") ||
    name.endsWith(".txt") ||
    name.endsWith(".md") ||
    name.endsWith(".csv") ||
    name.endsWith(".json");

  if (!looksText) return null;

  try {
    const text = await file.text();
    // Avoid huge blob storage; keep first 200k chars (still local, but helps performance)
    return text.length > 200000 ? text.slice(0, 200000) + "\n\n[TRUNCATED]" : text;
  } catch {
    return null;
  }
}

function makeFileMeta(file) {
  return {
    name: file.name,
    size: file.size,
    type: file.type,
    lastModified: file.lastModified
  };
}

function guessDocType(fileMeta) {
  const n = (fileMeta?.name || "").toLowerCase();
  if (n.includes("ticket") || n.includes("citation")) return "ticket_or_citation";
  if (n.includes("policy") || n.includes("handbook")) return "policy_memo";
  if (n.includes("budget") || n.includes("grant") || n.includes("fund")) return "funding_or_budget";
  if (n.includes("contract") || n.includes("loan") || n.includes("finance")) return "contract_or_credit";
  if (n.endsWith(".csv")) return "table_csv";
  if (n.endsWith(".json")) return "data_json";
  if (n.endsWith(".pdf")) return "pdf_document";
  if (n.endsWith(".png") || n.endsWith(".jpg") || n.endsWith(".jpeg")) return "image_document";
  return "unknown";
}

function buildUploadAdvice() {
  return {
    headline: "What should I upload?",
    bullets: [
      "Tickets / citations / arrest paperwork → feeds CDA (divergence) + CIRI (harm/ROI).",
      "Funding line items / grant docs / budgets → feeds CFF → AFFE → (optional) CIRI prefills.",
      "Credit/auto finance policies / denials / underwriting docs → feeds CCRI → (optional) CIRI overrides.",
      "Policy memos / internal SOPs / enforcement training docs → feeds CDA + CAE scope tags later.",
      "If it’s a PDF/image and OCR isn’t wired yet: paste key text into the box on the left."
    ],
    non_negotiables: [
      "Local-only: nothing uploads anywhere.",
      "No logins, no tracking.",
      "No people-scoring: systems only.",
      "SHA-256 receipts prove integrity."
    ]
  };
}

function explainCurrentIntake(intake) {
  if (!intake) {
    return {
      headline: "No intake artifact found yet.",
      bullets: [
        "Upload files (optional), paste text (optional), then click “Build / Update inputs.intake”."
      ]
    };
  }

  const meta = intake.files_meta || [];
  const pasted = (intake.pasted_text || "").trim();
  const extracted = intake.extracted_texts || {};

  const typeCounts = {};
  for (const m of meta) {
    const t = m.guess_type || "unknown";
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  }

  const suggestions = [];
  if (typeCounts["funding_or_budget"]) suggestions.push("You likely want CFF → AFFE next (funding classification).");
  if (typeCounts["ticket_or_citation"] || pasted.length) suggestions.push("You likely want CDA next (divergence flags).");
  if (typeCounts["contract_or_credit"]) suggestions.push("You likely want CCRI next (system-level credit integrity).");

  return {
    headline: "Your current Intake artifact (inputs.intake)",
    bullets: [
      `Files indexed: ${meta.length}`,
      `Text extracted locally: ${Object.keys(extracted).length} file(s)`,
      pasted.length ? `Pasted text: ${pasted.length} characters` : "Pasted text: none",
      suggestions.length ? `Suggested next modules: ${suggestions.join(" ")}` : "Suggested next modules: run Integration to see what fires."
    ],
    type_breakdown: typeCounts,
    reminder: "Intake does not claim facts. It only stores what you provided so modules can compute deterministically."
  };
}

async function buildIntakeArtifact(files) {
  const fileArr = files ? Array.from(files) : [];
  const filesMeta = fileArr.map((f) => {
    const m = makeFileMeta(f);
    return { ...m, guess_type: guessDocType(m) };
  });

  // Read text for text-like files only
  const extracted_texts = {};
  for (const f of fileArr) {
    const t = await readTextIfPossible(f);
    if (t) extracted_texts[f.name] = t;
  }

  const pasted_text = ($("pastedText")?.value || "").trim();

  return {
    module: "INTAKE",
    module_version: "1.0",
    generated_at: new Date().toISOString(),
    local_only: true,
    notes: "This artifact is intentionally minimal: metadata + optional local text + optional pasted text.",
    files_meta: filesMeta,
    extracted_texts,
    pasted_text
  };
}

function renderPreview(obj) {
  const pre = $("intakePreview");
  if (!pre) return;
  pre.textContent = obj ? JSON.stringify(obj, null, 2) : "No intake artifact built yet.";
}

async function saveIntakeToScenario(intake) {
  scenarioSet("inputs.intake", intake);
  await storeHash("inputs.intake", intake);
  saveScenario(getOrCreateScenario());
}

function clearIntake() {
  scenarioSet("inputs.intake", null);
  saveScenario(getOrCreateScenario());
  renderPreview(null);
}

function boot() {
  const fileInput = $("fileInput");

  if (fileInput) {
    fileInput.addEventListener("change", (e) => {
      listFiles(e.target.files);
    });
  }

  const btnBuild = $("btnBuild");
  if (btnBuild) {
    btnBuild.addEventListener("click", async () => {
      const files = fileInput?.files || null;
      const intake = await buildIntakeArtifact(files);
      await saveIntakeToScenario(intake);
      renderPreview(intake);
      alert("inputs.intake built and stored locally.");
    });
  }

  const btnDownload = $("btnDownloadIntake");
  if (btnDownload) {
    btnDownload.addEventListener("click", () => {
      const intake = scenarioGet("inputs.intake");
      if (!intake) return alert("No inputs.intake yet. Click Build first.");
      downloadJSON("intake_artifact.json", intake);
    });
  }

  const btnClear = $("btnClear");
  if (btnClear) {
    btnClear.addEventListener("click", () => {
      clearIntake();
      alert("Intake cleared (local scenario).");
    });
  }

  const btnAdvise = $("btnAdvise");
  if (btnAdvise) {
    btnAdvise.addEventListener("click", () => {
      const out = buildUploadAdvice();
      $("assistantOut").textContent = JSON.stringify(out, null, 2);
    });
  }

  const btnExplain = $("btnExplainIntake");
  if (btnExplain) {
    btnExplain.addEventListener("click", () => {
      const intake = scenarioGet("inputs.intake");
      const out = explainCurrentIntake(intake);
      $("assistantOut").textContent = JSON.stringify(out, null, 2);
    });
  }

  // Load existing intake if present
  const existing = scenarioGet("inputs.intake");
  if (existing) renderPreview(existing);
}

boot();
