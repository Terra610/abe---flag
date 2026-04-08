// engine/modules/intake.js
// Intake Module - Pure engine logic
// Runs entirely in-browser. No network calls. Produces inputs.intake artifact.

import { getOrCreateScenario, writeDerived, setModuleStatus } from "../core/session.js";

export async function run(scenario = null, ctx = {}) {
  const s = scenario || getOrCreateScenario();

  // If intake already exists in the scenario, respect it
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
    notes: "Default intake artifact created by intake.js (no user-provided data)",
    files_meta: ctx.files_meta || [],
    extracted_texts: {},
    pasted_text: ctx.pasted_text || "",
    doc_type: ctx.doc_type || "generic",
    targets: ctx.targets || ["CDA", "CIRI"],
    raw_input_hash: ctx.raw_input_hash || null
  };

  // Store in scenario
  s.inputs.intake = intakeArtifact;
  writeDerived("intake", intakeArtifact);
  setModuleStatus("intake", "OK", "Default intake artifact generated");

  return intakeArtifact;
}

// Optional helper: create intake from raw text (useful for UI layer)
export function createIntakeFromText(text, docType = "generic", targets = ["CDA", "CIRI"]) {
  return {
    module: "INTAKE",
    module_version: "1.0",
    generated_at: new Date().toISOString(),
    local_only: true,
    notes: "Intake created from pasted/raw text",
    extracted_texts: {
      main: text || ""
    },
    pasted_text: text || "",
    doc_type: docType,
    targets: targets,
    raw_input_hash: null   // Can be filled by UI layer if needed
  };
}
