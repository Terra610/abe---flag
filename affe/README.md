# ⚖️ AFFE — Appropriation Fidelity & Funding Engine  
**Turn messy funding reports into clean, CFF-ready CSVs.**

AFFE is the A.B.E. Engine’s **document bridge** for funding data.  
It takes whatever a state or agency gives you — CSV, Excel, even PDF — and turns it into a **strict, machine-checkable CSV** that plugs straight into **CFF (Constitutional Funding Forensics)**.

No servers. No accounts. No “trust us.”  
Everything runs **locally in your browser**.

---

## 🧠 What AFFE Does

You give it a report. It gives you a **CFF-ready CSV** with this exact schema:

- `program_name`  
- `federal_authority_citation`  
- `fiscal_year`  
- `state_or_jurisdiction`  
- `agency`  
- `line_item_description`  
- `spend_category_code` (`ON_MISSION`, `OFF_MISSION`, `UNCLEAR`)  
- `amount_usd`  
- `notes` *(optional)*

Under the hood, AFFE:

1. **Parses the file locally**
   - CSV / TXT → plain text parsing  
   - Excel (.xlsx / .xls) → SheetJS in the browser  
   - PDF → pdf.js text extraction + amount detection  

2. **Detects columns and builds a mapping UI**
   - Auto-guesses likely matches (e.g. `Program`, `Grant` → `program_name`; `Amount` → `amount_usd`).  
   - You can override any mapping with a dropdown.

3. **Normalizes amounts**
   - Strips currency symbols, commas, and formatting.  
   - Outputs `amount_usd` as a numeric string (two decimals) ready for analysis.

4. **Exports a clean CSV**
   - Header row matches `template.json`.  
   - Every row is CFF-compatible out of the box.

---

## 🧾 Supported Inputs

AFFE currently handles:

- **CSV / TXT**: simple or quoted, one header row, any column order.  
- **Excel**: first worksheet is treated as the table (header row + data).  
- **PDF**:
  - Scans text for **money amounts**.
  - Builds rows with:
    - `description` → full line of text  
    - `amount` → parsed numeric value  
  - You then map `description → line_item_description` and `amount → amount_usd`.

For PDFs, AFFE is intentionally conservative:  
if it can’t safely parse a number, it leaves the cell blank rather than guess.

---

## 🧩 How to Use It

1. Open:  
   `affe/index.html` (or visit the AFFE link from the A.B.E. home page).

2. **Drop a file**  
   - Drag your CSV / Excel / PDF into the drop zone, or use “Choose file…”.

3. **Map columns → CFF fields**  
   - For each required CFF field, choose the matching source column.  
   - Required fields are marked with `*`.

4. **Review the preview**  
   - AFFE shows the first 10 mapped rows exactly as they’ll be exported.

5. **Download the CFF-ready CSV**  
   - Click **“Download CFF-ready CSV”**.  
   - You’ll get `affe_output_for_cff.csv`, ready for **/cff/inputs.csv** or any CFF-style analysis.

---

## 🔒 Privacy

- No uploads.  
- No tracking.  
- No localStorage hand-off.  

AFFE reads your file into memory, parses it, and then forgets it when you close the page.

---

## 🤝 Place in the A.B.E. Engine

AFFE sits **upstream of CFF**:

> Raw funding docs → **AFFE** → CFF (Constitutional Funding Forensics) → CIRI (Integrity ROI).

- **AFFE**: clean the data and match it to the appropriation schema.  
- **CFF**: test each dollar against its legal purpose (ON_MISSION / OFF_MISSION / UNCLEAR).  
- **CIRI**: turn recovered OFF_MISSION dollars into modeled recovery value and ROI.

This keeps the chain honest:

- Statutes define the boundaries.  
- Funding documents provide the raw facts.  
- AFFE makes the facts **auditable**.
