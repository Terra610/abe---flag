// integration/orchestrator.js
// ABE Flag Orchestrator (Mode B): Run Engine in-order, local-only, receipts + hashes.
// Manifest-driven. No servers, no logins, no telemetry.

import {
  getOrCreateScenario,
  saveScenario,
  resetScenario,
  setModuleStatus,
  scenarioSet,
  scenarioGet,
  storeHash,
  downloadJSON
} from "../engine/core/session.js";

async function loadManifest() {
  const res = await fetch("../engine/core/engine.json", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load engine manifest.");
  return res.json();
}

function pillClass(status) {
  const s = (status || "").toUpperCase();
  if (s === "OK") return "pill ok";
  if (s === "WARN") return "pill warn";
  if (s === "FAIL") return "pill fail";
  if (s === "SKIP") return "pill skip";
  if (s === "RUNNING") return "pill pending";
  return "pill pending";
}

function renderStatus() {
  const scenario = getOrCreateScenario();
  const grid = document.getElementById("statusGrid");
  if (!grid) return;

  grid.innerHTML = "";

  const entries = Object.entries(scenario.module_status || {});
  if (!entries.length) {
    grid.textContent = "No scenario initialized yet.";
    return;
  }

  for (const [key, info] of entries) {
    const row = document.createElement("div");
    row.className = "status";

    const a = document.createElement("div");
    a.textContent = key;

    const b = document.createElement("div");
    const status = info?.status || "PENDING";
    b.innerHTML = `<span class="${pillClass(status)}">${status}</span>`;

    const c = document.createElement("div");
    c.textContent = info?.notes || "";

    row.appendChild(a);
    row.appendChild(b);
    row.appendChild(c);
    grid.appendChild(row);
  }
}

function listFiles(files) {
  const el = document.getElementById("fileList");
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

function initScenario() {
  const s = getOrCreateScenario();
  s.module_status = s.module_status || {};
  saveScenario(s);
  renderStatus();
}

function loadDefaultScenario() {
  // Default inputs that let required modules run without user uploads.
  // Keep minimal + non-sensitive.
  initScenario();

  scenarioSet("inputs.intake", {
    source: "default_scenario",
    created_at: new Date().toISOString(),
    notes: "Default scenario loaded (no user upload)."
  });

  scenarioSet("inputs.default_loaded", true);

  saveScenario(getOrCreateScenario());
  renderStatus();
}

function setPendingFromManifest(manifest) {
  const s = getOrCreateScenario();
  s.module_status = s.module_status || {};

  for (const k of manifest.firing_order || []) {
    if (!s.module_status[k]) {
      s.module_status[k] = {
        status: "PENDING",
        generated_at: new Date().toISOString(),
        notes: ""
      };
    }
  }
  saveScenario(s);
}

function hasRequiredPaths(paths = []) {
  const missing = [];
  for (const p of paths) {
    const v = scenarioGet(p);
    if (v === undefined || v === null) missing.push(p);
  }
  return missing;
}

async function loadRunner(runnerPath) {
  // runnerPath in manifest is relative to integration/ folder
  return import(runnerPath);
}

async function runEngine(files) {
  const manifest = await loadManifest();

  initScenario();
  setPendingFromManifest(manifest);

  // Auto-default: if user didn't upload anything and Intake hasn't populated inputs.intake,
  // we still run deterministically with a safe default.
  if (scenarioGet("inputs.intake") == null) {
    loadDefaultScenario();
  }

  renderStatus();

  // Save file metadata only (no uploads anywhere).
  if (files && files.length) {
    const meta = Array.from(files).map((f) => ({
      name: f.name,
      size: f.size,
      type: f.type,
      lastModified: f.lastModified
    }));
    scenarioSet("inputs.intake_files_meta", meta);
  }

  // Run modules in order
  for (const moduleKey of manifest.firing_order || []) {
    const cfg = manifest.modules?.[moduleKey] || {};
    const required = !!cfg.required;
    const requires = cfg.requires || [];
    const produces = cfg.produces || [];
    const runnerPath = cfg.runner;

    setModuleStatus(moduleKey, "RUNNING", "Running…");
    renderStatus();

    const missing = hasRequiredPaths(requires);
    if (missing.length) {
      const note = `Missing required inputs: ${missing.join(", ")}`;
      if (required) {
        setModuleStatus(moduleKey, "FAIL", note);
        renderStatus();
        break;
      } else {
        setModuleStatus(moduleKey, "SKIP", note);
        renderStatus();
        continue;
      }
    }

    if (!runnerPath) {
      const note = "No runner defined in manifest.";
      if (required) {
        setModuleStatus(moduleKey, "FAIL", note);
        renderStatus();
        break;
      } else {
        setModuleStatus(moduleKey, "SKIP", note);
        renderStatus();
        continue;
      }
    }

    let mod;
    try {
      mod = await loadRunner(runnerPath);
    } catch (e) {
      const note = `Runner not found: ${runnerPath}`;
      if (required) {
        setModuleStatus(moduleKey, "FAIL", note);
        renderStatus();
        break;
      } else {
        setModuleStatus(moduleKey, "SKIP", note);
        renderStatus();
        continue;
      }
    }

    if (!mod?.run || typeof mod.run !== "function") {
      const note = "Runner missing export: run(scenario, ctx)";
      if (required) {
        setModuleStatus(moduleKey, "FAIL", note);
        renderStatus();
        break;
      } else {
        setModuleStatus(moduleKey, "SKIP", note);
        renderStatus();
        continue;
      }
    }

    try {
      const scenario = getOrCreateScenario();
      const out = await mod.run(scenario, { files });

      // WRITE CONTRACT (ends edit-loop of death):
      // - honor __writes if provided
      // - otherwise write entire output to produces[0] only
      if (out && typeof out === "object" && !Array.isArray(out) && out.__writes && typeof out.__writes === "object") {
        for (const [p, v] of Object.entries(out.__writes)) {
          scenarioSet(p, v);
          await storeHash(p, v);
        }
      } else if (produces.length >= 1) {
        scenarioSet(produces[0], out);
        await storeHash(produces[0], out);
      } else {
        if (out !== undefined) await storeHash(`module_output.${moduleKey}`, out);
      }

      setModuleStatus(moduleKey, "OK", "Completed");
      renderStatus();
    } catch (e) {
      const note = `Error: ${e?.message || String(e)}`;
      if (required) {
        setModuleStatus(moduleKey, "FAIL", note);
        renderStatus();
        break;
      } else {
        setModuleStatus(moduleKey, "WARN", note);
        renderStatus();
        continue;
      }
    }
  }

  // Build receipt
  const finalScenario = getOrCreateScenario();
  const receipt = {
    engine: finalScenario.engine,
    created_at: finalScenario.created_at,
    updated_at: finalScenario.updated_at,
    module_status: finalScenario.module_status,
    hashes: finalScenario.hashes,
    inputs_present: Object.keys(finalScenario.inputs || {}),
    derived_present: Object.keys(finalScenario.derived || {})
  };

  scenarioSet("receipts.audit_certificate", receipt);
  await storeHash("receipts.audit_certificate", receipt);

  const pre = document.getElementById("receiptPreview");
  if (pre) pre.textContent = JSON.stringify(receipt, null, 2);

  return receipt;
}

/* =========================
   UI HOOKS
   ========================= */

// Nav buttons (present in the updated integration/index.html)
const btnHome = document.getElementById("btnHome");
if (btnHome) btnHome.addEventListener("click", () => (window.location.href = "../index.html"));

const btnStart = document.getElementById("btnStart");
if (btnStart) btnStart.addEventListener("click", () => (window.location.href = "../start/index.html"));

const btnInit = document.getElementById("btnInit");
if (btnInit) {
  btnInit.addEventListener("click", () => {
    initScenario();
    alert("Scenario initialized.");
  });
}

const btnDefault = document.getElementById("btnDefault");
if (btnDefault) {
  btnDefault.addEventListener("click", () => {
    loadDefaultScenario();
    alert("Default scenario loaded.");
  });
}

const btnReset = document.getElementById("btnReset");
if (btnReset) {
  btnReset.addEventListener("click", () => {
    resetScenario();
    renderStatus();
    const pre = document.getElementById("receiptPreview");
    if (pre) pre.textContent = "";
    alert("Scenario reset.");
  });
}

const btnRun = document.getElementById("btnRun");
if (btnRun) {
  btnRun.addEventListener("click", async () => {
    const input = document.getElementById("fileInput");
    const files = input?.files || null;
    try {
      await runEngine(files);
    } catch (e) {
      alert(`Run failed: ${e?.message || e}`);
    }
  });
}

const btnReceipt = document.getElementById("btnReceipt");
if (btnReceipt) {
  btnReceipt.addEventListener("click", () => {
    const receipt = scenarioGet("receipts.audit_certificate");
    if (!receipt) return alert("No receipt yet. Run Engine first.");
    downloadJSON("audit_certificate.json", receipt);
  });
}

const btnScenario = document.getElementById("btnScenario");
if (btnScenario) {
  btnScenario.addEventListener("click", () => {
    const s = getOrCreateScenario();
    downloadJSON("scenario.json", s);
  });
}

const fileInput = document.getElementById("fileInput");
if (fileInput) {
  fileInput.addEventListener("change", (e) => {
    listFiles(e.target.files);
  });
}

renderStatus();
