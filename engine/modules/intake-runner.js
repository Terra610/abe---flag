// intake/runner.js
// Intake runner: ensures inputs.intake exists (deterministic, local-only).
// If UI already built inputs.intake, we keep it. Otherwise generate a minimal default.

export async function run(scenario, ctx = {}) {
  const existing = scenario?.inputs?.intake || null;
  if (existing) return existing;

  const meta = scenario?.inputs?.intake_files_meta || [];
  return {
    module: "INTAKE",
    module_version: "1.0",
    generated_at: new Date().toISOString(),
    local_only: true,
    notes: "Default intake artifact created by intake/runner.js (no user UI action).",
    files_meta: meta,
    extracted_texts: {},
    pasted_text: ""
  };
}
