// engine/modules/intake/index.js
// Intake — Entry Point Module
// Self-contained (logic + UI)
// Turns raw documents/text into structured inputs.intake artifact

import { getOrCreateScenario, writeDerived, setModuleStatus } from "../core/session.js";

export async function run(scenario, ctx = {}) {
  const s = scenario || getOrCreateScenario();

  // If intake already exists, respect it
  if (s.inputs?.intake) {
    setModuleStatus("intake", "OK", "Existing intake artifact used");
    return s.inputs.intake;
  }

  // Default / fallback intake artifact
  const intakeArtifact = {
    module: "INTAKE",
    module_version: "1.0",
    generated_at: new Date().toISOString(),
    local_only: true,
    notes: "Intake artifact created from user input or default",
    files_meta: ctx.files_meta || [],
    extracted_texts: ctx.extracted_texts || {},
    pasted_text: ctx.pasted_text || "",
    doc_type: ctx.doc_type || "generic",
    targets: ctx.targets || ["CDA", "CIRI"],
    raw_input_hash: ctx.raw_input_hash || null
  };

  s.inputs.intake = intakeArtifact;
  writeDerived("intake", intakeArtifact);
  setModuleStatus("intake", "OK", "Intake artifact generated");

  return intakeArtifact;
}

// Self-contained UI for Intake module
export function renderUI(container) {
  container.innerHTML = `
    <div class="module-box">
      <h2>Intake — Document & Text Entry</h2>
      <p>Upload documents or paste text. Everything stays local.</p>
      
      <input type="file" id="file-input" multiple accept=".pdf,.txt,.png,.jpg,.jpeg">
      <textarea id="text-input" placeholder="Or paste text here..."></textarea>
      
      <select id="doc-type">
        <option value="generic">Generic Document</option>
        <option value="traffic_ticket">Traffic Ticket</option>
        <option value="court_order">Court Order / Protection Order</option>
        <option value="eviction_notice">Eviction Notice</option>
        <option value="loan_contract">Loan / Credit Document</option>
      </select>
      
      <button id="run-intake">Run Intake</button>
      
      <div id="intake-result" style="margin-top: 1.5rem; white-space: pre-wrap;"></div>
    </div>
  `;

  const fileInput = container.querySelector('#file-input');
  const textInput = container.querySelector('#text-input');
  const docType = container.querySelector('#doc-type');
  const btn = container.querySelector('#run-intake');
  const resultDiv = container.querySelector('#intake-result');

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    btn.textContent = 'Processing...';

    const files = Array.from(fileInput.files || []);
    const pasted = textInput.value || '';

    const ctx = {
      files_meta: files.map(f => ({ name: f.name, type: f.type })),
      pasted_text: pasted,
      doc_type: docType.value
    };

    const scenario = getOrCreateScenario();
    const result = await run(scenario, ctx);

    resultDiv.innerHTML = `
      <strong>Intake Complete</strong><br>
      Doc Type: ${result.doc_type}<br>
      Text Length: ${result.pasted_text.length} characters<br>
      Targets: ${result.targets.join(', ')}<br>
      Generated at: ${result.generated_at}
    `;

    btn.disabled = false;
    btn.textContent = 'Run Intake';
  });
}
