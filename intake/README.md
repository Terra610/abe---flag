# 📨 Intake — Document + OCR Bridge  
Part of the A.B.E. (American Butterfly Effect) Engine  
**License:** CC BY-NC 4.0

---

## 1. What Intake Does (Plain Language)

Most people don’t walk around with a perfect CSV file.

They have:

- a photo of a ticket  
- a scanned CPS letter  
- a PDF loan contract  
- a policy memo or email  
- a text document explaining what happened  

**Intake** is the front door for all of that.

It lets you upload a document and, **entirely in your browser**:

1. Read the text (using OCR for images / scans).  
2. Help you pull out the important numbers and facts.  
3. Build clean, structured files that other A.B.E. modules can use  
   (CIRI, CDA, CFF, CCRI).

No server. No cloud. No account.  
Your document never leaves your device.

---

## 2. What You Can Upload

Typical Intake use-cases:

- **Traffic & citation tickets**  
  - Stop date, location, officer/agency, charges, fines, jail exposure.  
- **CPS / child welfare documents**  
  - Allegations, timelines, orders, hearings, risk language.  
- **Policy & regulation memos**  
  - Internal “guidance,” enforcement directives, policy manuals.  
- **Loan / finance contracts (CCRI)**  
  - Auto loans, mortgage docs, underwriting conditions, DMV-based rules.  
- **Plain-text case descriptions**  
  - “Here’s what happened to me / my family / my client.”

Intake will ask you what kind of document it is and then walk you through fields
that matter for the rest of the engine.

---

## 3. What Intake Produces

Every Intake session creates a single JSON artifact:

> `intake_artifact.json`

That file contains:

- **Original file metadata**
  - `original_file_name`  
  - `original_file_hash` (SHA-256 of the uploaded document)  
  - Whether OCR was used.

- **Text**
  - `text_raw` → direct OCR or text extraction  
  - `text_normalized` → cleaned text used for parsing

- **Extracted fields**
  - Key facts pulled from the document (stop date, statute numbers, fine amounts,
    loan terms, agency names, etc.).

- **Targets**
  - Which A.B.E. modules this session is meant to feed:
    - `CIRI` (economic harm / recovery)  
    - `CDA` (divergence flags)  
    - `CFF` (funding misuse)  
    - `CCRI` (credit & lending integrity)

- **Generated outputs**
  - Optional helper payloads you can download:
    - `ciri` → an inline, single-row CIRI `inputs.csv`  
    - `cda` → a divergence scenario JSON  
    - `cff` → a CSV line with ON_MISSION / OFF_MISSION / UNCLEAR funding  
    - `ccri` → a CCRI scenario object

These outputs are designed so the rest of the engine can just pick them up and run.

---

## 4. JSON Shape (High Level)

The full schema lives in:

- `intake/schema.json` → formal validation

In human language, a valid Intake artifact includes:

- `version` = `"1.0"`  
- `module` = `"Intake"`  
- `doc_type` = one of:
  - `traffic_ticket`, `cps_case`, `policy_memo`, `loan_contract`, `generic_case_text`
- `original_file_name` + `original_file_hash` (SHA-256)  
- `ocr_used` → `true` or `false`  
- `text_normalized` (required) + optional `text_raw`  
- `extracted_fields` → flexible object, depends on doc type  
- `targets` → array of `["CIRI","CDA","CFF","CCRI"]` as needed  
- `generated_outputs` → sub-objects for `ciri`, `cda`, `cff`, `ccri`  
- `created_at` → ISO timestamp  
- optional `notes`

If you want exact field names and constraints, open `intake/schema.json`.

---

## 5. How It Connects to the Rest of A.B.E.

Intake is a **bridge module**. It doesn’t do the heavy math; it feeds the engines that do:

- **→ CIRI**  
  Use extracted fines, jail days, lost income, households affected, etc. to build a
  CIRI-ready `inputs.csv`. CIRI then calculates harm and recovery.

- **→ CDA**  
  Use statute cites, policy language, and agency behavior to build divergence
  scenarios (where practice drifts from constitutional / federal boundaries).

- **→ CFF / AFFE**  
  If the document touches grant funding, MCSAP, CPS funds, etc., Intake can mark
  lines that belong in `cff/inputs.csv` as `ON_MISSION`, `OFF_MISSION`, or `UNCLEAR`.

- **→ CCRI**  
  For credit and lending, Intake can shape a `ccri/inputs.json` scenario:
  what data the lender used, how DMV/DOT data was applied, and who gets denied.

Once those files exist, the normal A.B.E. flow takes over:
CAE/CDA → CDI → CIRI → CIBS → CII → Integration.

---

## 6. Privacy & Integrity

Intake is built to protect users and keep A.B.E. honest:

- All OCR and parsing runs client-side in your browser.  
- No uploads to a Terra server, company server, or hidden API.  
- You download the artifact and helper files yourself.  
- Integration can hash those artifacts and give you a cryptographic receipt  
  (`abe_audit_*.json`) showing what you ran and when.

If you need to take something to court or a legislative hearing, you can:

1. Bring the original document.  
2. Bring `intake_artifact.json`.  
3. Bring the A.B.E. audit certificate.

The chain of custody is explicit and checkable.

---

## 7. Constitutional Purpose

Intake exists so **real people with real paperwork** can actually use the engine.

> From paper to proof.

It lowers the barrier from  
“you must know how to build a CSV”  
to  
“upload the document, follow the prompts, and download your receipts.”

The law is supposed to serve the people.  
Intake gives people a way to speak the law’s language without needing to become a programmer or a statistician.

Integrity only — never for sale.
