export async function run(scenario = {}, ctx = {}) {
  const intake = scenario?.inputs?.intake || {};
  const source = intake?.source || {};

  const rawText = [source.title, source.type, source.jurisdiction, source.text]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const claimedAuthority = [];
  const controllingAuthority = ["U.S. Constitution"];

  const doctrineTriggers = [];
  const rightsImpacted = [];
  const findings = [];

  const hasStateTransport = hasAny(rawText, [
    "state transportation code",
    "driver's license",
    "vehicle registration",
    "traffic code",
    "state transportation",
    "license suspension"
  ]);

  const hasFederalCommerce = hasAny(rawText, [
    "commerce",
    "interstate commerce",
    "motor carrier",
    "commercial motor vehicle",
    "for hire",
    "carrier",
    "dot regulated"
  ]);

  const hasPrivateTravel = hasAny(rawText, [
    "private travel",
    "personal travel",
    "non-commercial",
    "private",
    "personal"
  ]);

  const hasFunding = hasAny(rawText, [
    "mcsap",
    "grant",
    "funding",
    "appropriation",
    "federal funds",
    "program funds",
    "budget"
  ]);

  const hasCourtLanguage = hasAny(rawText, [
    "court",
    "judicial",
    "qualified immunity",
    "stare decisis",
    "judge"
  ]);

  const hasSeizureOrDetention = hasAny(rawText, [
    "stop",
    "traffic stop",
    "detained",
    "arrest",
    "seized",
    "citation",
    "charged"
  ]);

  const hasRASProblem = hasAny(rawText, [
    "no probable cause",
    "no reasonable suspicion",
    "without reasonable suspicion",
    "without articulable suspicion"
  ]);

  const hasVagueness = hasAny(rawText, [
    "ambiguous",
    "vague",
    "undefined",
    "unclear",
    "interpretation"
  ]);

  if (hasStateTransport) {
    claimedAuthority.push("state_transportation_enforcement");
  }

  if (hasFunding) {
    claimedAuthority.push("funding_or_program_authority");
  }

  if (hasCourtLanguage) {
    claimedAuthority.push("judicial_or_doctrinal_authority");
  }

  if (hasFederalCommerce) {
    controllingAuthority.push("federal_commerce_authority");
  }

  if (hasPrivateTravel) {
    controllingAuthority.push("private_noncommercial_status");
    rightsImpacted.push("right_to_travel");
    rightsImpacted.push("liberty_burden");
  }

  if (hasSeizureOrDetention) {
    rightsImpacted.push("unreasonable_seizure");
    rightsImpacted.push("due_process");
  }

  let authorityConflict = false;
  let constitutionalViolation = false;
  let voidAbInitioFlag = false;
  let ultraViresFlag = false;
  let fundingScopeConflict = false;
  let offMissionFlag = false;
  let jurisdictionStatus = "aligned";

  if (hasStateTransport && hasPrivateTravel && !hasFederalCommerce) {
    authorityConflict = true;
    constitutionalViolation = true;
    ultraViresFlag = true;
    jurisdictionStatus = "ultra_vires";
    findings.push("State transportation enforcement is being applied to private or non-commercial conduct without a clear commercial trigger.");
    doctrineTriggers.push("commerce_nexus_failure");
    doctrineTriggers.push("jurisdiction_failure");
    doctrineTriggers.push("ultra_vires_enforcement");
  }

  if (hasFunding && hasPrivateTravel && !hasFederalCommerce) {
    fundingScopeConflict = true;
    offMissionFlag = true;
    findings.push("Funding or program authority appears to be used outside approved mission scope.");
    doctrineTriggers.push("funding_scope_conflict");
    doctrineTriggers.push("off_mission_execution");
  }

  if (hasRASProblem) {
    constitutionalViolation = true;
    findings.push("Reasonable articulable suspicion appears defective or absent.");
    doctrineTriggers.push("ras_defect");
    rightsImpacted.push("due_process");
    rightsImpacted.push("unreasonable_seizure");
  }

  if (hasVagueness) {
    findings.push("Ambiguity or vagueness language appears in the source.");
    doctrineTriggers.push("void_for_vagueness_risk");
  }

  if (hasCourtLanguage && rawText.includes("qualified immunity")) {
    findings.push("Qualified immunity language appears in the source.");
    doctrineTriggers.push("stare_decisis_inapplicable");
  }

  if (constitutionalViolation) {
    voidAbInitioFlag = true;
    ultraViresFlag = true;
    if (jurisdictionStatus === "aligned") {
      jurisdictionStatus = "void";
    }
    doctrineTriggers.push("void_ab_initio");
    doctrineTriggers.push("constitutional_fidelity_breach");
    findings.push("The action conflicts with controlling constitutional authority and is treated as void ab initio.");
  }

  if (!claimedAuthority.length) {
    findings.push("No clear claimed authority was detected from the current input.");
  }

  if (!rightsImpacted.length) {
    rightsImpacted.push("no_explicit_right_identified");
  }

  const result = {
    claimed_authority: unique(claimedAuthority),
    controlling_authority: unique(controllingAuthority),
    authority_conflict: authorityConflict,
    jurisdiction_status: jurisdictionStatus,
    constitutional_violation: constitutionalViolation,
    void_ab_initio_flag: voidAbInitioFlag,
    ultra_vires_flag: ultraViresFlag,
    funding_scope_conflict: fundingScopeConflict,
    off_mission_flag: offMissionFlag,
    doctrine_triggers: unique(doctrineTriggers),
    rights_impacted: unique(rightsImpacted),
    findings
  };

  return {
    module: "cda",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    input: {
      intake
    },
    result,
    plain_language: buildPlainLanguage(result)
  };
}

function hasAny(text, phrases) {
  return phrases.some(phrase => text.includes(phrase));
}

function unique(arr) {
  return [...new Set(arr)];
}

function buildPlainLanguage(result) {
  const status = result.void_ab_initio_flag
    ? "void_ab_initio"
    : result.ultra_vires_flag
      ? "ultra_vires"
      : result.off_mission_flag
        ? "off_mission"
        : result.authority_conflict
          ? "authority_conflict"
          : "aligned";

  if (status === "aligned") {
    return {
      status,
      explanation:
        "CDA did not find a clear constitutional authority conflict from the current input.",
      what_authority_was_claimed: result.claimed_authority,
      what_authority_controls: result.controlling_authority,
      what_rights_are_impacted: result.rights_impacted,
      what_doctrine_applies: result.doctrine_triggers
    };
  }

  return {
    status,
    explanation:
      result.void_ab_initio_flag
        ? "The action conflicts with controlling constitutional authority. It is treated as void from the beginning, which collapses lawful jurisdiction and makes the enforcement ultra vires."
        : result.ultra_vires_flag
          ? "The action appears to have been executed outside lawful jurisdiction or authority."
          : result.off_mission_flag
            ? "The action appears outside approved funding or mission scope."
            : "A controlling authority conflict was identified.",
    what_authority_was_claimed: result.claimed_authority,
    what_authority_controls: result.controlling_authority,
    what_rights_are_impacted: result.rights_impacted,
    what_doctrine_applies: result.doctrine_triggers
  };
    }
