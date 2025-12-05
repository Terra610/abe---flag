// intake/intake.js
// In-browser document + OCR bridge for A.B.E.
// Uses Tesseract.js (loaded from CDN in index.html) and Web Crypto.
// This is descriptive only; not legal advice.

(function(){
  const fileInput     = document.getElementById('file-input');
  const fileStatusEl  = document.getElementById('file-status');
  const textOutput    = document.getElementById('text-output');
  const docTypeEl     = document.getElementById('doc-type');
  const btnBuild      = document.getElementById('btn-build');
  const btnDownload   = document.getElementById('btn-download');
  const buildStatusEl = document.getElementById('build-status');
  const previewEl     = document.getElementById('artifact-preview');

  let currentFile   = null;
  let currentHash   = null;
  let lastArtifact  = null;

  // Helper: compute SHA-256 hex of an ArrayBuffer
  async function sha256Hex(buffer){
    if (!window.crypto || !crypto.subtle) {
      return null; // older browser fallback
    }
    const hashBuf = await crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(hashBuf))
      .map(b => b.toString(16).padStart(2,'0'))
      .join('');
  }

  // Handle file selection + OCR/text extraction
  fileInput.addEventListener('change', async (e)=>{
    const file = e.target.files[0];
    currentFile = null;
    currentHash = null;

    if (!file) {
      fileStatusEl.textContent = 'No file selected.';
      textOutput.value = '';
      previewEl.textContent = '{"status":"waiting for file…"}';
      return;
    }

    fileStatusEl.textContent = `Selected: ${file.name} (${file.type || 'unknown type'})`;
    buildStatusEl.textContent = '';
    previewEl.textContent = '{"status":"processing file…"}';
    btnDownload.disabled = true;
    lastArtifact = null;

    try {
      const buf = await file.arrayBuffer();
      currentHash = await sha256Hex(buf);
      currentFile = file;

      const type = (file.type || '').toLowerCase();

      // 1) Plain-text-like files: read directly
      if (type.startsWith('text/') || /\.txt$|\.md$|\.json$|\.csv$/i.test(file.name)){
        const text = new TextDecoder().decode(buf);
        textOutput.value = text;
        previewEl.textContent = '{"status":"text file loaded; ready to build artifact."}';
        return;
      }

      // 2) Images: run OCR via Tesseract
      if (type.startsWith('image/')){
        fileStatusEl.innerHTML = `Selected: ${file.name} <span class="pill warn">running OCR…</span>`;
        const result = await Tesseract.recognize(file, 'eng');
        const text = (result && result.data && result.data.text) ? result.data.text : '';
        textOutput.value = text.trim();
        fileStatusEl.innerHTML = `Selected: ${file.name} <span class="pill ok">OCR complete</span>`;
        previewEl.textContent = '{"status":"OCR text ready; review and clean, then build artifact."}';
        return;
      }

      // 3) Everything else (PDF etc.): try to decode as text, else fallback
      try {
        const text = new TextDecoder().decode(buf);
        textOutput.value = text.trim();
        previewEl.textContent = '{"status":"file loaded as text; check for gibberish before building."}';
      } catch (_) {
        textOutput.value = '';
        previewEl.textContent = '{"status":"file type not directly supported; paste relevant text above and then build."}';
      }

    } catch (err) {
      fileStatusEl.textContent = 'Error reading file.';
      previewEl.textContent = '{"error":"' + String(err && err.message || err) + '"}';
    }
  });

  // Build intake_artifact.json in memory
  btnBuild.addEventListener('click', ()=>{
    if (!currentFile) {
      buildStatusEl.textContent = 'Please select a file first.';
      return;
    }
    const normalized = textOutput.value.trim();
    if (!normalized) {
      buildStatusEl.textContent = 'Please ensure there is text in the box (OCR or pasted) before building.';
      return;
    }

    const targets = [];
    if (document.getElementById('tgt-ciri').checked) targets.push('CIRI');
    if (document.getElementById('tgt-cda').checked)  targets.push('CDA');
    if (document.getElementById('tgt-cff').checked)  targets.push('CFF');
    if (document.getElementById('tgt-ccri').checked) targets.push('CCRI');

    const artifact = {
      version: "1.0",
      module: "Intake",
      doc_type: docTypeEl.value,
      original_file_name: currentFile.name,
      original_file_hash: currentHash || "sha256_not_available_in_this_browser",
      ocr_used: !!(currentFile.type && currentFile.type.toLowerCase().startsWith('image/')),
      text_raw: null, // future: store pre-normalized text here if you want
      text_normalized: normalized,
      extracted_fields: {},      // future: per-doc-type parsing
      targets,
      generated_outputs: {
        ciri: { present: false },
        cda:  { present: false },
        cff:  { present: false },
        ccri: { present: false }
      },
      created_at: new Date().toISOString(),
      notes: "Intake artifact created locally in-browser. No server-side storage."
    };

    lastArtifact = artifact;
    previewEl.textContent = JSON.stringify(artifact, null, 2);
    buildStatusEl.textContent = 'Intake artifact built. Review and download.';
    btnDownload.disabled = false;
  });

  // Download JSON artifact
  btnDownload.addEventListener('click', ()=>{
    if (!lastArtifact) return;
    const blob = new Blob([JSON.stringify(lastArtifact,null,2)], {type:'application/json'});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    const safeName = (lastArtifact.original_file_name || 'document')
      .replace(/[^a-z0-9_.-]+/gi,'_');
    a.href = url;
    a.download = `intake_artifact_${safeName}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

})();
