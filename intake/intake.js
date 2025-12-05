// intake/intake.js
// Document Intake + OCR Bridge for A.B.E.
// - Runs OCR (via Tesseract.js) for images
// - Normalizes text + basic extracted fields
// - Builds intake_artifact.json
// - Auto-creates a CIRI-ready CSV row stub
//
// All work happens locally in the browser. No uploads, no tracking.
// This file is descriptive tooling, not legal advice.

(function () {
  // ---------- helpers ----------
  const $ = (id) => document.getElementById(id);

  function setStatus(msg) {
    const el = $("status");
    if (el) el.textContent = msg;
  }

  async function sha256Hex(arrayBuffer) {
    const hash = await crypto.subtle.digest("SHA-256", arrayBuffer);
    const view = new Uint8Array(hash);
    return Array.from(view)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  function normalizeText(text) {
    if (!text) return "";
    // simple normalization: collapse whitespace, keep line breaks for readability
    return text
      .replace(/\r\n/g, "\n")
      .replace(/\t/g, " ")
      .replace(/ +/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  // very light "extraction" – just tags; user can refine later
  function extractFields(docType, text) {
    const fields = { doc_type: docType || "unknown" };
    const lower = text.toLowerCase();

    if (docType === "traffic_ticket") {
      fields.estimated_case_count = 1;
      fields.has_jail_language =
        lower.includes("jail") || lower.includes("imprison");
      fields.has_license_language =
        lower.includes("license") || lower.includes("suspended");
      fields.has_commercial_codes =
        lower.includes("fmcsa") ||
        lower.includes("cdl") ||
        lower.includes("49 cfr");
    } else if (docType === "cps_case") {
      fields.has_removal_language =
        lower.includes("removal") || lower.includes("custody");
      fields.has_ex_parte = lower.includes("ex parte");
    } else if (docType === "loan_contract") {
      fields.has_apr = lower.includes("apr");
      fields.has_default_clause = lower.includes("default");
      fields.has_repossession = lower.includes("repossession");
    } else if (docType === "policy_memo") {
      fields.has_enforcement_language = lower.includes("enforcement");
    }

    // everyone gets some length metadata
    fields.char_count = text.length;
    fields.line_count = (text.match(/\n/g) || []).length + 1;

    return fields;
  }

  // ---------- CIRI CSV builder ----------
  // This is intentionally simple. It produces a one-row CSV
  // matching the engine’s core CIRI fields. Numbers are
  // placeholders the user can edit later in a spreadsheet.
  function buildCiriCsvFromIntake(session) {
    const header = [
      "cases_avoided",
      "avg_cost_per_case",
      "jail_days_avoided",
      "cost_per_jail_day",
      "fees_canceled_total",
      "policy_corrections",
      "avg_enforcement_cost_savings",
      "households_restored",
      "avg_monthly_market_spend",
      "months_effective",
      "employment_probability",
      "avg_monthly_wage",
      "expected_lawsuits",
      "avg_payout",
      "litigation_multiplier",
      "transition_costs_one_time",
    ];

    const f = session.extracted_fields || {};
    const docType = session.doc_type || "generic_case_text";

    // baseline defaults
    let cases = 1;
    let avgCostPerCase = 0;
    let jailDays = 0;
    let costPerDay = 98; // common jail-day benchmark
    let feesCanceled = 0;

    if (docType === "traffic_ticket") {
      cases = f.estimated_case_count || 1;
      avgCostPerCase = f.estimated_case_cost || 0;
      feesCanceled = f.estimated_fees_total || 0;
    }

    const row = [
      cases,
      avgCostPerCase,
      jailDays,
      costPerDay,
      feesCanceled,
      0, // policy_corrections
      0, // avg_enforcement_cost_savings
      0, // households_restored
      0, // avg_monthly_market_spend
      0, // months_effective
      0, // employment_probability
      0, // avg_monthly_wage
      0, // expected_lawsuits
      0, // avg_payout
      0, // litigation_multiplier
      0, // transition_costs_one_time
    ];

    return header.join(",") + "\n" + row.join(",") + "\n";
  }

  function downloadTextFile(filename, text, mime) {
    const blob = new Blob([text], { type: mime || "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ---------- main intake logic ----------
  let lastSession = null;
  let ciriCsvCache = null;

  async function handleFile() {
    const fileInput = $("file-input");
    const typeSelect = $("doc-type");
    const textOut = $("text-output");

    if (!fileInput || !fileInput.files || !fileInput.files[0]) {
      alert("Please choose a document file first.");
      return;
    }

    const file = fileInput.files[0];
    const docType = typeSelect ? typeSelect.value : "generic_case_text";

    setStatus("Reading file…");

    // hash original file
    const buf = await file.arrayBuffer();
    const hash = await sha256Hex(buf);

    // detect if we should use OCR
    const isImage = /^image\//i.test(file.type);
    let ocrUsed = false;
    let rawText = "";

    if (isImage && window.Tesseract) {
      setStatus("Running OCR in your browser…");
      ocrUsed = true;
      const result = await window.Tesseract.recognize(file, "eng", {
        logger: () => {},
      });
      rawText = result.data && result.data.text ? result.data.text : "";
    } else {
      // fall back to text extraction
      setStatus("Extracting text…");
      rawText = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result || "");
        reader.onerror = () => resolve("");
        reader.readAsText(file);
      });
    }

    const normalized = normalizeText(rawText);
    if (textOut) textOut.value = normalized || "(no text detected)";

    const fields = extractFields(docType, normalized);

    // Build intake session artifact
    const nowIso = new Date().toISOString();
    const baseSession = {
      version: "1.0",
      module: "Intake",
      doc_type: docType,
      original_file_name: file.name,
      original_file_hash: hash,
      ocr_used: ocrUsed,
      text_raw: rawText || null,
      text_normalized: normalized,
      extracted_fields: fields,
      targets: ["CIRI", "CDA", "CFF", "CCRI"],
      generated_outputs: {
        ciri: null,
        cda: null,
        cff: null,
        ccri: null,
      },
      created_at: nowIso,
      notes: "",
    };

    // Auto-generate CIRI CSV stub
    const ciriCsv = buildCiriCsvFromIntake(baseSession);
    ciriCsvCache = ciriCsv;
    const ciriHash = await sha256Hex(
      new TextEncoder().encode(ciriCsv).buffer
    );

    baseSession.generated_outputs.ciri = {
      present: true,
      row_count: 1,
      csv_inline: ciriCsv,
      hash: ciriHash,
    };

    lastSession = baseSession;

    // enable buttons
    if ($("btn-download-intake")) $("btn-download-intake").disabled = false;
    if ($("btn-download-ciri")) $("btn-download-ciri").disabled = false;

    setStatus("Done. Intake artifact and CIRI CSV stub are ready.");
  }

  function downloadIntakeArtifact() {
    if (!lastSession) {
      alert("Run intake on a document first.");
      return;
    }
    const jsonText = JSON.stringify(lastSession, null, 2);
    downloadTextFile(
      "abe_intake_artifact.json",
      jsonText,
      "application/json"
    );
  }

  function downloadCiriCsv() {
    if (!ciriCsvCache) {
      if (!lastSession) {
        alert("Run intake on a document first.");
        return;
      }
      ciriCsvCache = buildCiriCsvFromIntake(lastSession);
    }
    downloadTextFile("ciri_inputs_stub.csv", ciriCsvCache, "text/csv");
  }

  // ---------- wire up UI ----------
  window.addEventListener("DOMContentLoaded", () => {
    const runBtn = $("btn-run-intake");
    const dlIntake = $("btn-download-intake");
    const dlCiri = $("btn-download-ciri");

    if (runBtn) runBtn.addEventListener("click", handleFile);
    if (dlIntake) {
      dlIntake.disabled = true;
      dlIntake.addEventListener("click", downloadIntakeArtifact);
    }
    if (dlCiri) {
      dlCiri.disabled = true;
      dlCiri.addEventListener("click", downloadCiriCsv);
    }

    setStatus("Ready. Choose a file and click “Process Document”.");
  });
})();
