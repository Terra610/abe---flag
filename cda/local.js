// cda/local.js
// CDA UI logic — runs entirely in-browser.
// - Loads cda/model.json for flag weights and dimension weights.
// - Reads the last Intake artifact from localStorage when available.
// - Derives flags automatically from facts, citations, and funding context.
// - Computes deterministic 0–1 divergence score from canonical weights.
// - Renders JSON + plain-language summary + audit hash.
// - Stores canonical CDA scenario in localStorage.

(function () {
  const byId = (id) => document.getElementById(id);

  // Inputs
  const statuteEl = byId("statute-name");
  const jurisEl = byId("jurisdiction");
  const levelEl = byId("level");
  const popEl = byId("population");
  const citEl = byId("citations");
  const fundEl = byId("funding");
  const notesEl = byId("notes");

  // Flags (checkboxes shown to user, but system derives them)
  const flagIds = [
    "scope_noncommercial_treated_as_commercial",
    "preemption_conflict",
    "preemption_field",
    "ultra_vires_enforcement",
    "mcsap_off_mission",
    "funding_conditions_ignored",
    "funding_nontransparent",
    "right_to_travel_burdened",
    "due_process_defects",
    "selective_application"
  ];

  const flagEls = {};
  flagIds.forEach((id) => {
    const el = byId("flag-" + id);
    if (el) flagEls[id] = el;
  });

  // Outputs
  const statusEl = byId("cda-status");
  const scorePill = byId("cda-score-pill");
  const scoreValEl = byId("cda-score-value");
  const jsonEl = byId("cda-json");
  const summaryEl = byId("cda-summary");
  const dlBtn = byId("btn-download");
  const genBtn = byId("btn-generate");
  const hashLineEl = byId("cda-hash-line");
  const intakeNote = byId("intake-bridge-note");

  let model = null;
  let latestScenario = null;

  function setStatus(text, kind) {
    if (!statusEl) return;
    statusEl.textContent = "Status: " + text;
    statusEl.className = "cda-status";
    if (kind === "ok") statusEl.classList.add("cda-status-ok");
    if (kind === "warn") statusEl.classList.add("cda-status-warn");
    if (kind === "bad") statusEl.classList.add("cda-status-bad");
  }

  function setScoreDisplay(score) {
    if (scoreValEl) scoreValEl.textContent = score == null ? "—" : score.toFixed(2);
    if (!scorePill) return;
    scorePill.className = "cda-score-badge";
    if (score == null) return;
    if (score >= 0.75) scorePill.classList.add("cda-score-high");
    else if (score >= 0.35) scorePill.classList.add("cda-score-mid");
    else scorePill.classList.add("cda-score-low");
  }

  async function sha256OfText(text) {
    const enc = new TextEncoder();
    const buf = enc.encode(text);
    const hash = await crypto.subtle.digest("SHA-256", buf);
    const bytes = new Uint8Array(hash);
    return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  function downloadTextFile(name, text, type) {
    const blob = new Blob([text], { type: type || "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function loadModel() {
    const res = await fetch("cda/model.json", { cache: "no-store" });
    if (!res.ok) throw new Error("cda/model.json not found (HTTP " + res.status + ")");
    return await res.json();
  }

  function parseList(value) {
    if (!value || !value.trim()) return [];
    return value
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  function textIncludesAny(text, needles) {
    const lower = String(text || "").toLowerCase();
    return needles.some((n) => lower.includes(String(n).toLowerCase()));
  }

  function listIncludesAny(list, needles) {
    const joined = (list || []).join(" ").toLowerCase();
    return needles.some((n) => joined.includes(String(n).toLowerCase()));
  }

  function hydrateFromIntake() {
    if (!intakeNote) return null;

    try {
      const raw = localStorage.getItem("abe_intake_artifact");
      if (!raw) {
        intakeNote.textContent = "Intake bridge: no recent Intake artifact found. You can still fill this form manually.";
        return null;
      }

      const art = JSON.parse(raw);
      if (!art || typeof art !== "object") {
        intakeNote.textContent = "Intake bridge: found data, but it does not look like an Intake artifact.";
        return null;
      }

      if (statuteEl && !statuteEl.value) {
        statuteEl.value = art.doc_type
          ? art.doc_type + (art.original_file_name ? " — " + art.original_file_name : "")
          : (art.original_file_name || "");
      }

      if (notesEl && !notesEl.value && art.text_normalized) {
        const snippet = String(art.text_normalized).slice(0, 1200).replace(/\s+/g, " ");
        notesEl.value = snippet;
      }

      if (popEl && !popEl.value) {
        const dt = art.doc_type || "";
        if (dt === "traffic_ticket") popEl.value = "non_commercial";
        else if (dt === "loan_contract") popEl.value = "mixed";
      }

      intakeNote.textContent =
        "Intake bridge: using the last Intake artifact in this browser as context. You can change any field above.";
      return art;
    } catch (e) {
      console.warn("Intake bridge error:", e);
      intakeNote.textContent = "Intake bridge: could not read the Intake artifact.";
      return null;
    }
  }

  function computeScore(flags) {
    if (!model || !model.flag_definitions || !model.scoring || !model.scoring.dimension_weights) return 0;
    const defs = model.flag_definitions;
    const dimW = model.scoring.dimension_weights;
    let sum = 0;

    Object.keys(flags).forEach((key) => {
      if (!flags[key]) return;
      const def = defs[key];
      if (!def) return;
      const dim = def.dimension;
      const sev = typeof def.severity === "number" ? def.severity : 1;
      const w = typeof dimW[dim] === "number" ? dimW[dim] : 1;
      sum += sev * w;
    });

    return Math.max(0, Math.min(1, sum));
  }

  function buildContext() {
    const citations = parseList(citEl?.value || "");
    let fundingStreams = parseList(fundEl?.value || "");
    const notes = (notesEl?.value || "").trim();
    const statuteName = (statuteEl?.value || "").trim();
    const jurisdiction = (jurisEl?.value || "").trim();
    const population = popEl?.value || "mixed";

    const allText = [
      statuteName,
      jurisdiction,
      population,
      notes,
      citations.join(" "),
      fundingStreams.join(" ")
    ].join(" ");

    const hasFmcsr = textIncludesAny(allText, [
      "49 cfr 390.3",
      "49 cfr 390.5",
      "49 cfr 350.303",
      "49 usc 31106",
      "fmcsr",
      "motor carrier",
      "commercial motor vehicle",
      "commercial vehicle",
      "implied consent",
      "driver's license",
      "license suspension"
    ]);

    const hasCommercialFunding = textIncludesAny(allText, [
      "mcsap",
      "nhtsa 402",
      "federal highway safety",
      "motor carrier safety assistance program",
      "commercial enforcement",
      "dot funding"
    ]);

    if (!fundingStreams.length && (hasFmcsr || hasCommercialFunding)) {
      fundingStreams = ["MCSAP (inferred)"];
    }

    return {
      statute_name: statuteName,
      jurisdiction,
      level: levelEl?.value || "state",
      population,
      citations,
      funding_streams: fundingStreams,
      notes,
      allText,
      hasFmcsr,
      hasCommercialFunding
    };
  }

  function deriveFlags(context) {
    const flags = {};
    const t = context.allText.toLowerCase();

    const nonCommercial =
      context.population === "non_commercial" ||
      textIncludesAny(t, [
        "private citizen",
        "private travel",
        "personal travel",
        "non-commercial",
        "not engaged in commerce",
        "privately owned vehicle"
      ]);

    const commercialAuthorityApplied =
      context.hasFmcsr ||
      listIncludesAny(context.citations, [
        "49 cfr 390.3",
        "49 cfr 390.5",
        "49 cfr 350.303",
        "49 usc 31106"
      ]);

    const stateEnforcementApplied = textIncludesAny(t, [
      "state authority",
      "state enforcement",
      "citation",
      "cited",
      "license suspension",
      "implied consent",
      "traffic stop",
      "state transportation code"
    ]);

    const rightsBurden = textIncludesAny(t, [
      "right to travel",
      "private travel",
      "license suspension",
      "restriction of movement",
      "citation",
      "charged",
      "detained",
      "arrest"
    ]);

    const dueProcessProblem = textIncludesAny(t, [
      "implied consent",
      "without hearing",
      "without notice",
      "without reasonable suspicion",
      "without probable cause",
      "summary suspension",
      "citation",
      "charged"
    ]);

    const fundingOpaque =
      context.funding_streams.length === 0 ||
      textIncludesAny(t, [
        "unknown funding",
        "unclear funding",
        "nontransparent funding"
      ]);

    const commercialFundingPresent =
      listIncludesAny(context.funding_streams, [
        "mcsap",
        "nhtsa",
        "motor carrier safety assistance program",
        "highway safety"
      ]) || context.hasCommercialFunding;

    flags.scope_noncommercial_treated_as_commercial =
      nonCommercial && commercialAuthorityApplied;

    flags.preemption_conflict =
      flags.scope_noncommercial_treated_as_commercial && commercialAuthorityApplied;

    flags.preemption_field =
      flags.preemption_conflict &&
      textIncludesAny(t, [
        "federal law",
        "49 cfr",
        "49 usc",
        "occupied field",
        "preempt"
      ]);

    flags.ultra_vires_enforcement =
      stateEnforcementApplied && flags.scope_noncommercial_treated_as_commercial;

    flags.mcsap_off_mission =
      flags.scope_noncommercial_treated_as_commercial &&
      commercialFundingPresent;

    flags.funding_conditions_ignored =
      flags.mcsap_off_mission || flags.ultra_vires_enforcement;

    flags.funding_nontransparent = fundingOpaque;

    flags.right_to_travel_burdened = rightsBurden && nonCommercial;

    flags.due_process_defects = dueProcessProblem;

    flags.selective_application = textIncludesAny(t, [
      "selective enforcement",
      "arbitrary enforcement",
      "different treatment",
      "similarly situated"
    ]);

    return flags;
  }

  function buildDeterminations(scenario) {
    const f = scenario.flags;

    const ultraVires = !!f.ultra_vires_enforcement;
    const fundingMisuse = !!f.mcsap_off_mission || !!f.funding_conditions_ignored;
    const voidAbInitio =
      !!f.preemption_conflict ||
      !!f.ultra_vires_enforcement ||
      !!f.right_to_travel_burdened ||
      !!f.due_process_defects;

    const explainers = {
      mcsap_off_mission: f.mcsap_off_mission
        ? "Federal funding under MCSAP is restricted to commercial motor vehicle safety enforcement. Applying commercially scoped enforcement to a private, non-commercial individual is off mission."
        : "No MCSAP off-mission finding was triggered from the current facts.",
      ultra_vires: ultraVires
        ? "The enforcing authority acted outside lawful jurisdiction or delegated authority. This is ultra vires."
        : "No ultra vires finding was triggered from the current facts.",
      void_ab_initio: voidAbInitio
        ? "Because the action conflicts with controlling constitutional authority, it is treated as void from the beginning and without lawful force."
        : "No void ab initio finding was triggered from the current facts.",
      funding_misuse: fundingMisuse
        ? "Public funding appears to have been used outside the authorized mission, scope, or conditions attached to that funding."
        : "No funding misuse finding was triggered from the current facts."
    };

    const economicRecovery = {
      misused_funding_detected: fundingMisuse,
      eligible_for_reallocation: fundingMisuse,
      program: fundingMisuse ? "Rebuild Together Plan" : "",
      basis: fundingMisuse ? "ABE-CRRA Doctrine" : "",
      summary: fundingMisuse
        ? "Funds used outside authorized mission scope are recoverable and may be redirected into community restoration through the Rebuild Together Plan."
        : "No reallocation pathway was triggered from the current facts."
    };

    return {
      ultra_vires: ultraVires,
      void_ab_initio: voidAbInitio,
      funding_misuse: fundingMisuse,
      explainers,
      economic_recovery: economicRecovery
    };
  }

  function buildAnchors(scenario) {
    const flags = scenario.flags || {};
    const cits = scenario.citations || [];

    const textMatch = (needle) =>
      cits.some((c) => String(c).toLowerCase().includes(needle.toLowerCase()));

    const lawHints = [];
    const docHints = [];

    if (
      flags.scope_noncommercial_treated_as_commercial ||
      flags.preemption_conflict ||
      flags.preemption_field ||
      textMatch("390.3") ||
      textMatch("390.5")
    ) {
      lawHints.push("FMCSR Scope (49 CFR 390.3 / 390.5) — see LAW corpus → FMCSR Scope Map.");
    }

    if (
      flags.mcsap_off_mission ||
      flags.funding_conditions_ignored ||
      textMatch("350.") ||
      textMatch("mcsap")
    ) {
      lawHints.push("MCSAP Program Rules (49 CFR Part 350) — see LAW corpus → MCSAP Program Rules.");
    }

    if (
      flags.ultra_vires_enforcement ||
      flags.preemption_conflict ||
      flags.preemption_field ||
      textMatch("49 usc") ||
      textMatch("title 49")
    ) {
      lawHints.push("Title 49 Transportation Authority — see LAW corpus → Title 49 core FMCSA scope.");
    }

    if (flags.preemption_conflict || flags.preemption_field) {
      docHints.push("Constitutional Fidelity — see doctrine page for supremacy and controlling authority.");
    }

    if (
      flags.mcsap_off_mission ||
      flags.right_to_travel_burdened ||
      flags.due_process_defects ||
      flags.ultra_vires_enforcement
    ) {
      docHints.push("Void ab Initio — unconstitutional enforcement collapses from inception.");
    }

    if (
      flags.scope_noncommercial_treated_as_commercial ||
      flags.ultra_vires_enforcement ||
      flags.right_to_travel_burdened ||
      flags.mcsap_off_mission
    ) {
      docHints.push("ABE-CRRA / Rebuild Together — systemic remedy and recovery pathway.");
    }

    if (!lawHints.length) {
      lawHints.push("Open the Law viewer for controlling USC/CFR/funding: /abe---flag/law/index.html");
    }
    if (!docHints.length) {
      docHints.push("Open the Doctrines overview: /abe---flag/doctrine/index.html");
    }

    return { lawHints, docHints };
  }

  function buildSummary(scenario) {
    const lines = [];
    const s = scenario;
    const d = s.determinations || {};

    lines.push(`CDA scenario: ${s.statute_name || "(unnamed)"}`);
    lines.push(`Jurisdiction: ${s.jurisdiction || "—"} · Level: ${s.level}`);
    lines.push(`Population impacted: ${s.population}`);

    if (s.funding_streams && s.funding_streams.length) {
      lines.push(`Related funding: ${s.funding_streams.join(", ")}`);
    }
    if (s.citations && s.citations.length) {
      lines.push(`Citations: ${s.citations.join(", ")}`);
    }

    lines.push("");
    lines.push(`Divergence score (0–1): ${s.divergence_score.toFixed(2)}`);
    lines.push("");

    const defs = model && model.flag_definitions ? model.flag_definitions : null;
    const onFlags = Object.keys(s.flags || {}).filter((k) => s.flags[k]);

    if (onFlags.length) {
      lines.push("System-derived findings:");
      onFlags.forEach((k) => {
        const def = defs && defs[k];
        const desc = def && def.description ? def.description : k;
        lines.push(`- ${desc}`);
      });
    } else {
      lines.push("No divergence findings were derived from the current facts.");
    }

    lines.push("");
    lines.push("Legal determinations:");
    lines.push(`- Ultra vires: ${d.ultra_vires ? "YES" : "NO"}`);
    lines.push(`- Void ab initio: ${d.void_ab_initio ? "YES" : "NO"}`);
    lines.push(`- Funding misuse: ${d.funding_misuse ? "YES" : "NO"}`);

    lines.push("");
    lines.push("Plain-language explainer:");
    lines.push(`- Off mission: ${d.explainers?.mcsap_off_mission || "—"}`);
    lines.push(`- Ultra vires: ${d.explainers?.ultra_vires || "—"}`);
    lines.push(`- Void ab initio: ${d.explainers?.void_ab_initio || "—"}`);
    lines.push(`- Funding misuse: ${d.explainers?.funding_misuse || "—"}`);

    if (s.notes) {
      lines.push("");
      lines.push("Notes:");
      lines.push(s.notes);
    }

    const anchors = buildAnchors(s);
    lines.push("");
    lines.push("Law & doctrine anchors:");
    lines.push("  LAW corpus:");
    anchors.lawHints.forEach((h) => lines.push("    - " + h));
    lines.push("  Doctrines:");
    anchors.docHints.forEach((h) => lines.push("    - " + h));

    if (d.economic_recovery?.eligible_for_reallocation) {
      lines.push("");
      lines.push("Recovery pathway:");
      lines.push(`- Program: ${d.economic_recovery.program}`);
      lines.push(`- Basis: ${d.economic_recovery.basis}`);
      lines.push(`- Summary: ${d.economic_recovery.summary}`);
    }

    lines.push("");
    lines.push("Viewer shortcuts:");
    lines.push("  - Law viewer:       /abe---flag/law/index.html");
    lines.push("  - Doctrines index:  /abe---flag/doctrine/index.html");
    lines.push("  - Integration audit:/abe---flag/integration/index.html");

    return lines.join("\n");
  }

  async function run() {
    try {
      if (genBtn) genBtn.disabled = true;
      if (dlBtn) dlBtn.disabled = true;

      setStatus("generating CDA scenario…", "warn");
      setScoreDisplay(null);
      if (jsonEl) jsonEl.textContent = "{}";
      if (summaryEl) summaryEl.textContent = "Working…";

      if (!model) {
        model = await loadModel();
      }

      const context = buildContext();
      const flags = deriveFlags(context);
      const divergenceScore = computeScore(flags);
      const determinations = buildDeterminations({
        ...context,
        flags
      });

      const scenario = {
        version: "1.0",
        module: "CDA",
        statute_name: context.statute_name,
        jurisdiction: context.jurisdiction,
        level: context.level,
        population: context.population,
        citations: context.citations,
        funding_streams: context.funding_streams,
        flags,
        divergence_score: divergenceScore,
        notes: context.notes,
        determinations
      };

      const jsonText = JSON.stringify(scenario, null, 2);
      latestScenario = scenario;

      if (jsonEl) jsonEl.textContent = jsonText;
      setScoreDisplay(scenario.divergence_score);
      if (summaryEl) summaryEl.textContent = buildSummary(scenario);

      const hash = await sha256OfText(jsonText);
      if (hashLineEl) {
        hashLineEl.textContent =
          "Audit hash: " +
          hash +
          "  (SHA-256 of this CDA JSON. Any tampering will change this value.)";
      }

      if (dlBtn) {
        dlBtn.disabled = false;
        dlBtn.onclick = () => {
          downloadTextFile("cda_cda-scenario.json", jsonText, "application/json");
        };
      }

      setStatus("CDA scenario generated. Flags and legal determinations were derived by the system.", "ok");

      try {
        localStorage.setItem("ABE_CDA_SCENARIO_V1", jsonText);
        localStorage.setItem("abe_cda_artifact", jsonText);
      } catch (e) {
        console.warn("Could not store CDA scenario in localStorage:", e);
      }
    } catch (err) {
      console.error(err);
      setStatus("CDA failed: " + (err.message || String(err)), "bad");
      if (jsonEl) jsonEl.textContent = "{}";
      if (summaryEl) summaryEl.textContent = "CDA run failed. See console for details.";
      setScoreDisplay(null);
      if (dlBtn) dlBtn.disabled = true;
      if (hashLineEl) hashLineEl.textContent = "Audit hash: —";
    } finally {
      if (genBtn) genBtn.disabled = false;
    }
  }

  (async function init() {
    try {
      model = await loadModel();
    } catch (e) {
      console.warn("Could not preload cda/model.json; will retry on run():", e);
    }

    hydrateFromIntake();

    if (genBtn) {
      genBtn.addEventListener("click", run);
    }

    setStatus("ready — enter facts and let CDA derive the flags.", "ok");
  })();
})();
