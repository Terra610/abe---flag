// intake/intake.js
// Runs entirely in-browser. No network calls with user data.
// Uses PDF.js for text PDFs and Tesseract.js for images/scanned pages.

(function () {
  const $ = id => document.getElementById(id);

  const fileInput      = $('file-input');
  const textInput      = $('text-input');
  const docTypeSelect  = $('doc-type');

  // NOTE: these IDs now match your HTML (target-ciri, target-cda, etc.)
  const tCIRI          = $('target-ciri');
  const tCDA           = $('target-cda');
  const tCFF           = $('target-cff');
  const tCCRI          = $('target-ccri');

  const btnRun         = $('run-intake');

  // Your status span is id="status"
  const statusEl       = $('status');

  // Right-hand previews
  const normTextEl     = $('norm-text');     // <pre id="norm-text">
  const fieldsEl       = $('fields-json');   // <pre id="fields-json">

  // Download button is id="download-artifact"
  const btnDlIntake    = $('download-artifact');

  // You don’t currently have a CIRI CSV download button in the HTML,
  // so this may be null. We’ll guard against that.
  const btnDlCiri      = $('dl-ciri-csv');

  let latestArtifact = null;
  let latestCiriCsv  = null;

  // ---------- helpers ----------

  function setStatus(text, kind) {
    if (!statusEl) return;
    statusEl.textContent = `Status: ${text}`;
    statusEl.className = 'status-line';
    if (kind === 'ok')   statusEl.classList.add('status-ok');
    if (kind === 'warn') statusEl.classList.add('status-warn');
    if (kind === 'bad')  statusEl.classList.add('status-err');
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
    if (!window['pdfjsLib']) {
      throw new Error('PDF.js not available (pdfjsLib not found)');
    }
    const buf = await file.arrayBuffer();
    const uint8 = new Uint8Array(buf);

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
    const T = window.Tesseract;
    if (!T || !T.recognize) {
      throw new Error('Tesseract.js not available');
    }
    const result = await T.recognize(file, 'eng');
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
  
  // ---------- vehicle doc extraction (title / registration) ----------
  
  function vehicleScopeGuess(normalizedText){
  const text = (normalizedText || '').toUpperCase();
  const scope = {
    doc_type_detected: null,
    raw_hits: [],
    paperwork_suggests_commercial: null,
    gvwr_estimate_lbs: null,
    plate_class_hits: [],
    notes: ''
  };

  // title vs registration signals
  if(text.includes('CERTIFICATE OF TITLE')) scope.doc_type_detected = 'title';
  if(text.includes('REGISTRATION')) scope.doc_type_detected = scope.doc_type_detected || 'registration';

  // class keywords
  const classHits = [];
  const classPatterns = [
    'COMMERCIAL','TRUCK','TRK','TRUCK TRACTOR','BUS','APPORTIONED','FOR HIRE','FLEET',
    'PASSENGER','PRIVATE','NON-COMMERCIAL'
  ];
  classPatterns.forEach(p=>{ if(text.includes(p)) classHits.push(p); });
  scope.raw_hits = classHits;

  // GVWR
  const gvwrMatch = text.match(/\b(GVWR|GROSS WEIGHT|GROSS WT)[^0-9]{0,10}([\d,]{4,6})\b/);
  if(gvwrMatch && gvwrMatch[2]){
    const num = Number(gvwrMatch[2].replace(/,/g,''));
    if(!Number.isNaN(num)) scope.gvwr_estimate_lbs = num;
  }

  // plate type hints
  const plateHits = [];
  const platePatterns = ['PLATE TYPE','CLASS:','CLASS CODE','PAS','COM','FARM','GVT','DLR'];
  platePatterns.forEach(p=>{ if(text.includes(p)) plateHits.push(p); });
  scope.plate_class_hits = plateHits;

  // paperwork commercial vs passenger
  const commercialTokens = ['COMMERCIAL','TRK','TRUCK','TRUCK TRACTOR','APPORTIONED','FOR HIRE','BUS','FLEET'];
  const passengerTokens  = ['PASSENGER','PRIVATE','NON-COMMERCIAL'];

  const commercialHit = commercialTokens.some(t => text.includes(t));
  const passengerHit  = passengerTokens.some(t => text.includes(t));

  if (commercialHit && !passengerHit) scope.paperwork_suggests_commercial = true;
  else if (passengerHit && !commercialHit) scope.paperwork_suggests_commercial = false;
  else scope.paperwork_suggests_commercial = null;

  scope.notes = "Heuristic only. Paperwork ≠ CMV status. CMV requires actual commerce.";

  return scope;
}

 // ---------- tiny heuristic extraction ----------

 function basicFieldGuess(normalizedText, docType) {
  const text = normalizedText || '';
  const fields = {};

  // Very light hints. User is still in control.

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

  // NEW: Vehicle docs → parse CMV / exempt paperwork signals
  if (docType === 'vehicle_title' || docType === 'vehicle_registration') {
    fields.vehicle_scope = vehicleScopeGuess(normalizedText);
  }

  fields.preview_snippet = text.slice(0, 800);

  return fields;
}

  // ---------- CIRI CSV starter row ----------

  function buildCiriCsvRow(normalizedText) {
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

    const row = new Array(header.length).fill(0);

    row[row.length - 1] = JSON.stringify(
      (normalizedText || '').slice(0, 200).replace(/\s+/g, ' ')
    );

    return header.join(',') + '\n' + row.join(',');
  }

  // ---------- main intake runner ----------

  async function runIntake() {
    try {
      if (btnRun) btnRun.disabled = true;
      setStatus('running OCR + parsing (local only)…', 'warn');
      latestArtifact = null;
      latestCiriCsv  = null;
      if (btnDlIntake) btnDlIntake.disabled = true;
      if (btnDlCiri)   btnDlCiri.disabled   = true;

      const files   = Array.from((fileInput && fileInput.files) || []);
      const pasted  = textInput ? (textInput.value || '') : '';
      const docType = docTypeSelect ? docTypeSelect.value : 'generic_case_text';

      if (!files.length && !pasted.trim()) {
        setStatus('please add at least one file or some pasted text', 'bad');
        return;
      }

      const targets = [];
      if (tCIRI && tCIRI.checked) targets.push('CIRI');
      if (tCDA  && tCDA.checked)  targets.push('CDA');
      if (tCFF  && tCFF.checked)  targets.push('CFF');
      if (tCCRI && tCCRI.checked) targets.push('CCRI');

      let combinedText = '';
      let primaryFileName = '';
      let primaryFileHash = null;

      if (files.length) {
        primaryFileName = files[0].name;
        primaryFileHash = await hashFile(files[0]);

        for (const f of files) {
          const t = await extractTextFromFile(f);
          if (t) combinedText += '\n\n' + t;
        }
      }

      combinedText += '\n\n' + (pasted || '');
      const normalized = normalizeText(combinedText);

      if (!normalized) {
        setStatus('Intake could not find readable text in these inputs.', 'bad');
        if (normTextEl) normTextEl.textContent = '— (no text extracted)';
        if (fieldsEl)   fieldsEl.textContent   = '{}';
        return;
      }

      const extractedFields = basicFieldGuess(normalized, docType);
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

      artifact.generated_outputs.cda  = { present: targets.includes('CDA')  ? false : false };
      artifact.generated_outputs.cff  = { present: targets.includes('CFF')  ? false : false };
      artifact.generated_outputs.ccri = { present: targets.includes('CCRI') ? false : false };

      latestArtifact = artifact;

      if (normTextEl) normTextEl.textContent = normalized;
      if (fieldsEl)   fieldsEl.textContent   = JSON.stringify(extractedFields, null, 2);

      setStatus('Intake complete — review text & download artifacts.', 'ok');

      if (btnDlIntake) btnDlIntake.disabled = false;
      if (btnDlCiri)   btnDlCiri.disabled   = !latestCiriCsv;

      // store artifact so CIRI / others can pick it up automatically
      try {
        localStorage.setItem('abe_intake_artifact', JSON.stringify(artifact));
      } catch (e) {
        console.warn('Could not store intake artifact in localStorage:', e);
      }

    } catch (err) {
      console.error(err);
      setStatus('Intake failed: ' + (err.message || String(err)), 'bad');
      if (normTextEl) normTextEl.textContent = '—';
      if (fieldsEl)   fieldsEl.textContent   = '{}';
    } finally {
      if (btnRun) btnRun.disabled = false;
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

  if (btnDlIntake) {
    btnDlIntake.addEventListener('click', () => {
      if (!latestArtifact) return;
      downloadTextFile(
        `abe_intake_${Date.now()}.json`,
        JSON.stringify(latestArtifact, null, 2),
        'application/json'
      );
    });
  }

  if (btnDlCiri) {
    btnDlCiri.addEventListener('click', () => {
      if (!latestCiriCsv) return;
      downloadTextFile(`ciri_intake_row_${Date.now()}.csv`, latestCiriCsv, 'text/csv');
    });
  }

  if (btnRun) {
    btnRun.addEventListener('click', () => {
      runIntake();
    });
  }

})();
