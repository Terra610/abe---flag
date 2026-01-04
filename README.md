# 🦋 A.B.E. — American Butterfly Effect  
**A constitutional prosperity engine — free, local-only, auditable, and impossible to monopolize.**  
**License:** CC BY-NC 4.0 · Integrity only — never for sale.

---

## 🌐 What A.B.E. Actually Is

A.B.E. turns *constitutional alignment* into *economic clarity*.

It measures:

- Whether a policy or enforcement action is **lawful**  
- How far it **drifts** from controlling authority  
- What that drift **costs** people, communities, and budgets  
- What correcting it **restores**

Everything runs in the browser:

- No logins  
- No tracking  
- No central server  
- Uploads never leave the user’s device

---

## 🏛️ Engine Overview (2025)

A.B.E. is made of **12 public modules**.

### 1. Document & Intake Layer

- **Intake — Document Intake + OCR Bridge**  
  - *What it does:*  
    - Lets users upload tickets, CPS letters, loan contracts, memos, PDFs, and images  
    - Runs OCR in-browser to read text  
    - Helps extract key fields  
    - Builds clean inputs for the rest of the engine  
  - *Status:* `alpha`  
  - *UI:* `/intake/index.html`

---

### 2. Constitutional & Divergence Layer

- **CAE — Constitutional Alignment Engine**  
  - Maps what the law actually authorizes  
  - Federal supremacy, jurisdiction, statutory scope  
  - *Status:* `roadmap`  
  - *UI:* `/cae/index.html` (planned)

- **CDA — Constitutional Divergence Analyzer**  
  - Turns real-world conduct (stops, licensing, CPS actions, funding rules)  
    into structured divergence flags and a 0–1 divergence score  
  - Feeds CDI, CIRI, CFF, AFFE, CCRI  
  - *Status:* `alpha`  
  - *UI:* `/cda/index.html`

- **CDI — Constitutional Divergence Index**  
  - Computes a unified 0–1 drift signal from alignment to overreach  
  - Consumed by downstream economic modules  
  - *Status:* `alpha`  
  - *UI:* `/cdi/index.html`

---

### 3. Economic & Recovery Layer

- **CIRI — Constitutional Integrity ROI Engine**  
  - Core recovery engine  
  - Calculates harm & recovery from:  
    - cases avoided  
    - jail days avoided  
    - fees/fines canceled  
    - market access restored  
    - employment & wage effects  
    - litigation exposure  
  - Exports receipts and scenario CSVs  
  - *Status:* `stable`  
  - *UI:* `/ciri/index.html`  

- **CIBS — Community Integrity Budget System**  
  - Allocates recovered value into public categories  
    (housing, clinics, mobility, digital access, defense, etc.)  
  - *Status:* `stable`  
  - *UI:* `/cibs/index.html`

- **CII — Community Investment Interface**  
  - Turns budgets into auditable project portfolios  
  - Shows what your community can actually “buy” with recovery dollars  
  - *Status:* `beta`  
  - *UI:* `/cii/index.html`

- **Macro — Macroeconomic Cascade Model**  
  - Scales a “restored community” across many communities  
  - Projects GDP, wages, jobs, and local spending uplift  
  - *Status:* `beta`  
  - *UI:* `/macro/index.html`

---

### 4. Funding & Credit Integrity Layer

- **CFF — Constitutional Funding Forensics**  
  - Classifies spending lines as:  
    - `ON_MISSION` — within statutory authority  
    - `OFF_MISSION` — outside authority / drift  
    - `UNCLEAR` — needs audit / legal review  
  - Uses simple CSV inputs with explicit flags  
  - *Status:* `beta`  
  - *UI:* `/cff/index.html`

- **AFFE — American Funding & Fidelity Explorer**  
  - Deeper explorer that ties funding patterns into:  
    - divergence  
    - recovery  
    - statutory authority  
  - Built to handle multi-file, multi-program analyses  
  - *Status:* `alpha`  
  - *UI:* `/affe/index.html`

- **CCRI — Consumer Credit Risk Integrity**  
  - Audits how credit, banking, and auto lending use data  
  - Flags unlawful or preempted uses of:  
    - DMV / DOT records  
    - FMCSA / MCSAP enforcement outcomes  
    - bureau + underwriting models that lean on unconstitutional gates  
  - Scores **systems**, not people  
  - *Status:* `alpha`  
  - *UI:* `/ccri/index.html`

---

### 5. System, Integrity, and Learning

- **Integration Layer**  
  - Re-hashes every major artifact with SHA-256  
  - Runs local integrity checks for: CIRI, CIBS, CDI, CAE, CFF, AFFE, CCRI  
  - Produces an `abe_audit_*.json` certificate for court / audit use  
  - Uses `divergence.js` to generate plain-language summaries  
    (descriptive only, not legal advice)  
  - *Status:* `beta`  
  - *UI:* `/integration/index.html`

