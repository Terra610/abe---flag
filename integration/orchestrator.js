// integration/orchestrator.js
// ABE Flag Orchestrator (Mode B): Run Engine in-order, local-only, receipts + hashes.

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
  // Ensure module_status exists
  s.module_status = s.module_status || {};
  saveScenario(s);
  renderStatus();
}

function setPendingFromManifest(manifest) {
  const s = getOrCreateScenario();
  for (const k of manifest.firing_order) {
    if (!s.module_status[k]) {
      s.module_status[k] = { status: "PENDING", generated_at: new Date().toISOString(), notes: "" };
    }
  }
  saveScenario(s);
}

function hasRequiredPaths(scenario, paths = []) {
  const missing = [];
  for (const p of paths) {
    const v = scenarioGet(p);
    if (v === undefined || v === null) missing.push(p);
  }
  return missing;
}

// Dynamic import runner; if missing, we SKIP.
async function loadRunner(runnerPath) {
  // runnerPath in manifest is relative to integration/ folder
  // Example: "../cda/runner.js"
  return import(runnerPath);
}

async function runEngine(files) {
  const manifest = await loadManifest();
  initScenario();
  setPendingFromManifest(manifest);
  renderStatus();

  // Save file metadata + optional file handling reference (no uploads anywhere).
  // If you later implement intake/runner.js, it can use scenario.inputs.intake_files_meta
  if (files && files.length) {
    const meta = Array.from(files).map(f => ({
      name: f.name,
      size: f.size,
      type: f.type,
      lastModified: f.lastModified
    }));
    scenarioSet("inputs.intake_files_meta", meta);
  }

  // Run modules in order
  for (const moduleKey of manifest.firing_order) {
    const cfg = manifest.modules[moduleKey] || {};
    const required = !!cfg.required;
    const requires = cfg.requires || [];
    const produces = cfg.produces || [];
    const runnerPath = cfg.runner;

    setModuleStatus(moduleKey, "RUNNING", "Running…");
    renderStatus();

    // Check required inputs
    const missing = hasRequiredPaths(getOrCreateScenario(), requires);
    if (missing.length) {
      const note = `Missing required inputs: ${missing.join(", ")}`;
      if (required) {
        setModuleStatus(moduleKey, "FAIL", note);
        renderStatus();
        break; // stop the engine on required failure
      } else {
        setModuleStatus(moduleKey, "SKIP", note);
        renderStatus();
        continue;
      }
    }

    if (!runnerPath) {
      const note = "No runner defined in manifest.";
      if (required) setModuleStatus(moduleKey, "FAIL", note);
      else setModuleStatus(moduleKey, "SKIP", note);
      renderStatus();
      if (required) break;
      continue;
    }

    // Load runner
    let mod;
    try {
      mod = await loadRunner(runnerPath);
    } catch (e) {
      const note = `Runner not found: ${runnerPath}`;
      if (required) setModuleStatus(moduleKey, "FAIL", note);
      else setModuleStatus(moduleKey, "SKIP", note);
      renderStatus();
      if (required) break;
      continue;
    }

    if (!mod.run || typeof mod.run !== "function") {
      const note = `Runner missing export: run(scenario, ctx)`;
      if (required) setModuleStatus(moduleKey, "FAIL", note);
      else setModuleStatus(moduleKey, "SKIP", note);
      renderStatus();
      if (required) break;
      continue;
    }

    // Execute runner
    try {
      const scenario = getOrCreateScenario();
      const out = await mod.run(scenario, { files });

      // Write output to produced paths
      // Convention: if produces has exactly one path, we store the runner output there.
      // If runner returns a map {path: value}, we store each.
      if (out && typeof out === "object" && !Array.isArray(out) && out.__writes && typeof out.__writes === "object") {
        // Advanced: runner returns { __writes: { "derived.x": {...}, ... } }
        for (const [p, v] of Object.entries(out.__writes)) {
          scenarioSet(p, v);
          await storeHash(p, v);
        }
      } else if (produces.length === 1) {
        scenarioSet(produces[0], out);
        await storeHash(produces[0], out);
      } else if (produces.length > 1 && out && typeof out === "object") {
        // If produces multiple, runner should return keyed object: { producedPath1: obj1, producedPath2: obj2 }
        for (const p of produces) {
          if (p in out) {
            scenarioSet(p, out[p]);
            await storeHash(p, out[p]);
          }
        }
      } else {
        // No produces configured; still hash a serialized output blob if present
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

  // Store receipt + hash it
  scenarioSet("receipts.audit_certificate", receipt);
  await storeHash("receipts.audit_certificate", receipt);

  // Show preview
  const pre = document.getElementById("receiptPreview");
  pre.textContent = JSON.stringify(receipt, null, 2);

  return receipt;
}

// UI hooks
document.getElementById("btnInit").addEventListener("click", () => {
  initScenario();
  alert("Scenario initialized.");
});

document.getElementById("btnReset").addEventListener("click", () => {
  resetScenario();
  renderStatus();
  document.getElementById("receiptPreview").textContent = "";
  alert("Scenario reset.");
});

document.getElementById("btnRun").addEventListener("click", async () => {
  const files = document.getElementById("fileInput").files;
  try {
    await runEngine(files);
  } catch (e) {
    alert(`Run failed: ${e?.message || e}`);
  }
});

document.getElementById("btnReceipt").addEventListener("click", () => {
  const receipt = scenarioGet("receipts.audit_certificate");
  if (!receipt) return alert("No receipt yet. Run Engine first.");
  downloadJSON("audit_certificate.json", receipt);
});

document.getElementById("btnScenario").addEventListener("click", () => {
  const s = getOrCreateScenario();
  downloadJSON("scenario.json", s);
});

document.getElementById("fileInput").addEventListener("change", (e) => {
  listFiles(e.target.files);
});

// Render on load
renderStatus();
