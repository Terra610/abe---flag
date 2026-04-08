// engine/modules/affe/index.js
// AFFE — American Funding & Fidelity Explorer
// Self-contained (logic + UI + parser)

import { getOrCreateScenario, writeDerived, setModuleStatus } from "../core/session.js";

export async function run(scenario) {
  const s = scenario || getOrCreateScenario();
  const divergence = s.derived?.divergence || {};

  // Parser step - processes raw funding data
  const parsedFunding = parseFundingData(s.inputs?.intake || {});

  const affeOutput = {
    module: "AFFE",
    generated_at: new Date().toISOString(),
    funding_fidelity: {
      on_mission_percentage: parsedFunding.onMissionPct || 0.62,
      off_mission_percentage: parsedFunding.offMissionPct || 0.38,
      unclear_percentage: parsedFunding.unclearPct || 0.00
    },
    parsed_data_summary: parsedFunding.summary,
    divergence_01: divergence.divergence_01 || 0,
    divergence_sigma: divergence.divergence_sigma || 2,
    notes: "Funding classified as on-mission vs off-mission. Off-mission spending is the primary source of constitutional capital."
  };

  writeDerived("affe", affeOutput);
  setModuleStatus("affe", "OK", "Funding fidelity analysis complete");

  return affeOutput;
}

// Parser functionality (moved from old affe-parser.js)
function parseFundingData(intakeData) {
  const text = intakeData?.text_normalized || intakeData?.pasted_text || "";

  // Simple heuristic parser for funding classification
  const onMissionKeywords = /constitution|authorized|public safety|infrastructure|education|health/i;
  const offMissionKeywords = /private|commercial|subsidy|grant|ethanol|corporate/i;

  const onMissionMatches = (text.match(onMissionKeywords) || []).length;
  const offMissionMatches = (text.match(offMissionKeywords) || []).length;

  const totalMatches = onMissionMatches + offMissionMatches || 1;

  return {
    onMissionPct: Math.round((onMissionMatches / totalMatches) * 100) / 100,
    offMissionPct: Math.round((offMissionMatches / totalMatches) * 100) / 100,
    unclearPct: 0.00,
    summary: `Parsed ${onMissionMatches} on-mission and ${offMissionMatches} off-mission indicators from intake text.`
  };
}

export function renderUI(container) {
  container.innerHTML = `
    <div class="module-box">
      <h2>AFFE — American Funding & Fidelity Explorer</h2>
      <p>Analyzes whether public funds are being used in alignment with constitutional authority (on-mission) or diverted off-mission.</p>
      
      <button id="run-affe">Run Funding Fidelity Analysis</button>
      
      <div id="affe-result" style="margin-top: 1.5rem; white-space: pre-wrap; font-family: monospace;"></div>
    </div>
  `;

  const btn = container.querySelector('#run-affe');
  const resultDiv = container.querySelector('#affe-result');

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    btn.textContent = 'Analyzing Funding...';

    const scenario = getOrCreateScenario();
    const result = await run(scenario);

    let html = `<strong>AFFE Results</strong><br><br>`;
    html += `On-Mission Funding: ${(result.funding_fidelity.on_mission_percentage * 100).toFixed(0)}%<br>`;
    html += `Off-Mission Funding: ${(result.funding_fidelity.off_mission_percentage * 100).toFixed(0)}%<br>`;
    html += `Divergence (0-1): ${result.divergence_01.toFixed(2)}<br>`;
    html += `Sigma Divergence: ${result.divergence_sigma.toFixed(1)}σ<br><br>`;
    html += `Note: Off-mission spending is the primary recoverable constitutional capital.`;

    resultDiv.innerHTML = html;

    btn.disabled = false;
    btn.textContent = 'Run Funding Fidelity Analysis';
  });
}
