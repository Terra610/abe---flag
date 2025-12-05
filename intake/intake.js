// /intake/intake.js
// Intake + OCR bridge for A.B.E.
// Plain-language comments, client-side only. No uploads to any server.

// --- small helper: SHA-256 hash (hex) of an ArrayBuffer ---
async function sha256Hex(buffer) {
  const hash = await crypto.subtle.digest("SHA-256", buffer);
  const bytes = new Uint8Array(hash);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

// --- small helper: normalize text for display + extraction ---
function normalizeText(str) {
  if (!str) return "";
  return str
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// --- build the intake artifact object that matches intake/schema.json ---
function buildArtifact({ docType, fileName, fileHash, ocrUsed, textRaw, textNorm, targets }) {
  const now = new Date().toISOString();

  return {
    version: "1.0",
    module: "Intake",
    doc_type: docType,
    original_file_name: fileName,
    original_file_hash: fileHash,
    ocr_used: ocrUsed,
    text_raw: textRaw,
    text_normalized: textNorm,
    extracted_fields: {
      // This is intentionally minimal for now; can be extended later.
      approx_char_count: textNorm.length,
      has_dollar_sign: /\$[0-9]/.test(textNorm),
      has_date_pattern: /\b(20[0-9]{2}|19[0-9]{2})\b/.test(textNorm)
    },
    targets: targets,
    generated_outputs: {
      ciri: {
        present: false
      },
      cda: {
        present: false
      },
      cff: {
        present: false
      },
      ccri: {
        present: false
      }
    },
    created_at: now,
    notes: "Initial Intake artifact. Helper files (CIRI CSV, CDA scenario, CFF/CCRI stubs) can be added in later versions."
  };
}

(function () {
  const dropZone   = document.getElementById("drop-zone");
  const fileInput  = document.getElementById("file-input");
  const fileInfoEl = document.getElementById("file-info");
  const docTypeEl  = document.getElementById("doc-type");
  const statusEl   = document.getElementById("status-line");
  const textEl     = document.getElementById("intake-text");
  const fieldsEl   = document.getElementById("intake-fields");
  const btnProcess = document.getElementById("btn-process");
  const btnDlInt   = document.getElementById("btn-download-intake");

  const targetCIRI = document.getElementById("target-ciri");
  const targetCDA  = document.getElementById("target-cda");
  const targetCFF  = document.getElementById("target-cff");
  const targetCCRI = document.getElementById("target-ccri");

  let currentFile = null;
  let currentArtifact = null;

  if (!dropZone || !fileInput) {
    console.warn("Intake UI elements not found; aborting init.");
    return;
  }

  // --- wire drop zone ---
  dropZone.addEventListener("click", () => fileInput.click());

  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("dragover");
  });

  dropZone.addEventListener("dragleave", (e) => {
    e.preventDefault();
    dropZone.classList.remove("dragover");
  });

  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("dragover");
    const f = e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) {
      handleFileSelected(f);
    }
  });

  fileInput.addEventListener("change", (e) => {
    const f = e.target.files && e.target.files[0];
    if (f) {
      handleFileSelected(f);
    }
  });

  function handleFileSelected(file) {
    currentFile = file;
    currentArtifact = null;
    fileInfoEl.textContent = `Selected: ${file.name} (${file.type || "unknown type"}, ${file.size} bytes)`;
    statusEl.textContent = "Ready to run Intake. Click “Run Intake (OCR + Normalize)”.";
    textEl.textContent = "No text yet — run Intake first.";
    fieldsEl.textContent = "{}";
    btnDlInt.disabled = true;
  }

  // --- core Intake pipeline ---
  btnProcess.addEventListener("click", async () => {
    if (!currentFile) {
      statusEl.textContent = "No file selected. Choose or drop a file first.";
      return;
    }

    statusEl.textContent = "Reading file and computing hash…";
    btnProcess.disabled = true;
    btnProcess.textContent = "Processing…";
    currentArtifact = null;
    btnDlInt.disabled = true;

    try {
      const arrayBuffer = await currentFile.arrayBuffer();
      const fileHash = await sha256Hex(arrayBuffer);

      const mime = currentFile.type || "";
      let textRaw = "";
      let ocrUsed = false;

      if (mime.startsWith("image/")) {
        // OCR path
        statusEl.textContent = "Running OCR on image (this can take a moment)…";
        ocrUsed = true;
        const res = await Tesseract.recognize(currentFile, "eng");
        textRaw = res.data && res.data.text ? res.data.text : "";
      } else if (mime.startsWith("text/")) {
        // plain text
        statusEl.textContent = "Reading text file…";
        textRaw = await currentFile.text();
      } else if (mime === "application/pdf") {
        // simple placeholder for now
        statusEl.textContent = "PDF detected. Text extraction is not implemented yet; please copy-paste text for now.";
        textRaw = "[PDF detected — inline extraction not implemented in this version. You can copy-paste text into a .txt file and re-run Intake.]";
      } else {
        statusEl.textContent = "Unknown file type; treating as binary and not attempting OCR.";
        textRaw = "[Unsupported file type for OCR in this version. Use an image, text, or PDF (with copy-paste workaround).]";
      }

      const textNorm = normalizeText(textRaw);
      textEl.textContent = textNorm || "(No readable text was produced from this document.)";

      const docType = docTypeEl.value || "generic_case_text";

      // Build targets from checkboxes
      const targets = [];
      if (targetCIRI.checked) targets.push("CIRI");
      if (targetCDA.checked)  targets.push("CDA");
      if (targetCFF.checked)  targets.push("CFF");
      if (targetCCRI.checked) targets.push("CCRI");

      const artifact = buildArtifact({
        docType,
        fileName: currentFile.name,
        fileHash,
        ocrUsed,
        textRaw,
        textNorm,
        targets
      });

      currentArtifact = artifact;
      fieldsEl.textContent = JSON.stringify(artifact.extracted_fields, null, 2);
      btnDlInt.disabled = false;

      statusEl.textContent = "Intake complete. You can now download intake_artifact.json.";
      btnProcess.textContent = "Run Intake (OCR + Normalize)";
    } catch (err) {
      console.error(err);
      statusEl.textContent = "Intake failed: " + (err && err.message ? err.message : String(err));
      btnProcess.textContent = "Run Intake (OCR + Normalize)";
    } finally {
      btnProcess.disabled = false;
    }
  });

  // --- download artifact ---
  btnDlInt.addEventListener("click", () => {
    if (!currentArtifact) return;
    const blob = new Blob([JSON.stringify(currentArtifact, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safeName = (currentArtifact.original_file_name || "document").replace(/[^a-z0-9_\-\.]+/gi, "_");
    a.download = `intake_artifact_${safeName}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });
})();
