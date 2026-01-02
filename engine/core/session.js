// engine/core/session.js
// Canonical Scenario Bus for ABE Flag
// Local-only, no backend, no telemetry

const SCENARIO_KEY = "ABE_FLAG_SCENARIO_V1";

/**
 * Load scenario from localStorage
 */
export function loadScenario() {
  try {
    const raw = localStorage.getItem(SCENARIO_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error("Failed to load scenario:", e);
    return null;
  }
}

/**
 * Create a new blank scenario
 */
export function createScenario() {
  return {
    engine: {
      id: "ABE",
      name: "ABE Flag",
      version: "1.0"
    },
    created_at: new Date().toISOString(),
    inputs: {},
    derived: {},
    module_status: {},
    hashes: {}
  };
}

/**
 * Load or create scenario
 */
export function getOrCreateScenario() {
  let scenario = loadScenario();
  if (!scenario) {
    scenario = createScenario();
    saveScenario(scenario);
  }
  return scenario;
}

/**
 * Save scenario to localStorage
 */
export function saveScenario(scenario) {
  localStorage.setItem(SCENARIO_KEY, JSON.stringify(scenario, null, 2));
}

/**
 * Write a derived module output
 */
export function writeDerived(moduleKey, output) {
  const scenario = getOrCreateScenario();
  scenario.derived[moduleKey] = output;
  scenario.module_status[moduleKey] = {
    status: "OK",
    generated_at: new Date().toISOString()
  };
  saveScenario(scenario);
}

/**
 * Mark module status
 */
export function setModuleStatus(moduleKey, status, notes = "") {
  const scenario = getOrCreateScenario();
  scenario.module_status[moduleKey] = {
    status,
    notes,
    generated_at: new Date().toISOString()
  };
  saveScenario(scenario);
}

/**
 * SHA-256 hash helper (string input)
 */
export async function sha256(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Hash and store artifact
 */
export async function hashAndStore(key, obj) {
  const scenario = getOrCreateScenario();
  const text = JSON.stringify(obj);
  const hash = await sha256(text);
  scenario.hashes[key] = hash;
  saveScenario(scenario);
  return hash;
}
