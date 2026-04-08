// engine/modules/ccri/index.js
// CCRI — Credit & Collateral Integrity
// Self-contained

import { getOrCreateScenario, writeDerived, setModuleStatus } from "../core/session.js";

export async function run(scenario) {
  const s = scenario || getOrCreateScenario();
  const divergence = s.derived?.divergence || {};

  const ccriOutput = {
    module: "CCRI",
    module_version: "1.0",
    generated_at: new Date().toISOString(),
    credit_integrity_score_01: 1 - (divergence.creditAccess || 0),
    sigma_credit: 4 - (divergence.divergence_sigma || 2),
    harm_from_denials: (divergence.creditAccess || 0) * 8500,
    notes: "Evaluates constitutional violations in creditworthiness and extensions of credit."
  };

  writeDerived("ccri", ccriOutput);
  setModuleStatus("ccri", "OK", "Credit integrity analysis complete");

  return ccriOutput;
}

export function renderUI(container) {
  container.innerHTML = `
    <div class="module-box">
      <h2>CCRI — Credit & Collateral Integrity</h2>
      <p>Analyzes constitutional violations in credit denials, underwriting, foreclosures, and extensions of credit.</p>
      
      <button id="run-ccri">Run Credit Integrity Analysis</button>
      
      <div id="ccri-result" style="margin-top: 1.5rem; white-space: pre-wrap;"></div>
    </div>
  `;

  const btn = container.querySelector('#run-ccri');
  const resultDiv = container.querySelector('#ccri-result');

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    btn.textContent = 'Analyzing...';

    const scenario = getOrCreateScenario();
    const result = await run(scenario);

    let html = `<strong>CCRI Results</strong><br><br>`;
    html += `Credit Integrity Score: ${result.credit_integrity_score_01.toFixed(2)}<br>`;
    html += `Sigma: ${result.sigma_credit.toFixed(1)}σ<br>`;
    html += `Estimated Harm from Denials: $${(result.harm_from_denials / 1000).toFixed(0)}K`;

    resultDiv.innerHTML = html;

    btn.disabled = false;
    btn.textContent = 'Run Credit Integrity Analysis';
  });
}