- **System Map**  
  - Source-of-truth JSON for the entire engine:  
    - modules  
    - flows  
    - evidence links  
  - Used by the root homepage and Integration to stay in sync  
  - *Status:* `stable`  
  - *UI:* `/system/index.html`  
  - *Map:* `/system/map.json`

- **Learn — Guided Engine Tips**  
  - Interactive “teach me” page for:  
    - CIRI (recovery)  
    - CIBS (budget)  
    - Macro (national cascade)  
  - Uses the same math and structure as the real engine  
  - *Status:* `beta`  
  - *UI:* `/learn/index.html`

---

## 🔍 Pipeline Overview

The intended flow of data is:

1. **Intake (OCR)**  
   - User uploads real-world documents  
   - Intake extracts text and key fields  
   - Builds artifacts (CIRI CSV, CDA scenario, CFF CSV, CCRI JSON)

2. **Constitutional Alignment & Divergence**  
   - **CAE** maps lawful authority and scope  
   - **CDA** encodes practices as divergence flags  
   - **CDI** converts that into a 0–1 drift score

3. **Economic Recovery & Budgets**  
   - **CIRI** calculates total recoverable value  
   - **CIBS** turns value into budget categories  
   - **CII** turns budgets into project portfolios  
   - **Macro** scales impact to regions / nation

4. **Funding & Credit Integrity**  
   - **CFF** checks whether federal funds are used on-mission  
   - **AFFE** explores cross-program funding fidelity  
   - **CCRI** audits credit and lending data practices

5. **Audit & Public Proof**  
   - **Integration** re-computes KPIs and SHA-256 hashes locally  
   - Generates an audit JSON (`abe_audit_*.json`)  
   - **System Map** documents how every number is produced

Once a user’s data is in the engine, **all relevant modules can fire** off that shared truth.

---

## 🧬 Why This Exists

Because when government or institutions drift from the Constitution, it’s not just a “technicality” — it’s:

- lost wages  
- unnecessary detention  
- destroyed credit  
- broken families  
- hollowed-out communities  
- misused public funds  

A.B.E. exists to:

- show the **drift**  
- quantify the **harm**  
- and map the **recovery path**

> **No one is above the law.  
> No one is beneath dignity.  
> Prosperity begins with fidelity.**

---

## 🛡 Privacy & Integrity

A.B.E. is built around **user sovereignty**:

- 100% client-side  
- No back-end database  
- No cloud file storage  
- No telemetry, tracking pixels, or analytics  
- OCR and parsing happen locally in the browser  
- SHA-256 hashes are computed on-device

Users can:

- upload documents  
- generate CSV / JSON artifacts  
- download audit receipts  
- close the tab  

…and nothing is retained by the engine.

---

## 🧭 How to Start (Human-Friendly)

- **If you’re brand new:**  
  - Open: `/start/index.html`  
  - This explains each module in plain language and routes you to the right place.

- **If you have documents (tickets, CPS, contracts):**  
  - Open: `/intake/index.html`  
  - Upload your file and let Intake help you build a CIRI/CDA/CFF/CCRI-ready artifact.

- **If you want the full constitutional-to-economic picture:**  
  - Open: `/integration/index.html`  
  - Run the integrity check and read the plain-language summary.

---

## 📁 Repo Structure

High-level layout:

- `/index.html` — A.B.E. hub (all modules listed)  
- `/START_HERE.md` — Plain-language engine overview  
- `/start/` — Web “Start Here” page  
- `/intake/` — Intake + OCR bridge  
- `/cae/` — Constitutional alignment (planned)  
- `/cda/` — Divergence analyzer  
- `/cdi/` — Divergence index  
- `/ciri/` — Recovery engine  
- `/cibs/` — Budget system  
- `/cii/` — Portfolio & projects  
- `/macro/` — Macroeconomic cascade model  
- `/cff/` — Funding forensics  
- `/affe/` — Funding & fidelity explorer  
- `/ccri/` — Credit-risk integrity model  
- `/integration/` — SHA-256 audit & summary layer  
- `/system/` — System map & integrity scripts  
- `/learn/` — Teaching demos  
- `/doctrine/` — Constitutional and economic doctrine library

---

## 🔓 License

**© 2025 Terra Dawn Shouse  
This work and all associated A.B.E. systems are licensed under a Creative Commons Attribution–NonCommercial 4.0 International License (CC BY-NC 4.0).  
You are free to share and adapt this material for non-commercial use with attribution to Terra Dawn Shouse and A.B.E.  
https://creativecommons.org/licenses/by-nc/4.0/**

You may:

- share  
- remix  
- adapt  

You may **not**:

- sell  
- privatize  
- monopolize  
- wrap this engine in a paywall

Justice shouldn’t come with a price tag.

---

## 🦋 Final Word

This engine is here for:

- citizens  
- families  
- advocates  
- auditors  
- honest public servants  
- economists
- business owners
- investors
- policy makers
- and everyone in between!

If you came here looking for **truth you can prove**,  
you’re in the right repo.

🕊 Integrity only.  
Never for sale.
```
