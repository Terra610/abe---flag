export function explainIntegration(artifact) {
  if (!artifact || typeof artifact !== "object") {
    return {
      ok: false,
      summary: "No integration artifact is available.",
      lines: []
    };
  }

  const phi = artifact.phi_inputs || {};
  const sig = artifact.signature_formula || {};
  const aggregate = artifact.aggregate || {};

  const lines = [
    `Core order: ${(artifact.cli_execution_order || []).join(" -> ")}`,
    `Phi inputs: CDI=${phi.CDI ?? "—"}, CIRI=${phi.CIRI ?? "—"}, CIBS=${phi.CIBS ?? "—"}, CII=${phi.CII ?? "—"}`,
    `Signature: numerator=${sig.numerator ?? "—"}, denominator=${sig.denominator ?? "—"}, value=${sig.value ?? "—"}`,
    `Impacted population: ${aggregate.total_impacted_population ?? "—"}`,
    `Recovery total: ${aggregate.total_constitutional_capital_recovery_usd ?? "—"}`
  ];

  return {
    ok: true,
    summary: "Integration artifact explained successfully.",
    lines
  };
}
