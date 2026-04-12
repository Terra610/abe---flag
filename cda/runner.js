export async function run(scenario = {}, ctx = {}) {
  const intake = scenario?.inputs?.intake || {};
  const source = intake?.source || {};

  const rawText = [source.title, source.type, source.jurisdiction, source.text]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const findings = [];
  const authorityTrace = [];
  let divergence = 0;

  const hasPrivate = hasAny(rawText, [
    "private", "personal", "non-commercial", "citizen", "private travel", "private movement"
  ]);

  const hasCommercial = hasAny(rawText, [
    "commercial", "for hire", "carrier", "cmv", "motor carrier", "dot regulated", "safety sensitive"
  ]);

  const hasEnforcement = hasAny(rawText, [
    "traffic stop", "citation", "arrest", "detained", "suspension", "revocation",
    "inspection", "compliance", "prosecution", "criminal", "charge"
  ]);

  const hasFunding = hasAny(rawText, [
    "mcsap", "grant", "funding", "appropriation", "federal funds", "program funds", "budget"
  ]);

  const hasAmbiguity = hasAny(rawText, [
    "ambiguous", "vague", "undefined", "interpretation", "broadly construed", "unclear"
  ]);

  const hasScopeTerms = hasAny(rawText, [
    "authority", "jurisdiction", "scope", "delegated", "delegation", "preemption", "federal", "state"
  ]);

  if (!String(source?.jurisdiction || "").trim()) {
    divergence += 1;
    findings.push("Jurisdiction is not specified in the intake.");
  } else {
    authorityTrace.push(String(source.jurisdiction));
  }

  if (!String(source?.type || "").trim()) {
    divergence += 1;
    findings.push("Source type is not specified in the intake.");
  }

  if (!String(source?.text || "").trim()) {
    divergence += 1;
    findings.push("No source text was provided, so the engine has limited authority context.");
  }

  if (hasPrivate && hasCommercial) {
    divergence += 2;
    findings.push("Private or non-commercial language appears alongside commercial-regulatory language.");
  }

  if (hasPrivate && hasEnforcement && !hasCommercial) {
    divergence += 2;
    findings.push("Enforcement language appears against private or non-commercial activity without a clear commercial trigger.");
  }

  if (hasFunding && hasEnforcement) {
    divergence += 1;
    findings.push("Funding or program language appears alongside enforcement activity and may require scope review.");
    authorityTrace.push("funding_trace_present");
  }

  if (hasAmbiguity) {
    divergence += 1;
    findings.push("Ambiguity or interpretation language appears in the source.");
  }

  if (hasScopeTerms) {
    authorityTrace.push("scope_review_triggered");
  }

  const alignmentStatus = divergence === 0 ? "aligned" : "divergent";

  const result = {
    alignment_status: alignmentStatus,
    divergence_score: divergence,
    authority_trace: authorityTrace,
    findings,
    indicators: {
      private_trigger: hasPrivate,
      commercial_trigger: hasCommercial,
      enforcement_trigger: hasEnforcement,
      funding_trigger: hasFunding,
      ambiguity_trigger: hasAmbiguity,
      scope_trigger: hasScopeTerms
    }
  };

  const legalExplainer = buildLegalExplainer(result, intake);

  return {
    module: "CDA",
    module_version: "2.1.0",
    generated_at: new Date().toISOString(),
    inputs_used: {
      intake_present: !!intake
    },
    summary: {
      avg_alignment: divergence === 0 ? 1 : 0,
      avg_divergence: divergence,
      top_domains: authorityTrace
    },
    by_domain: authorityTrace,
    result,
    legal_explainer: legalExplainer
  };
}

function hasAny(text, phrases) {
  return phrases.some(phrase => text.includes(phrase));
}

function buildLegalExplainer(cdaResult, intake) {
  const divergence = Number(cdaResult?.divergence_score) || 0;
  const findings = Array.isArray(cdaResult?.findings) ? cdaResult.findings : [];
  const source = intake?.source || {};
  const title = String(source?.title || "").trim();

  if (divergence === 0) {
    return {
      status: "aligned",
      plain_language:
        "The engine did not find a strong authority, jurisdiction, or scope conflict from the text you provided.",
      what_this_means:
        "Based on the current input, the engine does not yet see enough evidence of state overreach to classify the situation as divergence.",
      why_this_happened:
        "This usually means either the input is neutral, too short, or does not contain the enforcement language, statute language, or authority language needed to trigger a divergence result.",
      what_you_can_do: [
        "Paste the exact citation, charge, notice, court text, officer statement, or agency letter.",
        "Include the legal authority they claimed to rely on, if known.",
        "Include any language showing private or non-commercial activity if that is the issue.",
        "Rerun the engine with the actual enforcement facts instead of a short test phrase."
      ],
      evidence_to_collect: [
        "Citation or charging document",
        "Agency letter or notice",
        "Court filing or docket entry",
        "Officer statement or bodycam reference",
        "Statute or regulation section used against the person"
      ],
      findings
    };
  }

  const likelyIssues = [];

  if (cdaResult?.indicators?.private_trigger && cdaResult?.indicators?.commercial_trigger) {
    likelyIssues.push("Commercial regulatory language appears to be crossing into private or non-commercial activity.");
  }

  if (cdaResult?.indicators?.enforcement_trigger && cdaResult?.indicators?.private_trigger) {
    likelyIssues.push("An enforcement event appears to involve private activity without a clearly stated commercial basis.");
  }

  if (cdaResult?.indicators?.funding_trigger) {
    likelyIssues.push("A funding or program authority issue may exist and should be compared to the specific action taken.");
  }

  if (cdaResult?.indicators?.ambiguity_trigger) {
    likelyIssues.push("Ambiguous or undefined terms may be expanding power beyond a clear lawful limit.");
  }

  if (likelyIssues.length === 0) {
    likelyIssues.push("The input suggests an authority or scope conflict that deserves deeper review.");
  }

  return {
    status: "divergent",
    plain_language:
      "The engine found signs that the government action described may exceed the lawful authority being used.",
    what_this_means:
      "In plain terms, the facts you entered suggest the state may be applying a rule, enforcement power, or regulatory framework outside the boundary that lawfully authorizes it.",
    why_this_happened:
      "The engine detected language patterns that commonly show up when private activity is treated like regulated commercial activity, when enforcement outruns its trigger, or when authority and scope are not clearly established.",
    likely_issues: likelyIssues,
    what_you_can_do: [
      "Ask for the exact statute, regulation, and definition section being relied on.",
      "Ask what jurisdictional trigger gives the state authority in this specific situation.",
      "Ask whether the action applies only to commercial or regulated activity, and whether that trigger is actually present.",
      "Preserve every record, notice, citation, timestamp, and communication.",
      "Build a timeline of what happened in plain language while details are fresh.",
      "Use the engine output to organize a complaint, affidavit, records request, or legal review."
    ],
    evidence_to_collect: [
      "The exact charging language or citation",
      "The claimed legal authority",
      "Court filings or docket screenshots",
      "Agency correspondence",
      "Funding or grant references if they appear in the case",
      "Any text showing private or non-commercial status"
    ],
    findings,
    case_title: title
  };
      }
