// intake/intake.js
// Runs entirely in-browser. No network calls with user data.
// Uses PDF.js for text PDFs and Tesseract.js for images/scanned pages.

(function () {
  const $ = id => document.getElementById(id);

  const fileInput      = $('file-input');
  const textInput      = $('text-input');
  const docTypeSelect  = $('doc-type');
  const tCIRI          = $('t-ciri');
  const tCDA           = $('t-cda');
  const tCFF           = $('t-cff');
  const tCCRI          = $('t-ccri');
  const btnRun         = $('run-intake');
  const statusEl       = $('intake-status');
  const normTextEl     = $('norm-text');
  const fieldsEl       = $('fields-preview');
  const btnDlIntake    = $('dl-intake-json');
  const btnDlCiri      = $('dl-ciri-csv');

  let latestArtifact = null;
  let latestCiriCsv  = null;

  // ---------- helpers ----------

  function setStatus(text, kind) {
    statusEl.textContent = `Status: ${text}`;
    statusEl.className = 'intake-status';
    if (kind === 'ok')   statusEl.classList.add('pill','pill-ok');
    if (kind === 'warn') statusEl.classList.add('pill','pill-warn');
    if (kind === 'bad')  statusEl.classList.add('pill','pill-bad');
  }

  function normalizeText(str) {
    if (!str) return '';
    return str
      .replace(/\r\n/g, '\n')
      .replace(/\t/g, ' ')
      .replace(/ +/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  async function hashArrayBuffer(buf) {
    const hash = await crypto.subtle.digest('SHA-256', buf);
    const bytes = new Uint8Array(hash);
    return Array.from(bytes).map(b => b.toString(16).padStart(2,'0')).join('');
  }

  async function hashFile(file) {
    const buf = await file.arrayBuffer();
    return hashArrayBuffer(buf);
  }

  // ---------- PDF text extraction (PDF.js) ----------

  async function extractTextFromPdfFile(file) {
    const buf = await file.arrayBuffer();
    const uint8 = new Uint8Array(buf);

    // pdfjsLib is provided by the script tag in index.html
    const loadingTask = window['pdfjsLib'].getDocument({ data: uint8 });
    const pdf = await loadingTask.promise;

    let allText = '';
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();
      const strings = content.items.map(it => it.str);
      allText += strings.join(' ') + '\n\n';
    }
    return allText;
  }

  // ---------- image OCR (Tesseract.js) ----------

  async function ocrImageFile(file) {
    const { Tesseract } = window;
    if (!Tesseract || !Tesseract.recognize) {
      throw new Error('Tesseract.js not available');
    }
    const result = await Tesseract.recognize(file, 'eng');
    return result.data && result.data.text ? result.data.text : '';
  }

  // ---------- generic text extraction ----------

  function extractPlainTextFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Could not read file as text'));
      reader.onload  = () => resolve(String(reader.result || ''));
      reader.readAsText(file);
    });
  }

  async function extractTextFromFile(file) {
    const type = (file.type || '').toLowerCase();

    if (type.startsWith('image/')) {
      return ocrImageFile(file);
    }

    if (type === 'application/pdf') {
      return extractTextFromPdfFile(file);
    }

    // fallback: try text read
    return extractPlainTextFile(file);
  }

  // ---------- tiny heuristic extraction ----------

  function basicFieldGuess(normalizedText, docType) {
    const text = normalizedText || '';
    const fields = {};

    // Very light, safe hints. User is still in control.
    // Dollars
    const moneyMatches = text.match(/\$?\s?[\d,]+(\.\d{1,2})?/g) || [];
    fields.approx_dollar_values_found = moneyMatches.slice(0, 10);

    // Dates
    const dateMatches = text.match(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g) || [];
    fields.approx_dates_found = dateMatches.slice(0, 10);

    // For traffic tickets, try to guess a citation / code reference
    if (docType === 'traffic_ticket') {
      const codeMatch = text.match(/\b\d{3,4}\.\d{1,3}[A-Za-z0-9\-]*/);
      if (codeMatch) fields.possible_code_section = codeMatch[0];
    }

    // For loan contracts, try to spot APR / interest mentions
    if (docType === 'loan_contract') {
      const apr = text.match(/\b\d{1,2}\.\d{1,2}%|\b\d{1,2}%\b/);
      if (apr) fields.possible_apr = apr[0];
    }

    fields.preview_snippet = text.slice(0, 800);

    return fields;
  }

  // ---------- CIRI CSV starter row ----------

  function buildCiriCsvRow(normalizedText) {
    // Header matches the fields used in integration.js
    const header = [
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
      'transition_costs_one_time',
      'notes'
    ];

    // We keep the numbers zeroed by default to avoid guessing wrong.
    const row = new Array(header.length).fill(0);

    // Put the first 200 chars of text into notes so the user knows
    // which scenario this row came from.
    row[row.length - 1] = JSON.stringify(
      (normalizedText || '').slice(0, 200).replace(/\s+/g, ' ')
    );

    return header.join(',') + '\n' + row.join(',');
  }

  // ---------- main intake runner ----------

  async function runIntake() {
    try {
      btnRun.disabled = true;
      setStatus('running OCR + parsing (local only)…', 'warn');
      latestArtifact = null;
      latestCiriCsv  = null;
      btnDlIntake.disabled = true;
      btnDlCiri.disabled   = true;

      const files = Array.from(fileInput.files || []);
      const pasted = textInput.value || '';
      const docType = docTypeSelect.value;

      if (!files.length && !pasted.trim()) {
        setStatus('please add at least one file or some pasted text', 'bad');
        return;
      }

      const targets = [];
      if (tCIRI.checked) targets.push('CIRI');
      if (tCDA.checked)  targets.push('CDA');
      if (tCFF.checked)  targets.push('CFF');
      if (tCCRI.checked) targets.push('CCRI');

      // extract text from all files
      let combinedText = '';
      let primaryFileName = '';
      let primaryFileHash = null;

      if (files.length) {
        primaryFileName = files[0].name;
        primaryFileHash = await hashFile(files[0]);

        for (const f of files) {
          const t = await extractTextFromFile(f);
          if (t) {
            combinedText += '\n\n' + t;
          }
        }
      }

      combinedText += '\n\n' + (pasted || '');
      const normalized = normalizeText(combinedText);

      if (!normalized) {
        setStatus('Intake could not find readable text in these inputs.', 'bad');
        normTextEl.textContent = '— (no text extracted)';
        fieldsEl.textContent   = '{}';
        return;
      }

      // very small heuristic preview
      const extractedFields = basicFieldGuess(normalized, docType);

      // prepare artifacts
      const now = new Date().toISOString();

      const artifact = {
        version: '1.0',
        module: 'Intake',
        doc_type: docType,
        original_file_name: primaryFileName || '(text-only intake)',
        original_file_hash: primaryFileHash || ''.padEnd(64, '0'),
        ocr_used: !!files.length,
        text_raw: normalized,
        text_normalized: normalized,
        extracted_fields: extractedFields,
        targets,
        generated_outputs: {
          ciri: null,
          cda: null,
          cff: null,
          ccri: null
        },
        created_at: now,
        notes: ''
      };

      // build CIRI CSV starter row if target checked
      if (targets.includes('CIRI')) {
        const csv = buildCiriCsvRow(normalized);
        latestCiriCsv = csv;

        const encoder = new TextEncoder();
        const hash = await hashArrayBuffer(encoder.encode(csv));

        artifact.generated_outputs.ciri = {
          present: true,
          row_count: 1,
          csv_inline: csv,
          hash
        };
      } else {
        artifact.generated_outputs.ciri = { present: false };
      }

      // Stubs for other modules (just marking that we didn’t create anything yet)
      artifact.generated_outputs.cda  = { present: targets.includes('CDA')  ? false : false };
      artifact.generated_outputs.cff  = { present: targets.includes('CFF')  ? false : false };
      artifact.generated_outputs.ccri = { present: targets.includes('CCRI') ? false : false };

      latestArtifact = artifact;

      // update UI
      normTextEl.textContent = normalized;
      fieldsEl.textContent   = JSON.stringify(extractedFields, null, 2);

      setStatus('Intake complete — review text & download artifacts.', 'ok');

      btnDlIntake.disabled = false;
      btnDlCiri.disabled   = !latestCiriCsv;

    } catch (err) {
      console.error(err);
      setStatus('Intake failed: ' + (err.message || String(err)), 'bad');
      normTextEl.textContent = '—';
      fieldsEl.textContent   = '{}';
    } finally {
      btnRun.disabled = false;
    }
  }

  // ---------- download helpers ----------

  function downloadTextFile(name, text, type) {
    const blob = new Blob([text], { type: type || 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // wire buttons
  btnRun.addEventListener('click', () => {
    runIntake();
  });

  btnDlIntake.addEventListener('click', () => {
    if (!latestArtifact) return;
    downloadTextFile(
      `abe_intake_${Date.now()}.json`,
      JSON.stringify(latestArtifact, null, 2),
      'application/json'
    );
  });

  btnDlCiri.addEventListener('click', () => {
    if (!latestCiriCsv) return;
    downloadTextFile(`ciri_intake_row_${Date.now()}.csv`, latestCiriCsv, 'text/csv');
  });

})();
