// integration/orchestrator.js
// ABE Flag Orchestrator (Run Engine)

import {
  getOrCreateScenario,
  saveScenario
} from "../engine/core/session.js";

async function loadManifest() {
  const res = await fetch("../engine/core/engine.json");
  return res.json();
}

function renderStatus(scenario) {
  const el = document.getElementById("engine-status");
  el.innerHTML = "";

  Object.entries(scenario.module_status).forEach(([key, val]) => {
    const row = document.createElement("div");
    row.textContent = `${key}: ${val.status}`;
    el.appendChild(row);
  });
}

async function runEngine() {
  const scenario = getOrCreateScenario();
  const manifest = await loadManifest();

  // Initialize module status
  manifest.firing_order.forEach(key => {
    if (!scenario.module_status[key]) {
      scenario.module_status[key] = {
        status: "PENDING",
        generated_at: new Date().toISOString()
      };
    }
  });

  saveScenario(scenario);
  renderStatus(scenario);

  alert("Engine initialized. Orchestration spine is live.");
}

window.runEngine = runEngine;
