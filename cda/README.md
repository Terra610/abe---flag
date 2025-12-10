# CDA — Constitutional Divergence Analyzer

CDA is the part of the A.B.E. engine that answers one question:

> **“Where did this law, policy, or enforcement practice jump the tracks?”**

You give CDA a statute, rule, or real-world scenario (like a traffic stop or CPS intervention).  
CDA gives you a structured JSON object that tells you:

- who the rule was supposed to cover vs who it’s actually hitting  
- whether the state is crossing federal commercial boundaries  
- whether federal money (like MCSAP) is being used off-mission  
- how severe the divergence is on a 0–1 scale  
- which constitutional doctrines are being violated  

That JSON can then be used by:

- **CDI** — Constitutional Divergence Index  
- **CIRI** — Integrity ROI  
- **CFF** — Funding Forensics  
- **AFFE** — Funding Explorer  
- **Integration** — SHA-256 audit receipts  

---

## Who CDA is for

- **Citizens / defendants / legal aid**  
  Turning “this feels illegal” into a structured, evidence-backed divergence profile.

- **Oversight / IG / GAO-style auditors**  
  Mapping where state practice has drifted beyond statutory and federal funding authority.

- **Policy designers / compliance officers**  
  Testing whether a policy is aligned with the Constitution, federal statutes, and funding terms.

---

## How CDA works (in plain language)

1. **You describe the statute or practice**
   - Name (e.g., `Iowa Code 321.174 — Drivers license required`)
   - Jurisdiction (`Iowa`, `Federal`)
   - Level (`state` or `federal`)
   - Who it’s hitting (non-commercial, commercial, or mixed)
   - Any known funding streams (MCSAP, 23 U.S.C., etc.)
   - Optional notes about how it’s being used in practice

2. **You mark the divergences you see**
   - Is the state treating non-commercial citizens like DOT-regulated drivers?
   - Is there a conflict with federal commercial scope?
   - Are they legislating in a field Congress already occupied?
   - Are MCSAP or similar grants being used off-mission?
   - Are funding conditions ignored?
   - Is the right to travel burdened?
   - Are there due process defects (no notice, no hearing, no meaningful appeal)?

3. **CDA computes a score and a doctrine footprint**
   - 0 = fully aligned  
   - 1 = severe divergence  
   - CDA also tags which doctrines are implicated (e.g. `police_power_doctrine`, `fmcsr_expansion`, `supremacy_clause`).

4. **You download a JSON artifact**
   - This JSON is what CDI, CIRI, CFF, and Integration use.
   - It’s also printable and attachable as a court exhibit or memo appendix.

Everything is computed in the browser. No servers, no logins, no tracking.

---

## Inputs and Outputs

### Inputs

From the CDA UI (`cda/index.html`):

- **statute_name** — required  
- **jurisdiction** — optional text  
- **level** — `"state"` or `"federal"`  
- **population** — `"non_commercial"`, `"commercial"`, or `"mixed"`  
- **citations** — optional comma-separated list  
- **funding_streams** — optional checkboxes (MCSAP, 23 U.S.C., other)  
- **flags** — checkboxes indicating divergences  
- **notes** — optional scenario details  

From Intake (optional, automatic):

- `text_normalized` — CDA can pre-fill notes with the text of your ticket, CPS letter, etc.  
- `doc_type` — CDA uses this to choose sensible defaults (e.g., traffic tickets → non-commercial population).  
- `doctrine_hints` — Intake can suggest doctrines likely in play (e.g., `police_power_doctrine` for traffic tickets).

### Outputs

CDA generates a JSON object that conforms to `cda/schema.json`. Key fields:

- `version` — `"1.0"`  
- `module` — `"CDA"`  
- `statute_name`  
- `jurisdiction`  
- `level`  
- `population`  
- `citations`  
- `funding_streams`  
- `flags` — 10 boolean indicators  
- `divergence_score` — 0–1  
- `doctrines_triggered` — array of doctrine IDs from `law/doctrines/doctrine_map.json`  
- `notes`

Example (shortened):

```json
{
  "version": "1.0",
  "module": "CDA",
  "statute_name": "Iowa Code 321.174 — Drivers license required (applied to non-commercial citizen)",
  "jurisdiction": "Iowa",
  "level": "state",
  "population": "non_commercial",
  "citations": ["321.174", "804.22", "49 CFR 390.3"],
  "funding_streams": ["MCSAP/FMCSA", "Highway Safety / 23 U.S.C."],
  "flags": {
    "scope_noncommercial_treated_as_commercial": true,
    "preemption_conflict": true,
    "preemption_field": true,
    "ultra_vires_enforcement": true,
    "mcsap_off_mission": true,
    "funding_conditions_ignored": true,
    "funding_nontransparent": true,
    "right_to_travel_burdened": true,
    "due_process_defects": true,
    "selective_application": false
  },
  "divergence_score": 1.0,
  "doctrines_triggered": ["police_power_doctrine", "fmcsr_expansion", "supremacy_clause", "void_for_vagueness"],
  "notes": "Three traffic stops since April 2024 on a private non-commercial citizen..."
}
