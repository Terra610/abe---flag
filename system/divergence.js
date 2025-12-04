// system/divergence.js
// Plain-language divergence explainer for A.B.E.
// Attach as window.abeDivergence.makeNarrative(...)

(function (global) {
  function money(n) {
    const v = Number(n);
    if (!isFinite(v)) return 'an unknown dollar amount';
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0
      }).format(v);
    } catch (_) {
      return '$' + Math.round(v).toLocaleString();
    }
  }

  function pct(x) {
    const v = Number(x);
    if (!isFinite(v)) return null;
    return (v * 100).toFixed(1) + '%';
  }

  /**
   * makeNarrative(opts)
   *
   * opts = {
   *   jurisdiction: 'Iowa',
   *   period: 'FY2024–2025',
   *   law_anchor: 'U.S. Const. Art. VI; 49 U.S.C. 31136; Iowa Code 80.9, 80.17',
   *   practice_summary: 'DPS used commercial-safety authority and funding to stop non-commercial drivers and suspend basic travel rights.',
   *
   *   modules: {
   *     ciri: {
   *       total_recovery: 1234567,
   *       roi_per_case: 89000,
   *       cases_affected: 15
   *     },
   *     cff: {
   *       on_mission_total: 1000000,
   *       off_mission_total: 800000,
   *       unclear_total: 200000
   *     },
   *     ccri: {
   *       scenarios: 1,
   *       high_risk_count: 1
   *     }
   *   }
   * }
   */
  function makeNarrative(opts) {
    const j = opts || {};
    const jurisdiction = j.jurisdiction || 'this jurisdiction';
    const period = j.period || 'the period analyzed';
    const lawAnchor = j.law_anchor || 'controlling federal law and the state’s own statutes';
    const practice = j.practice_summary ||
      'state actors applied transportation and enforcement rules beyond what the law actually permits.';

    const modules = j.modules || {};
    const ciri = modules.ciri || {};
    const cff  = modules.cff  || {};
    const ccri = modules.ccri || {};

    const parts = [];

    // 1. Opening: what went wrong, where, and under what law.
    parts.push(
      `In ${jurisdiction}, A.B.E. detected a constitutional divergence during ${period}. ` +
      `Under ${lawAnchor}, the government’s authority is limited. ` +
      `In practice, however, ${practice}`
    );

    // 2. Funding / CFF angle
    const offMission = Number(cff.off_mission_total || 0);
    const onMission  = Number(cff.on_mission_total || 0);
    const unclear    = Number(cff.unclear_total || 0);
    const totalCff   = offMission + onMission + unclear;

    if (totalCff > 0 && offMission > 0) {
      const share = totalCff > 0 ? pct(offMission / totalCff) : null;
      parts.push(
        `The Constitutional Funding Forensics engine (CFF) shows that approximately ` +
        `${money(offMission)} was spent on OFF_MISSION uses — activities that are not authorized ` +
        `by the grant’s own statute or appropriation language. ` +
        (share ? `That is about ${share} of the funding reviewed in this scenario.` : '')
      );
    }

    // 3. CIRI / economic harm angle
    if (isFinite(ciri.total_recovery)) {
      const cases = isFinite(ciri.cases_affected) ? ciri.cases_affected : null;
      const roi   = isFinite(ciri.roi_per_case) ? ciri.roi_per_case : null;

      let line = `The CIRI engine converts that divergence into measurable harm. ` +
                 `Based on the uploaded case data, the modeled recovery — the amount required ` +
                 `to make people and communities whole — is ${money(ciri.total_recovery)}.`;

      if (roi && cases) {
        line += ` That works out to about ${money(roi)} per case across ${cases} affected cases.`;
      }

      parts.push(line);
    }

    // 4. CCRI / credit & access angle
    if (isFinite(ccri.high_risk_count) && ccri.high_risk_count > 0) {
      parts.push(
        `The Consumer Credit Risk Integrity module (CCRI) flags at least ` +
        `${ccri.high_risk_count} high-risk credit or lending scenario where DMV/DOT data ` +
        `was used as a gatekeeper for basic economic mobility, even though the people affected ` +
        `are not DOT-regulated commercial drivers.`
      );
    }

    // 5. Closing: legal framing
    parts.push(
      `Taken together, these findings show a pattern of government and private-sector behavior ` +
      `that extends beyond lawful authority and pushes the costs onto ordinary people. ` +
      `A.B.E. does not decide guilt or innocence; it simply quantifies what it costs when ` +
      `officials ignore constitutional limits, and it documents the numbers so a court, ` +
      `legislature, or oversight body can see exactly what changed, why it matters, and how ` +
      `much it would save to bring the system back into alignment.`
    );

    return parts.join('\n\n');
  }

  global.abeDivergence = {
    makeNarrative
  };
})(window);
