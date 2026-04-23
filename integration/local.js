import { runIntegration } from "/abe---flag/integration/orchestrator.js";
import { explainIntegration } from "/abe---flag/integration/explain_runner.js";

function safeParse(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function readFirst(keys) {
  for (const key of keys || []) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    const parsed = safeParse(raw);
    if (parsed) return { key, value: parsed };
  }
  return null;
}

function set(id, txt, cls) {
  const el = document.getElementById(id);
  el.textContent = txt;
  el.className = cls ? "num " + cls : "num";
}

function fmt(v, digits = 6) {
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(digits) : "—";
}

function money(v) {
  const n = Number(v);
  return Number.isFinite(n)
    ? "$" + n.toLocaleString(undefined, { maximumFractionDigits: 0 })
    : "—";
}

function createDownload(filename, mime, content) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

let lastArtifact = null;

function paintArtifact(artifact) {
  lastArtifact = artifact;

  const phi = artifact?.phi_inputs || {};
  const sig = artifact?.signature_formula || {};
  const aggregate = artifact?.aggregate || {};

  set("k-cdi", fmt(phi.CDI), Number(phi.CDI) > 0 ? "ok" : "warn");
  set("k-ciri", fmt(phi.CIRI), Number(phi.CIRI) > 0 ? "ok" : "warn");
  set("k-cibs", money(phi.CIBS), Number(phi.CIBS) > 0 ? "ok" : "warn");
  set("k-cii", fmt(phi.CII), Number(phi.CII) > 0 ? "ok" : "warn");
  set("k-abe", fmt(sig.value), sig.value != null ? "ok" : "bad");

  document.getElementById("phi-preview").textContent = JSON.stringify(phi, null, 2);
  document.getElementById("artifact-preview").textContent = JSON.stringify(artifact, null, 2);

  const explanation = explainIntegration(artifact);
  document.getElementById("explain").innerHTML =
    "<ul>" + (explanation.lines || []).map(line => `<li>${line}</li>`).join("") + "</ul>";

  document.getElementById("aggregate-preview").textContent =
    JSON.stringify(aggregate, null, 2);

  document.getElementById("btn-json").disabled = false;
}

async function boot() {
  try {
    await fetch("/abe---flag/integration/model.json", { cache: "no-store" }).then(r => {
      if (!r.ok) throw new Error("integration/model.json: HTTP " + r.status);
      return r.json();
    });
    set("k-model", "OK", "ok");

    const existing = readFirst([
      "ABE_INTEGRATION_ARTIFACT_V1",
      "abe_integration_artifact",
      "ABE_AUDIT_RECEIPT_V1"
    ]);

    if (existing) {
      paintArtifact(existing.value);
      document.getElementById("diag").textContent = "Existing integration artifact loaded from localStorage.";
    } else {
      document.getElementById("diag").textContent = "No integration artifact found yet. Press Run Integration.";
    }
  } catch (e) {
    set("k-model", "ERR", "bad");
    document.getElementById("diag").textContent = e.message || String(e);
  }
}

document.getElementById("btn-run").onclick = async () => {
  try {
    document.getElementById("diag").textContent = "Running integration...";
    const result = await runIntegration();
    paintArtifact(result.artifact);
    document.getElementById("diag").textContent = "Integration completed successfully.";
  } catch (e) {
    console.error(e);
    document.getElementById("diag").textContent = e.message || String(e);
    document.getElementById("artifact-preview").textContent = "Integration failed.";
  }
};

document.getElementById("btn-json").onclick = () => {
  if (!lastArtifact) return;
  createDownload(
    "ABE_INTEGRATION_ARTIFACT_V1.json",
    "application/json",
    JSON.stringify(lastArtifact, null, 2)
  );
};

boot();
