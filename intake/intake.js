// intake/intake.js
// In-browser document intake + OCR bridge for A.B.E.
// Handles: images, PDFs (multi-page), and plain text.
// Produces: intake_artifact.json + optional single-row CIRI CSV.
//
// All processing is local to the browser. No network calls.

(function () {
  const fileInput      = document.getElementById('file-input');
  const docTypeSelect  = document.getElementById('doc-type');
  const btnOcr         = document.getElementById('btn-ocr');
  const ocrStatusEl    = document.getElementById('ocr-status');
  const statusEl       = document.getElementById('status');
  const textArea       = document.getElementById('normalized-text');
  const previewEl      = document.getElementById('extracted-preview');
  const btnArtifact    = document.getElementById('btn-generate-artifact');
  const btnCiriCsv     = document.getElementById('btn-download-ciri');
  const artifactStatus = document.getElementById('artifact-status');

  const targetCiri = document.getElementById('target-ciri');
  const targetCda  = document.getElementById('target-cda');
  const targetCff  = document.getElementById('target-cff');
  const targetCcri = document.getElementById('target-ccri');

  let lastArtifact = null;
  let lastCiriCsv  = null;

  // -------- helpers --------

  const setStatus = (msg) => {
    statusEl.textContent = msg || '';
  };

  const setPill = (el, state, text) => {
    el.className = 'pill';
    if (state === 'ok') el.classList.add('pill-ok');
    else if (state === 'warn') el.classList.add('pill-warn');
    else if (state === 'bad') el.classList.add('pill-bad');
    if (text) el.textContent = text;
  };

  const readFileAsArrayBuffer = (file) =>
    new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsArrayBuffer(file);
    });

  const readFileAsText = (file) =>
    new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsText(file);
    });

  const bufferToHex = (buffer) => {
    const bytes = new Uint8Array(buffer);
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  };

  async function hashFile(file) {
    const buf = await readFileAsArrayBuffer(file);
    const digest = await crypto.subtle.digest('SHA-256', buf);
    return bufferToHex(digest);
  }

  // -------- OCR engines --------

  async function ocrImageFile(file) {
    setStatus('Running Tesseract OCR on image… this may take a moment.');
    const { data } = await Tesseract.recognize(file, 'eng', {
      logger: m => {
        if (m.status && m.progress != null) {
          setStatus(`OCR: ${m.status} (${Math.round(m.progress * 100)}%)`);
        }
      }
    });
    return data.text || '';
  }

  async function extractPdfTextDirect(arrayBuffer) {
    // Try PDF text layer first (fast for digital PDFs).
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    let full = '';
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();
      const strings = content.items.map(i => i.str).join(' ');
      if (strings.trim()) {
        full += `\n\n--- Page ${pageNum} ---\n` + strings;
      }
    }
    return full.trim();
  }

  async function ocrPdfPages(arrayBuffer) {
    // Fallback OCR for scanned PDFs: render each page to canvas and OCR via Tesseract.
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    let full = '';
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      setStatus(`Rendering PDF page ${pageNum}/${pdf.numPages} for OCR…`);
      await page.render({ canvasContext: ctx, viewport }).promise;

      setStatus(`Running OCR on page ${pageNum}/${pdf.numPages}…`);
      const dataUrl = canvas.toDataURL('image/png');
      const { data } = await Tesseract.recognize(dataUrl, 'eng');
      full += `\n\n--- Page ${pageNum} (OCR) ---\n` + (data.text || '');
    }
    return full.trim();
  }

  async function extractTextFromFile(file) {
    if (!file) throw new Error('No file selected.');

    const type = (file.type || '').toLowerCase();
    const name = file.name.toLowerCase();

    if (type.startsWith('image/')) {
      setPill(ocrStatusEl, 'warn', 'OCR: image');
      return ocrImageFile(file);
    }

    if (type === 'application/pdf' || name.endsWith('.pdf')) {
      setPill(ocrStatusEl, 'warn', 'OCR: PDF (multi-page)');
      const buf = await readFileAsArrayBuffer(file);

      // Try fast text layer first
      let txt = '';
      try {
        txt = await extractPdfTextDirect(buf);
      } catch (e) {
        console.warn('PDF text-layer extraction failed, falling back to OCR:', e);
      }
      if (txt && txt.length > 80) {
        setStatus('PDF text layer extracted successfully (digital PDF).');
        return txt;
      }
      // Fallback to full OCR per page
      return ocrPdfPages(buf);
    }

    if (type.startsWith('text/') || name.endsWith('.txt') || name.endsWith('.md')) {
      setPill(ocrStatusEl, 'ok', 'Text file (no OCR)');
      setStatus('Reading plain text file (no OCR needed).');
      return readFileAsText(file);
    }

    // Last resort: try reading as text anyway
    setPill(ocrStatusEl, 'warn', 'Unknown type, trying text read.');
    return readFileAsText(file);
  }

  // -------- field extraction (lightweight, doc-type aware) --------

  function basicExtract(docType, text) {
    const sample = text.slice(0, 600);
    const length = text.length;

    const common = {
      doc_type: docType,
      text_length: length,
      sample: sample
    };

    if (docType === 'traffic_ticket') {
      const dateMatch = text.match(/\b(20\d{2}[-/]\d{1,2}[-/]\d{1,2})\b/);
      const citationMatch = text.match(/\b(Case\s*No\.?|Citation\s*No\.?|Ticket)\s*[:#]?\s*([A-Z0-9-]+)/i);
      return {
        ...common,
        probable_violation_date: dateMatch ? dateMatch[1] : null,
        probable_citation_id: citationMatch ? citationMatch[2] : null
      };
    }

    if (docType === 'loan_contract') {
      const amountMatch = text.match(/\$\s?([\d,]+(?:\.\d{2})?)/);
      const aprMatch = text.match(/\b(\d{1,2}\.\d{1,2})\s*%?\s*APR\b/i);
      return {
        ...common,
        probable_amount: amountMatch ? amountMatch[1] : null,
        probable_apr_percent: aprMatch ? aprMatch[1] : null
      };
    }

    if (docType === 'cps_case') {
      const caseMatch = text.match(/\b(Case\s*No\.?|Case\s*#)\s*[:#]?\s*([A-Z0-9-]+)/i);
      return {
        ...common,
        probable_case_id: caseMatch ? caseMatch[2] : null
      };
    }

    return common;
  }

  // Single-row CIRI CSV helper (minimal, user-editable later)
  function buildCiriCsvFromText(text) {
    // Use very conservative defaults; this is more “starter row” than truth.
    const headers = [
      'cases_avoided',
      'avg_cost_per_case',
      'jail_days_avoided',
      'cost_per_jail_day',
      'fees_canceled_total',
      'policy_corrections',
      'avg_enforcement_cost_savings',
      'households_restored',
      'avg_monthly_market_spend',
      'months_effective',
      'employment_probability',
      'avg_monthly_wage',
      'expected_lawsuits',
      'avg_payout',
      'litigation_multiplier',
      'transition_costs_one_time'
    ];

    // Very rough guess: 1 case; user will update in CIRI proper.
    const row = [
      1,          // cases_avoided
      800,        // avg_cost_per_case
      1,          // jail_days_avoided
      100,        // cost_per_jail_day
      0,          // fees_canceled_total
      0,          // policy_corrections
      0,          // avg_enforcement_cost_savings
      1,          // households_restored
      600,        // avg_monthly_market_spend
      12,         // months_effective
      0.4,        // employment_probability
      2400,       // avg_monthly_wage
      0,          // expected_lawsuits
      0,          // avg_payout
      1.0,        // litigation_multiplier
      0           // transition_costs_one_time
    ];

    return headers.join(',') + '\n' + row.join(',');
  }

  async function hashString(str) {
    const enc = new TextEncoder().encode(str);
    const digest = await crypto.subtle.digest('SHA-256', enc);
    return bufferToHex(digest);
  }

  // -------- main button handlers --------

  btnOcr.addEventListener('click', async () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) {
      alert('Choose a file first.');
      return;
    }
    setPill(ocrStatusEl, 'warn', 'processing…');
    setStatus('Starting OCR / text extraction…');

    try {
      const text = (await extractTextFromFile(file)) || '';
      const cleaned = text.replace(/\r\n/g, '\n').trim();
      textArea.value = cleaned;
      setPill(ocrStatusEl, 'ok', 'text ready');
      setStatus(`Extracted ~${cleaned.length} characters of text.`);
      previewEl.textContent = 'Run “Generate A.B.E. Artifact” to see structured preview.';
      lastArtifact = null;
      lastCiriCsv = null;
      artifactStatus.textContent = 'no artifact yet';
      artifactStatus.className = 'pill pill-warn';
      btnCiriCsv.disabled = true;
    } catch (err) {
      console.error(err);
      setPill(ocrStatusEl, 'bad', 'error');
      setStatus('Error during OCR: ' + err.message);
    }
  });

  btnArtifact.addEventListener('click', async () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) {
      alert('Choose a file and run OCR first.');
      return;
    }

    const normalized = (textArea.value || '').trim();
    if (!normalized) {
      alert('Run OCR or paste text into the box before generating the artifact.');
      return;
    }

    try {
      artifactStatus.textContent = 'building…';
      artifactStatus.className = 'pill pill-warn';

      const docType = docTypeSelect.value;
      const originalHash = await hashFile(file);
      const textHash = await hashString(normalized);
      const extracted = basicExtract(docType, normalized);

      const targets = [];
      if (targetCiri.checked) targets.push('CIRI');
      if (targetCda.checked)  targets.push('CDA');
      if (targetCff.checked)  targets.push('CFF');
      if (targetCcri.checked) targets.push('CCRI');

      // Optional CIRI CSV (always generated if targetCiri checked)
      let ciriMeta = null;
      if (targetCiri.checked) {
        const csv = buildCiriCsvFromText(normalized);
        lastCiriCsv = csv;
        const csvHash = await hashString(csv);
        ciriMeta = {
          present: true,
          row_count: 1,
          csv_inline: csv,
          hash: csvHash
        };
        btnCiriCsv.disabled = false;
      } else {
        lastCiriCsv = null;
        btnCiriCsv.disabled = true;
        ciriMeta = { present: false };
      }

      const artifact = {
        version: "1.0",
        module: "Intake",
        doc_type: docType,
        original_file_name: file.name,
        original_file_hash: originalHash,
        ocr_used: !(file.type.startsWith('text/') || file.name.toLowerCase().endsWith('.txt')),
        text_raw: null, // we only keep normalized to keep size down
        text_normalized: normalized,
        extracted_fields: extracted,
        targets,
        generated_outputs: {
          ciri: ciriMeta,
          cda: { present: targetCda.checked, scenario: null, hash: "" },
          cff: { present: targetCff.checked, row_count: 0, csv_inline: "", hash: "" },
          ccri:{ present: targetCcri.checked, scenario: null, hash: "" }
        },
        created_at: new Date().toISOString(),
        notes: "Generated locally by A.B.E. Intake. No server received this document or text."
      };

      lastArtifact = artifact;

      // Pretty preview
      previewEl.textContent = JSON.stringify({
        doc_type: artifact.doc_type,
        original_file_name: artifact.original_file_name,
        original_file_hash: artifact.original_file_hash,
        targets: artifact.targets,
        extracted_fields: artifact.extracted_fields,
        generated_outputs: {
          ciri: artifact.generated_outputs.ciri && { present: artifact.generated_outputs.ciri.present },
          cda: { present: artifact.generated_outputs.cda.present },
          cff: { present: artifact.generated_outputs.cff.present },
          ccri:{ present: artifact.generated_outputs.ccri.present }
        }
      }, null, 2);

      // Trigger download of intake_artifact.json
      const blob = new Blob([JSON.stringify(artifact, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `intake_artifact_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      artifactStatus.textContent = 'artifact generated';
      artifactStatus.className = 'pill pill-ok';
      setStatus('Artifact generated and downloaded. You can attach it to Integration / CIRI runs.');
    } catch (err) {
      console.error(err);
      artifactStatus.textContent = 'error';
      artifactStatus.className = 'pill pill-bad';
      setStatus('Error generating artifact: ' + err.message);
    }
  });

  btnCiriCsv.addEventListener('click', () => {
    if (!lastCiriCsv) return;
    const blob = new Blob([lastCiriCsv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ABE_CIRI_FROM_INTAKE.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

})();
