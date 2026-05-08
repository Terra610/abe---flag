# ⚖️ AFFE — Appropriation Fidelity & Funding Engine

**Normalize funding documents, validate appropriation fidelity, and prepare structured funding artifacts for downstream A.B.E. analysis.**

_Local-only · deterministic · audit-ready · no backend · no hidden uploads_

---

# 🌍 Overview

AFFE is the funding normalization and appropriation fidelity layer inside the American Butterfly Effect (A.B.E.) framework.

Its job is to transform messy real-world funding documents into structured, deterministic artifacts that can be analyzed by:

- CFF (Constitutional Funding Forensics)
- CIRI (Constitutional Integrity ROI Engine)
- CIBS (Constitutional Integrity Baseline Schema)
- RT (Rebuild Together Engine)
- AFFE stability analysis

AFFE acts as the bridge between:

```text
raw funding documents
→ structured funding artifacts
→ downstream deterministic analysis
```

---

# 🧠 What AFFE Actually Does

AFFE:

- ingests funding-related documents,
- extracts structured funding data,
- normalizes the data into deterministic formats,
- validates appropriation alignment,
- and prepares audit-ready artifacts for downstream modules.

The goal is not to overwhelm users with accounting language.

The goal is to answer simple questions:

```text
What was funded?
Who received it?
What authority supported it?
What was the funding supposed to do?
Did deployment align with the stated purpose?
```

---

# 📂 Supported Inputs

AFFE can process:

- CSV files
- XLSX / Excel spreadsheets
- TXT files
- funding reports
- budget exports
- appropriation tables
- PDF funding documents
- structured pasted text

---

# 🔄 AFFE Processing Flow

```text
Upload
→ Extract
→ Normalize
→ Map
→ Validate
→ Export Structured Artifact
```

---

# 🧩 Core AFFE Responsibilities

## 1. Extraction

AFFE extracts:
- program names
- agencies
- jurisdictions
- fiscal years
- line-item descriptions
- funding amounts
- appropriation references
- funding categories

from uploaded funding documents.

---

## 2. Normalization

AFFE converts inconsistent data into deterministic structure.

Examples:
- currency normalization
- header normalization
- agency naming cleanup
- fiscal-year formatting
- structured category mapping

This allows downstream modules to process the data consistently.

---

## 3. Appropriation Fidelity Review

AFFE helps determine whether funding appears aligned with:
- statutory purpose,
- funding conditions,
- scope limitations,
- and stated program objectives.

Plain language:

```text
“Did the funding stay connected to the purpose it was allocated for?”
```

---

## 4. Structured Artifact Creation

AFFE generates structured outputs including:
- CSV exports
- normalized funding artifacts
- JSON outputs
- audit-ready datasets

These artifacts are then used by:
- CFF
- CIRI
- CIBS
- RT
- Integration

---

# 🔍 Relationship to Other Modules

## AFFE → CFF

AFFE prepares funding data for Constitutional Funding Forensics.

```text
AFFE = normalization layer
CFF = funding analysis layer
```

---

## AFFE → CIRI

Structured funding artifacts can influence:
- recovery calculations,
- constrained capital analysis,
- deployment modeling,
- and ROI estimation.

---

## AFFE → RT

Funding alignment helps determine:
- deployment readiness,
- sector activation,
- and long-term propagation potential.

---

## AFFE → Integration

AFFE outputs can be:
- hashed,
- audited,
- exported,
- and chain-verified.

---

# 🏛️ Funding Fidelity Concept

AFFE operates on a simple principle:

```text
Funding should remain aligned with the purpose,
scope, and authority under which it was allocated.
```

The engine evaluates:
- alignment,
- deployment integrity,
- allocation structure,
- and measurable outcomes.

---

# ⚖️ Constitutional & Funding Structure

AFFE follows the broader A.B.E. hierarchy:

```text
Constitution
→ federal statutes
→ federal regulations
→ funding conditions
→ state law
→ agency practice
```

Funding analysis is evaluated within that authority structure.

---

# 📊 Example Outputs

AFFE may generate:

- normalized funding tables
- appropriation summaries
- deployment pathways
- structured funding artifacts
- exportable CSVs
- JSON outputs
- audit-ready records
- fidelity summaries
- downstream integration artifacts

---

# 🔒 Privacy

AFFE is local-first.

The module does not require:
- cloud processing
- backend databases
- user accounts
- silent uploads
- centralized storage

User documents remain under user control.

---

# 🧠 Plain-Language Interpretation

AFFE is designed so users do not need to become:
- auditors,
- accountants,
- lawyers,
- or procurement specialists

to understand funding structure.

The module should always explain:
- what was processed,
- what was found,
- what was normalized,
- and what can be exported.

---

# 🧭 Recommended Workflow

```text
Upload Funding Documents
→ Normalize with AFFE
→ Analyze with CFF
→ Model Recovery with CIRI
→ Allocate with CIBS
→ Deploy with RT
→ Verify with Integration
```

---

# 🔬 Advanced Usage

Advanced users may:
- inspect schema mappings,
- modify normalization logic,
- extend category mappings,
- add funding-condition datasets,
- or integrate sector-specific law packs.

Future law-pack targets include:
- transportation
- healthcare
- housing
- education
- agriculture
- infrastructure
- AI governance
- public-benefit systems

---

# 🦋 Final Principle

AFFE exists to make funding structures:
- understandable,
- inspectable,
- normalized,
- auditable,
- and usable inside deterministic analysis pipelines.

The module helps transform:

```text
raw funding complexity
→ structured funding clarity
```

inside the broader A.B.E. framework.

---

## 📚 License

CC BY-NC 4.0  
Integrity only — never for sale.


## Citation

Shouse, T. *American Butterfly Effect (ABE).* Zenodo.  
DOI: 10.5281/zenodo.17586107
