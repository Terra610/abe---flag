// engine/modules/cae/index.js
// CAE — Constitutional Authority Evaluator
// Self-contained (logic + UI)

import { getOrCreateScenario, writeDerived, setModuleStatus } from "../core/session.js";

export async function run(scenario) {
  const s = scenario || getOrCreateScenario();
  const divergence = s.derived?.divergence || {};

  const caeOutput = {
    module: "CAE",
    module_version: "1.0",
    generated_at: new Date().toISOString(),
    authority_score_01: 1 - (divergence.divergence_01 || 0),
    authority_sigma: 4 - (divergence.divergence_sigma || 2),
    authority_level: getAuthorityLevel(1 - (divergence.divergence_01 || 0)),
    notes: "Evaluates whether actions are within constitutional authority bounds."
  };

  writeDerived("cae", caeOutput);
  setModuleStatus("cae", "OK", "Constitutional authority evaluation complete");

  return caeOutput;
}

function getAuthorityLevel(score) {
  if (score >= 0.9) return "Strong Constitutional Authority";
  if (score >= 0.7) return "Moderate Authority";
  if (score >= 0.5) return "Questionable Authority";
  return "Likely Ultra Vires";
}

export function renderUI(container) {
  container.innerHTML = `
    <div class="module-box">
      <h2>CAE — Constitutional Authority Evaluator</h2>
      <p>Checks whether government actions or regulations stay within constitutional authority.</p>
      
      <button id="run-cae">Run Authority Evaluation</button>
      
      <div id="cae-result" style="margin-top: 1.5rem; white-space: pre-wrap;"></div>
    </div>
  `;

  const btn = container.querySelector('#run-cae');
  const resultDiv = container.querySelector('#cae-result');

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    btn.textContent = 'Evaluating...';

    const scenario = getOrCreateScenario();
    const result = await run(scenario);

    let html = `<strong>CAE Results</strong><br><br>`;
    html += `Authority Score (0-1): ${result.authority_score_01.toFixed(2)}<br>`;
    html += `Sigma Authority: ${result.authority_sigma.toFixed(1)}σ<br>`;
    html += `Authority Level: ${result.authority_level}<br><br>`;
    html += `Note: High authority score means actions are likely constitutional.`;

    resultDiv.innerHTML = html;

    btn.disabled = false;
    btn.textContent = 'Run Authority Evaluation';
  });
      }
