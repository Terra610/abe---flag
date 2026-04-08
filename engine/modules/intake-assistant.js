// intake/assistant.js
// Intake page logic (local-only)
// Moves the old inline <script type="module"> block into a real module file.

const LS_KEYS = {
  INTAKE_ARTIFACT: "ABE_FLAG:intake_artifact",
  SCENARIO: "ABE_FLAG:scenario"
};

const $ = (id) => document.getElementById(id);

function nowISO() {
  return new Date().toISOString();
}

function loadJSON(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveJSON(key, obj) {
  localStorage.setItem(key, JSON.stringify(obj, null, 2));
}

function downloadJSON(filename, obj) {
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

function setList(files) {
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
}

function classifyFile(name, type) {
  const n = String(name || "").toLowerCase();
  const t = String(type || "").toLowerCase();

  if (t.includes("pdf") || n.endsWith(".pdf"))
    return { kind: "PDF", moduleHints: ["intake", "cda", "ciri", "cff", "ccri"], note: "PDF detected. OCR/parsing (optional) can be added later." };

  if (t.includes("image") || n.match(/\.(png|jpg|jpeg|webp|gif)$/))
    return { kind: "Image", moduleHints: ["intake", "cda"], note: "Image detected. If it’s a scan/photo, OCR will be needed to extract text." };

  if (n.endsWith(".csv"))
    return { kind: "CSV", moduleHints: ["ciri", "cibs", "cii", "cff"], note: "CSV detected. If this is inputs/budgets/portfolios, it can drive downstream modules." };

  if (n.endsWith(".json"))
    return { kind: "JSON", moduleHints: ["intake", "system", "law", "ccri"], note: "JSON detected. Often config, packs, or structured inputs." };

  if (n.endsWith(".txt") || t.includes("text"))
    return { kind: "Text", moduleHints: ["cda", "ciri", "cae"], note: "Text detected. Good for policies, notes, excerpts, citations." };

  return { kind: "File", moduleHints: ["intake"], note: "Unknown type. It can still be indexed and hashed later." };
}

function buildAssistant(intakeArtifact) {
  const files = intakeArtifact?.files || [];
  if (!files.length) {
    return {
      headline: "No uploads yet.",
      steps: [
        "Click Upload and select any documents you want the engine to consider.",
        "Or skip uploads and run a default scenario on the Integration page."
      ],
      modules: {
        intake: "Collects local file metadata now. Later can OCR/parse locally.",
        divergence_cda: "Uses practices/statutes/docs to produce divergence signals.",
        ciri: "Uses divergence + inputs to calculate recoverable value and ROI.",
        cibs: "Allocates recovered value into community budget categories.",
        cii: "Builds/validates a project portfolio against the budget."
      },
      warnings: ["Nothing is uploaded yet, so the assistant has nothing to classify."]
    };
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

  const topModules = Object.entries(moduleHits)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k} (${v})`);

  const kinds = Object.entries(byKind)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k}: ${v}`);

  const nextSteps = [
    "If these are tickets/policies: run Integration → it will generate receipts + hashes.",
    "If you want OCR: Intake module can add in-browser OCR later (still local-only).",
    "If you want to prove integrity: download scenario.json + audit_certificate.json from Integration."
  ];

  const warnings = [];
  const hasPdf = files.some(
    (f) => String(f.type || "").toLowerCase().includes("pdf") || String(f.name || "").toLowerCase().endsWith(".pdf")
  );
  const hasImage = files.some((f) => String(f.type || "").toLowerCase().includes("image"));
  if (hasPdf || hasImage) {
    warnings.push("Some uploads may require OCR to extract text. OCR can be added later and still remain local-only.");
  }

  return {
    headline: "Assistant summary (local-only)",
    what_you_uploaded: kinds,
    likely_modules_to_care: topModules.length ? topModules : ["intake"],
    next_steps: nextSteps,
    file_notes: notes.slice(0, 18),
    warnings
  };
}

function updateUI() {
  const artifact = loadJSON(LS_KEYS.INTAKE_ARTIFACT) || { created_at: null, updated_at: null, files: [] };

  const countEl = $("intakeCount");
  const updatedEl = $("intakeUpdated");
  if (countEl) countEl.textContent = String(artifact.files?.length || 0);
  if (updatedEl) updatedEl.textContent = artifact.updated_at || "—";

  const notice = $("intakeNotice");
  const ok = $("intakeOk");
  if (notice) notice.style.display = "none";
  if (ok) ok.style.display = "none";

  if (!(artifact.files && artifact.files.length)) {
    if (notice) {
      notice.style.display = "block";
      notice.innerHTML = `<strong>Nothing uploaded yet.</strong><br/>That’s fine. You can upload files here, or run a default scenario in Integration.`;
    }
  } else {
    if (ok) {
      ok.style.display = "block";
      ok.innerHTML = `<strong>Ready.</strong><br/>Your files are indexed locally. Next: open Integration and click <strong>Run Engine</strong>.`;
    }
  }

  const assistant = buildAssistant(artifact);
  const ap = $("assistantPreview");
  if (ap) ap.textContent = JSON.stringify(assistant, null, 2);
}

function saveToScenario() {
  const scenario =
    loadJSON(LS_KEYS.SCENARIO) || {
      engine: { engine_id: "ABE_FLAG", engine_version: "1.0" },
      created_at: nowISO(),
      updated_at: nowISO(),
      inputs: {},
      derived: {},
      module_status: {},
      hashes: {}
    };

  const artifact = loadJSON(LS_KEYS.INTAKE_ARTIFACT) || { created_at: null, updated_at: null, files: [] };

  scenario.inputs = scenario.inputs || {};
  scenario.inputs.intake_files_meta = artifact.files || [];
  scenario.inputs.intake =
    scenario.inputs.intake || {
      source: "intake_page",
      created_at: nowISO(),
      notes: "Saved from intake/index.html (local-only)."
    };
  scenario.updated_at = nowISO();

  saveJSON(LS_KEYS.SCENARIO, scenario);
  alert("Saved to local scenario store (local-only). Now open Integration and run.");
}

function wireUI() {
  // Nav buttons
  const btnHome = $("btnHome");
  if (btnHome) btnHome.addEventListener("click", () => (window.location.href = "index.html"));

  const btnStart = $("btnStart");
  if (btnStart) btnStart.addEventListener("click", () => (window.location.href = "start/index.html"));

  const btnOpenIntegration = $("btnOpenIntegration");
  if (btnOpenIntegration) btnOpenIntegration.addEventListener("click", () => (window.location.href = "integration/index.html"));

  // Clear intake
  const btnClear = $("btnClear");
  if (btnClear) {
    btnClear.addEventListener("click", () => {
      if (!confirm("Clear local intake artifacts? (This does NOT delete your actual files.)")) return;
      localStorage.removeItem(LS_KEYS.INTAKE_ARTIFACT);
      updateUI();
    });
  }

  // File input
  const fileInput = $("fileInput");
  if (fileInput) {
    fileInput.addEventListener("change", (e) => {
      const files = Array.from(e.target.files || []);
      setList(files);

      const meta = files.map((f) => ({
        name: f.name,
        size: f.size,
        type: f.type,
        lastModified: f.lastModified
      }));

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
      updateUI();
    });
  }

  // Save to scenario
  const btnSaveToScenario = $("btnSaveToScenario");
  if (btnSaveToScenario) btnSaveToScenario.addEventListener("click", saveToScenario);

  // Download intake
  const btnDownloadIntake = $("btnDownloadIntake");
  if (btnDownloadIntake) {
    btnDownloadIntake.addEventListener("click", () => {
      const artifact = loadJSON(LS_KEYS.INTAKE_ARTIFACT) || { module: "INTAKE", files: [], updated_at: nowISO() };
      downloadJSON("intake_artifact.json", artifact);
    });
  }

  // Refresh assistant
  const btnRefreshAssistant = $("btnRefreshAssistant");
  if (btnRefreshAssistant) btnRefreshAssistant.addEventListener("click", updateUI);

  // Copy assistant
  const btnCopyAssistant = $("btnCopyAssistant");
  if (btnCopyAssistant) {
    btnCopyAssistant.addEventListener("click", async () => {
      try {
        const text = $("assistantPreview")?.textContent || "";
        await navigator.clipboard.writeText(text);
        alert("Copied assistant guidance.");
      } catch {
        alert("Could not copy (browser blocked clipboard). You can still select text and copy manually.");
      }
    });
  }
}

function boot() {
  wireUI();
  updateUI();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
