<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Intake — Document + OCR Bridge | A.B.E.</title>
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <base href="/abe---flag/">
  <link rel="stylesheet" href="abe-patch/assets/abe-patch.css" />
</head>
<body class="abe-page">

<header class="abe-header">
  <h1>Intake — Document + OCR Bridge</h1>
  <p class="tagline">
    Front door for tickets, scans, PDFs, and case write-ups. Everything runs locally in your browser —
    no servers, no tracking, no uploads to anyone.
  </p>
  <nav class="chip-row">
    <a class="chip" href="index.html">ABE Home</a>
    <a class="chip" href="start/index.html">Start Here</a>
    <a class="chip" href="ciri/index.html">CIRI</a>
    <a class="chip" href="cda/index.html">CDA</a>
    <a class="chip" href="cff/index.html">CFF</a>
    <a class="chip" href="ccri/index.html">CCRI</a>
    <a class="chip" href="cibs/index.html">CIBS</a>
    <a class="chip" href="integration/index.html">Integration</a>
    <a class="chip chip-alt" href="system/index.html">System Map</a>
  </nav>
</header>

<main class="abe-main">

  <!-- What this does -->
  <section class="card">
    <h2>What Intake Does</h2>
    <p>
      Most people don’t start with a CSV — they start with a <strong>ticket, letter, PDF, or contract</strong>.
      Intake turns that one document into structured data that the rest of A.B.E. can understand.
    </p>
    <ul>
      <li>Reads text from images and PDFs using in-browser OCR (Tesseract.js).</li>
      <li>Lets you edit/confirm the important fields in plain language.</li>
      <li>Builds:
        <strong>Intake artifact JSON</strong> + optional
        <strong>CIRI-ready CSV</strong> (and later CDA / CFF / CCRI stubs).
      </li>
    </ul>
    <p class="small-note">
      All processing happens locally. Your file never leaves your device. You decide what to keep,
      what to delete, and what (if anything) to publish.
    </p>
  </section>

  <!-- Upload + document type -->
  <section class="card">
    <h2>1. Upload your document</h2>
    <p>
      You can upload: ticket photos, CPS letters, policy memos, loan contracts, or a simple
      text file describing what happened.
    </p>

    <div class="field-row">
      <label for="file" class="field-label">Choose file</label>
      <input id="file" type="file" accept=".png,.jpg,.jpeg,.pdf,.txt,.doc,.docx,.rtf,.html,.htm" />
    </div>

    <div class="field-row" style="margin-top:0.75rem;">
      <label for="doc-type" class="field-label">What kind of document is this?</label>
      <select id="doc-type">
        <option value="traffic_ticket">Traffic ticket / citation</option>
        <option value="cps_case">CPS / child welfare notice</option>
        <option value="policy_memo">Policy memo / internal directive</option>
        <option value="loan_contract">Loan or finance contract</option>
        <option value="generic_case_text">General case write-up</option>
      </select>
    </div>

    <p class="small-note">
      Intake will tune its field suggestions based on this type (e.g., ticket number, code sections,
      agency, amounts, lender, APR, etc.).
    </p>
  </section>

  <!-- Preview + extracted fields -->
  <section class="card">
    <h2>2. Review text & key fields</h2>
    <p>
      Intake uses OCR when needed, then normalizes the text. You can correct anything before creating
      engine-ready files.
    </p>

    <div class="grid-2">
      <div>
        <h3>Normalized Text</h3>
        <p class="small-note">
          This is what the engine will actually read. You can edit freely.
        </p>
        <textarea id="text-normalized" rows="16" class="mono"
          placeholder="Text will appear here after OCR / extraction…"></textarea>
      </div>

      <div>
        <h3>Extracted Fields (editable)</h3>
        <p class="small-note">
          These are starter fields. You can change or clear anything that isn’t accurate.
        </p>

        <div id="extracted-fields">
          <!-- intake.js will populate this with simple key/value rows -->
        </div>

        <p class="small-note">
          Example fields for a ticket:
          <code>incident_date</code>,
          <code>agency</code>,
          <code>code_section</code>,
          <code>fine_amount</code>,
          <code>jail_days</code>.
        </p>
      </div>
    </div>
  </section>

  <!-- Run + downloads -->
  <section class="card">
    <h2>3. Build engine-ready files</h2>
    <p>
      When you’re ready, click <strong>Process Document</strong>. Intake will:
    </p>
    <ul>
      <li>Create a <strong>hash-locked Intake artifact</strong>
        (<code>intake_artifact.json</code> style) with your normalized text + fields.</li>
      <li>Optionally generate a single-row <strong>CIRI inputs CSV</strong> you can
        upload straight into the CIRI calculator.</li>
      <li>Mark which modules this scenario is connected to (CIRI, CDA, CFF, CCRI).</li>
    </ul>

    <button id="btn-run-intake" class="btn">
      Process Document
    </button>

    <div style="margin-top:1rem;">
      <button id="btn-download-intake" class="btn btn-ghost" disabled>
        Download Intake Artifact (JSON)
      </button>

      <button id="btn-download-ciri" class="btn btn-ghost" disabled style="margin-left:.5rem;">
        Download CIRI CSV
      </button>

      <div id="status"
           class="small-note mono"
           style="margin-top:.75rem; white-space:pre-wrap;">
        Ready. Choose a file and document type to begin.
      </div>
    </div>
  </section>

  <!-- How it connects -->
  <section class="card">
    <h2>Where this goes in the A.B.E. engine</h2>
    <ul class="small-note">
      <li>
        <strong>CIRI</strong> — Intake can emit a minimal
        <code>ciri/inputs.csv</code> row so you can run harm + recovery
        without touching a spreadsheet.
      </li>
      <li>
        <strong>CDA</strong> — Text + fields can be turned into a
        <em>divergence scenario</em> (how the statute or practice drifts from
        controlling law).
      </li>
      <li>
        <strong>CFF / AFFE</strong> — Funding or grant language in the doc can be
        tagged as <code>ON_MISSION / OFF_MISSION / UNCLEAR</code>.
      </li>
      <li>
        <strong>CCRI</strong> — Loan / credit docs can become CCRI scenarios
        (how underwriting uses DMV / DOT or other unlawful data).
      </li>
    </ul>
    <p class="small-note">
      Integration will later hash the Intake artifact and any generated CSV/JSON outputs
      and issue a <strong>SHA-256 audit receipt</strong>.
    </p>
  </section>

</main>

<footer class="abe-footer">
  <p>
    A.B.E. — American Butterfly Effect · Intake module ·
    CC BY-NC 4.0 · DOI
    <a href="https://doi.org/10.5281/zenodo.17586107">10.5281/zenodo.17586107</a><br />
    Integrity only — never for sale.
  </p>
</footer>

<!-- OCR + Intake logic -->
<script src="https://unpkg.com/tesseract.js@5.0.3/dist/tesseract.min.js"></script>
<script src="intake.js"></script>
</body>
</html>
