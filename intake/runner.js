// intake/runner.js
// Intake runner: captures file metadata + optional raw text (small) into scenario.inputs.intake
// Local-only. No uploads. Keeps privacy intact.

export async function run(scenario, ctx = {}) {
  const files = ctx?.files ? Array.from(ctx.files) : [];

  const files_meta = files.map(f => ({
    name: f.name,
    size: f.size,
    type: f.type,
    lastModified: f.lastModified
  }));

  // Minimal intake artifact. We are NOT reading file contents yet (OCR later).
  // This satisfies the dependency chain without leaking data.
  const out = {
    module: "INTAKE",
    module_version: "1.0",
    generated_at: new Date().toISOString(),
    files_meta,
    notes:
      "Intake runner stored file metadata only. OCR/table extraction can be added later while staying local-only."
  };

  return out;
}
