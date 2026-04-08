// engine/modules/doctrines/index.js
// Doctrines — Core Constitutional Doctrines + New Discipline

import { getOrCreateScenario, writeDerived, setModuleStatus } from "../core/session.js";
import { ConstitutionalSystemsEngineering, ABE_GUARDRAIL } from "../constitutional-systems-engineering.js";

export async function run(scenario) {
  const doctrinesOutput = {
    module: "DOCTRINES",
    generated_at: new Date().toISOString(),
    core_doctrines: ["Ultra Vires", "Void Ab Initio", "Hierarchy of Law", "Commerce Clause Limits"],
    new_discipline: ConstitutionalSystemsEngineering.name,
    guardrail_active: true,
    guardrail_text: ABE_GUARDRAIL.substring(0, 300) + "...",
    notes: "Constitutional Systems Engineering formally attached as the new discipline."
  };

  writeDerived("doctrines", doctrinesOutput);
  setModuleStatus("doctrines", "OK", "Doctrines and new discipline loaded");

  return doctrinesOutput;
}

export function renderUI(container) {
  container.innerHTML = `
    <div class="module-box">
      <h2>Doctrines & Constitutional Systems Engineering</h2>
      <button id="run-doctrines">Load Doctrines</button>
      <div id="doctrines-result" style="margin-top: 1rem;"></div>
    </div>
  `;

  const btn = container.querySelector('#run-doctrines');
  const resultDiv = container.querySelector('#doctrines-result');

  btn.addEventListener('click', async () => {
    const result = await run(getOrCreateScenario());
    resultDiv.innerHTML = `New Discipline: ${result.new_discipline}<br>Guardrail: Active`;
  });
    }
