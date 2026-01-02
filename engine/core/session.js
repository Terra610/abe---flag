// engine/core/session.js
// ABE Flag - Canonical Scenario Bus (Local-only)
// No backend, no telemetry, no accounts. WebCrypto SHA-256 receipts.

export const SCENARIO_KEY = "ABE_FLAG_SCENARIO_V1";

export function loadScenario() {
  try {
    const raw = localStorage.getItem(SCENARIO_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error("Failed to load scenario:", e);
    return null;
  }
}

export function createScenario() {
  return {
    engine: {
      id: "ABE",
      name: "ABE Flag",
      version: "1.0"
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    inputs: {},
    derived: {},
    module_status: {},
    hashes: {},
    receipts: {}
  };
}

export function getOrCreateScenario() {
  let s = loadScenario();
  if (!s) {
    s = createScenario();
    saveScenario(s);
  }
  return s;
}

export function saveScenario(scenario) {
  scenario.updated_at = new Date().toISOString();
  localStorage.setItem(SCENARIO_KEY, JSON.stringify(scenario, null, 2));
}

export function resetScenario() {
  localStorage.removeItem(SCENARIO_KEY);
  return getOrCreateScenario();
}

// ---------- Path helpers ----------
function getByPath(obj, path) {
  const parts = path.split(".");
  let cur = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object" || !(p in cur)) return undefined;
    cur = cur[p];
  }
  return cur;
}

function setByPath(obj, path, value) {
  const parts = path.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (!(p in cur) || typeof cur[p] !== "object" || cur[p] === null) cur[p] = {};
    cur = cur[p];
  }
  cur[parts[parts.length - 1]] = value;
}

export function scenarioGet(path) {
  const s = getOrCreateScenario();
  return getByPath(s, path);
}

export function scenarioSet(path, value) {
  const s = getOrCreateScenario();
  setByPath(s, path, value);
  saveScenario(s);
}

// ---------- Status helpers ----------
export function setModuleStatus(moduleKey, status, notes = "", extra = {}) {
  const s = getOrCreateScenario();
  s.module_status[moduleKey] = {
    status, // OK | WARN | FAIL | SKIP | PENDING | RUNNING
    notes,
    generated_at: new Date().toISOString(),
    ...extra
  };
  saveScenario(s);
}

export function writeDerived(moduleKey, outputObj) {
  const s = getOrCreateScenario();
  s.derived[moduleKey] = outputObj;
  setModuleStatus(moduleKey, "OK");
  saveScenario(s);
}

// ---------- Hashing ----------
export async function sha256String(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function hashObject(obj) {
  const text = JSON.stringify(obj);
  return sha256String(text);
}

export async function storeHash(name, objOrString) {
  const s = getOrCreateScenario();
  const h = typeof objOrString === "string" ? await sha256String(objOrString) : await hashObject(objOrString);
  s.hashes[name] = h;
  saveScenario(s);
  return h;
}

// ---------- Download helpers ----------
export function downloadText(filename, text, mime = "application/json") {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function downloadJSON(filename, obj) {
  downloadText(filename, JSON.stringify(obj, null, 2), "application/json");
}
