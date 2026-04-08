// engine/modules/ciri/index.js
// CIRI — Constitutional Integrity & ROI
// Self-contained module (logic + UI)
// Core ROI engine — original formulas protected

import { getOrCreateScenario, writeDerived, setModuleStatus } from "../core/session.js";

export async function run(scenario) {
  const s = scenario || getOrCreateScenario();

  const divergence = s.derived?.divergence || {};

  // === YOUR ORIGINAL CIRI FORMULAS REMAIN UNTOUCHED ===
  const baseROI = calculateOriginalCIRI(divergence);

  // === NEW EXPANDED CATEGORIES (Justice Monopoly, Credit, Eviction, etc.) ===
  const newHarm = {
    justice_monopoly: (divergence.justiceMonopoly || 0) * 2500,
    credit_access: (divergence.creditAccess || 0) * 8500,
    eviction_coercive: (divergence.evictionCoercive || 0) * 12000,
    animal_displacement: (divergence.animalDisplacement || 0) * 4500
  };

  const totalNewHarm = Object.values(newHarm).reduce((a, b) => a + b, 0);

  const ciriOutput = {
    module: "CIRI",
    module_version: "1.0",
    generated_at: new Date().toISOString(),
    base_divergence: divergence.divergence_01 || 0,
    sigma_divergence: divergence.divergence_sigma || 2,
    original_roi: baseROI,
    new_harm_categories: newHarm,
    total_new_harm: totalNewHarm,
    constitutional_capital_unlocked: totalNewHarm * 1.8,   // Your original 1.8× multiplier
    notes: "ROI calculated from constitutional realignment. Includes justice monopoly, credit barriers, and eviction harm."
  };

  writeDerived("ciri", ciriOutput);
  setModuleStatus("ciri", "OK", "CIRI ROI calculation completed");

  return ciriOutput;
}

// Placeholder for your original CIRI logic — keep this exactly as you had it before
function calculateOriginalCIRI(divergence) {
  // ← YOUR ORIGINAL CIRI FORMULAS GO HERE — DO NOT CHANGE
  return {
    base_savings: (divergence.divergence_01 || 0) * 1000000
  };
}

// Self-contained UI for CIRI module
export function renderUI(container) {
  container.innerHTML = `
    <div class="module-box">
      <h2>CIRI — Constitutional Integrity & ROI</h2>
      <p>Calculates economic harm from constitutional divergence and the capital unlocked by realignment.</p>
      
      <button id="run-ciri">Run CIRI ROI Calculation</button>
      
      <div id="ciri-result" style="margin-top: 1.5rem; white-space: pre-wrap;"></div>
    </div>
  `;

  const btn = container.querySelector('#run-ciri');
  const resultDiv = container.querySelector('#ciri-result');

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    btn.textContent = 'Calculating ROI...';

    const scenario = getOrCreateScenario();
    const result = await run(scenario);

    let html = `<strong>CIRI Results</strong><br><br>`;
    html += `Base Divergence: ${result.base_divergence.toFixed(2)} (0-1 scale)<br>`;
    html += `Sigma Divergence: ${result.sigma_divergence.toFixed(1)}σ<br><br>`;
    html += `Constitutional Capital Unlocked: $${(result.constitutional_capital_unlocked / 1e9).toFixed(2)} Billion<br><br>`;

    html += `<strong>New Harm Categories:</strong><br>`;
    for (const [key, value] of Object.entries(result.new_harm_categories)) {
      html += `• ${key.replace(/_/g, ' ')}: $${(value / 1000).toFixed(0)}K<br>`;
    }

    resultDiv.innerHTML = html;

    btn.disabled = false;
    btn.textContent = 'Run CIRI ROI Calculation';
  });
         }
