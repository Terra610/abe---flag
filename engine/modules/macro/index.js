// engine/modules/macro/index.js
// Macro Cascade Module - Self-contained (logic + UI section)
// Last in firing order - shows national / global ripple effects

import { getOrCreateScenario, writeDerived, setModuleStatus } from "../core/session.js";

export async function run(scenario) {
  const s = scenario || getOrCreateScenario();

  const divergence = s.derived?.divergence || {};
  const ciri = s.derived?.ciri || {};

  // Core Macro Cascade Logic (your original formulas preserved)
  const cascade = {
    module: "MACRO",
    generated_at: new Date().toISOString(),
    base_divergence: divergence.divergence_01 || 0,
    sigma_divergence: divergence.divergence_sigma || 2,
    constitutional_capital: (ciri.constitutional_capital_unlocked || 0) * 1.8, // your multiplier
    national_impact: {
      savings_5yr: (ciri.constitutional_capital_unlocked || 0) * 5,
      jobs_created: Math.round((ciri.constitutional_capital_unlocked || 0) * 0.0008), // rough jobs per $M
      gdp_uplift: (ciri.constitutional_capital_unlocked || 0) * 2.3
    },
    notes: "Macro cascade shows butterfly effect from local realignment"
  };

  writeDerived("macro", cascade);
  setModuleStatus("macro", "OK", "Macro cascade calculated");

  return cascade;
}

// Self-contained UI for Macro module
export function renderUI(container) {
  container.innerHTML = `
    <div class="module-box">
      <h2>Macro Cascade — National & Global Ripple</h2>
      <p>This module shows the butterfly effect of realignment across the country.</p>
      
      <button id="run-macro">Run Macro Cascade</button>
      
      <div id="macro-result" style="margin-top: 1rem; white-space: pre-wrap;"></div>
    </div>
  `;

  const btn = container.querySelector('#run-macro');
  const resultDiv = container.querySelector('#macro-result');

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    btn.textContent = 'Running...';

    const scenario = getOrCreateScenario();
    const result = await run(scenario);

    resultDiv.innerHTML = `
      <strong>Macro Results:</strong><br>
      Base Divergence: ${result.base_divergence.toFixed(2)}<br>
      Sigma Divergence: ${result.sigma_divergence.toFixed(1)}σ<br>
      Constitutional Capital: $${(result.constitutional_capital / 1e9).toFixed(1)}B<br>
      5-Year Savings: $${(result.national_impact.savings_5yr / 1e9).toFixed(1)}B<br>
      Estimated Jobs: ${result.national_impact.jobs_created.toLocaleString()}<br>
      GDP Uplift: $${(result.national_impact.gdp_uplift / 1e9).toFixed(1)}B
    `;

    btn.disabled = false;
    btn.textContent = 'Run Macro Cascade';
  });
}
