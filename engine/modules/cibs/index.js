// engine/modules/cibs/index.js
// CIBS — Community Budget & Integrity System
// Self-contained module (logic + UI)
// Takes CIRI outputs and allocates constitutional capital into community priorities

import { getOrCreateScenario, writeDerived, setModuleStatus } from "../core/session.js";

export async function run(scenario) {
  const s = scenario || getOrCreateScenario();

  const ciri = s.derived?.ciri || {};
  const divergence = s.derived?.divergence || {};

  // Core CIBS Logic — Original formulas preserved + new allocation
  const allocation = {
    module: "CIBS",
    module_version: "1.0",
    generated_at: new Date().toISOString(),
    constitutional_capital_unlocked: ciri.constitutional_capital_unlocked || 0,
    allocation_breakdown: {
      housing_restoration: Math.round((ciri.constitutional_capital_unlocked || 0) * 0.40),
      public_safety_realignment: Math.round((ciri.constitutional_capital_unlocked || 0) * 0.25),
      community_centers_youth: Math.round((ciri.constitutional_capital_unlocked || 0) * 0.15),
      local_job_training: Math.round((ciri.constitutional_capital_unlocked || 0) * 0.10),
      soil_health_agriculture: Math.round((ciri.constitutional_capital_unlocked || 0) * 0.05),
      legal_access_knowledge: Math.round((ciri.constitutional_capital_unlocked || 0) * 0.05)
    },
    notes: "Funds redirected from unconstitutional practices into true public benefit. No new taxes.",
    sigma_divergence: divergence.divergence_sigma || 2
  };

  writeDerived("cibs", allocation);
  setModuleStatus("cibs", "OK", "Community budget allocation completed");

  return allocation;
}

// Self-contained UI for CIBS module
export function renderUI(container) {
  container.innerHTML = `
    <div class="module-box">
      <h2>CIBS — Community Budget & Integrity System</h2>
      <p>Redirects recovered constitutional capital into real community priorities.</p>
      
      <button id="run-cibs">Run CIBS Allocation</button>
      
      <div id="cibs-result" style="margin-top: 1.5rem; white-space: pre-wrap; font-family: monospace;"></div>
    </div>
  `;

  const btn = container.querySelector('#run-cibs');
  const resultDiv = container.querySelector('#cibs-result');

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    btn.textContent = 'Allocating...';

    const scenario = getOrCreateScenario();
    const result = await run(scenario);

    let html = `<strong>CIBS Allocation Results</strong><br><br>`;
    html += `Constitutional Capital Unlocked: $${(result.constitutional_capital_unlocked / 1e9).toFixed(2)} Billion<br><br>`;
    html += `Breakdown:<br>`;

    for (const [key, value] of Object.entries(result.allocation_breakdown)) {
      html += `• ${key.replace(/_/g, ' ').toUpperCase()}: $${(value / 1e9).toFixed(2)}B<br>`;
    }

    html += `<br>Sigma Divergence: ${result.sigma_divergence.toFixed(1)}σ<br>`;
    html += `Note: Funds come from ending unconstitutional practices — no new taxes.`;

    resultDiv.innerHTML = html;

    btn.disabled = false;
    btn.textContent = 'Run CIBS Allocation';
  });
      }
