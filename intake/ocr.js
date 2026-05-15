// intake/ocr.js — Pure client-side OCR using Tesseract.js (local-first)
async function loadTesseract() {
  if (typeof Tesseract === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@v5.0.5/dist/tesseract.min.js';
    document.head.appendChild(script);
    await new Promise(r => script.onload = r);
  }
  return Tesseract;
}

async function performOCR(imageFile, language = 'eng') {
  const statusEl = document.getElementById('ocr-status');
  if (statusEl) statusEl.textContent = 'Loading OCR engine...';

  const Tesseract = await loadTesseract();

  if (statusEl) statusEl.textContent = 'Recognizing text... (this may take 10–30 seconds)';

  try {
    const worker = await Tesseract.createWorker(language, 1, {
      logger: m => {
        if (statusEl && m.status === 'recognizing text') {
          statusEl.textContent = `Progress: ${Math.round(m.progress * 100)}%`;
        }
      }
    });

    const result = await worker.recognize(imageFile);
    await worker.terminate();

    const text = result.data.text.trim();

    if (statusEl) {
      statusEl.innerHTML = `<span style="color:var(--ok)">✅ OCR complete — ${text.length} characters extracted.</span>`;
    }

    return {
      success: true,
      text: text,
      confidence: result.data.confidence,
      words: result.data.words.length
    };

  } catch (err) {
    console.error(err);
    if (statusEl) statusEl.innerHTML = `<span style="color:var(--bad)">OCR failed: ${err.message}</span>`;
    return { success: false, error: err.message };
  }
}

// Auto-attach to any file input with id="ocr-upload"
document.addEventListener('DOMContentLoaded', () => {
  const fileInput = document.getElementById('ocr-upload');
  if (fileInput) {
    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const result = await performOCR(file);
      
      // Send extracted text to main intake area if it exists
      const textarea = document.getElementById('intake-text');
      if (textarea && result.success) {
        textarea.value = (textarea.value ? textarea.value + '\n\n' : '') + result.text;
      }
    });
  }
});
