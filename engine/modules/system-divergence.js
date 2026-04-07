// system/divergence.js
// Plain-language constitutional + integrity summary
// This is descriptive only. It is not legal advice.

(function () {
  function modStatusSummary(key, label, mod) {
    if (!mod) return `${label}: not included in this audit report.`;

    const s = (mod.status || '').toLowerCase();
    const msg = (mod.message || '').trim();

    let headline;
    if (s === 'ok') {
      headline = `${label}: ✅ files present, hash-stable, and passed basic checks.`;
    } else if (s === 'warn') {
      headline = `${label}: ⚠️ files present but with warnings that need human review.`;
    } else if (s === 'bad') {
      headline = `${label}: ❌ failed one or more checks (missing, unreadable, or inconsistent).`;
    } else {
      headline = `${label}: status unknown in this audit.`;
    }

    if (msg) {
      return `${headline}\n  · Detail: ${msg}`;
    }
    return headline;
  }

  function buildSummary(report) {
    const modules = report && report.modules ? report.modules : {};
    const lines = [];

    // framing
    lines.push(
      'This is an automated, plain-language summary based on the A.B.E. integrity audit you just ran.',
      'It describes what the files say about constitutional alignment and funding structure, but it is not legal advice.'
    );

    // Core path
    lines.push(
      '',
      'Core constitutional-to-economic pipeline (CAE/CDA → CDI → CIRI → CIBS → CII):'
    );

    lines.push(
      '• CAE / CDA — alignment & divergence models',
      '  · CAE maps what the law actually authorizes.',
      '  · CDA turns real-world practices (stops, licensing, funding conditions) into divergence flags.',
      modStatusSummary('cae', 'CAE alignment model', modules.cae),
      modStatusSummary('cda', 'CDA divergence analyzer', modules.cda)
    );

    lines.push(
      '',
      '• CDI — Constitutional Divergence Index (0–1 signal for how far practice drifts from controlling law):',
      modStatusSummary('cdi', 'CDI divergence data', modules.cdi)
    );

    lines.push(
      '',
      '• CIRI — Integrity ROI Engine (economic harm and recovery):',
      modStatusSummary('ciri', 'CIRI inputs', modules.ciri)
    );

    lines.push(
      '',
      '• CIBS / CII — how recovered value is allocated and what it buys on the ground:',
      modStatusSummary('cibs', 'CIBS allocation file', modules.cibs),
      modStatusSummary('cii', 'CII portfolio model', modules.cii || {})
    );

    // Funding + credit layer
    lines.push(
      '',
      'Funding and credit integrity layer (CFF, AFFE, CCRI):',
      modStatusSummary('cff', 'CFF funding forensics input', modules.cff),
      modStatusSummary('affe', 'AFFE explorer module', modules.affe),
      modStatusSummary('ccri', 'CCRI credit-risk integrity scenarios', modules.ccri)
    );

    // Integrity + hash trail
    lines.push(
      '',
      'Audit and hash trail:',
      '• Integration recomputed SHA-256 hashes for each artifact and kept everything local in your browser.',
      '• The audit_id and generated_at timestamp form a cryptographic receipt you can attach to motions, reports, or research.'
    );

    // gentle closing
    lines.push(
      '',
      'Next step is human: use the CAE/CDA/CDI materials to explain *why* a practice diverges, and the CIRI/CIBS/CII outputs to show *what that divergence costs* in real-world terms.'
    );

    return lines.join('\n');
  }

  // Public hook
  window.renderDivergenceSummary = function (report) {
    const el = document.getElementById('divergence-summary');
    if (!el) return;
    try {
      el.textContent = buildSummary(report);
    } catch (e) {
      el.textContent =
        'Could not generate summary from this audit report. (Parser error: ' +
        e.message +
        ')';
    }
  };
})();
