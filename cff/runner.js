export async function run(scenario = {}, ctx = {}) {
  const intake = scenario?.inputs?.intake || {};
  const cda = scenario?.derived?.cda || {};

  const source = intake?.source || {};
  const rawText = [source.title, source.type, source.jurisdiction, source.text]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const divergence = Number(cda?.divergence_score) || 0;

  let ON_MISSION = 0;
  let OFF_MISSION = 0;
  let UNCLEAR = 0;

  const byProgram = [];

  const hasFunding = hasAny(rawText, [
    "mcsap", "grant", "funding", "appropriation", "federal funds", "program funds", "budget"
  ]);

  const hasPrivate = hasAny(rawText, [
    "private", "personal", "non-commercial", "citizen", "private travel", "private movement"
  ]);

  const hasCommercial = hasAny(rawText, [
    "commercial", "for hire", "carrier", "cmv", "motor carrier", "dot regulated"
  ]);

  if (divergence === 0 && !hasFunding) {
    ON_MISSION = 1;
    byProgram.push({
      program: "general_authority_view",
      classification: "ON_MISSION",
      reason: "No funding-scope conflict was detected from the current input."
    });
  }

  if (hasFunding && hasPrivate && !hasCommercial) {
    OFF_MISSION += 1;
    byProgram.push({
      program: "funding_scope_review",
      classification: "OFF_MISSION",
      reason: "Funding/program language appears with private or non-commercial activity without a clear commercial trigger."
    });
  }

  if (hasFunding && hasCommercial) {
    ON_MISSION += 1;
    byProgram.push({
      program: "funding_scope_review",
      classification: "ON_MISSION",
      reason: "Funding/program language appears with commercial-regulatory language."
    });
  }

  if (hasFunding && !hasPrivate && !hasCommercial) {
    UNCLEAR += 1;
    byProgram.push({
      program: "funding_scope_review",
      classification: "UNCLEAR",
      reason: "Funding/program language appears, but the activity trigger is not clear from the input."
    });
  }

  if (!hasFunding && divergence > 0) {
    UNCLEAR += 1;
    byProgram.push({
      program: "implicit_scope_review",
      classification: "UNCLEAR",
      reason: "Divergence was detected but no explicit funding/program hook was found in the text."
    });
  }

  return {
    module: "CFF",
    module_version: "2.0",
    generated_at: new Date().toISOString(),
    totals: {
      ON_MISSION,
      OFF_MISSION,
      UNCLEAR
    },
    by_program: byProgram,
    notes: "CFF runner is actively classifying funding and scope signals from intake and CDA output."
  };
}

function hasAny(text, phrases) {
  return phrases.some(phrase => text.includes(phrase));
}
