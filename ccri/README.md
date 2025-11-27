# CCRI — Consumer Credit Risk Integrity

**CCRI (Consumer Credit Risk Integrity)** is an A.B.E. engine module that measures how consumer credit, auto lending, and banking practices diverge from the constitutional and federal legal framework.

CCRI does **not** score people.  
It scores **institutions and policies** based on how lawfully they use (or misuse) identity and transportation data when deciding who gets access to credit, vehicles, and basic economic mobility.

---

## Purpose

CCRI answers three core questions:

1. **Data Integrity**  
   Are lenders, dealers, and underwriters using only legally-permissible data (e.g., income, debt, payment history), or are they relying on:
   - DMV / DOT records,
   - license or registration status,
   - implied consent / chemical test results,
   - or other enforcement data that is unlawful to apply to non–DOT-regulated citizens?

2. **Constitutional Alignment**  
   Does the underwriting process respect:
   - the right to movement and travel,
   - the limits of state police power,
   - the Supremacy Clause (federal law over conflicting state practices),
   - privacy protections over SSN and driver records?

3. **Economic Impact**  
   How much earning potential, vehicle access, credit access, and community GDP is suppressed because unlawful barriers and misused data are denying people loans and transportation?

---

## Inputs

`inputs.json` defines a **scenario** for CCRI to evaluate.  
Each scenario represents a specific lender, dealership, or underwriting policy set.

At minimum, CCRI expects:

- **jurisdiction** (state / region)
- **institution_type** (bank, credit union, auto finance, dealership)
- **data_sources_used** (credit bureau, income docs, DMV, DOT, background vendors, etc.)
- **license_status_required** (yes/no + purpose)
- **dmv_data_in_underwriting** (yes/no + which)
- **dot_or_fmcsa_data_used** (yes/no)
- **population_affected** (number of applicants / denials per year)
- **loan_types** (auto, personal, consolidation, other)
- **approval_rates** by category
- **denial_reasons** (free text/categories)
- **manual_overrides** (can humans override system decisions?)
- **appeal_path** (is there a real way to challenge a denial?)

See `inputs.json` in this folder for an example record.

---

## Outputs (Conceptual)

CCRI should produce:

- **ccri_score** — overall legal/compliance alignment (0–100)
- **constitutional_risk_index** — how badly the system violates constitutional boundaries
- **tainted_data_score** — degree of dependency on DMV/DOT/SSN misuse
- **access_gap_estimate** — number of people locked out of credit/vehicles due to unlawful gating
- **gdp_suppression_estimate** — annual earnings and GDP lost
- **recommended_corrections** — specific data and rule changes to restore lawful access

These outputs are not stored here, but are consumed by:

- **CIRI** (enforcement and rights violations),
- **CFF** (fraudulent or ultra vires financial practices),
- **CIBS** (budget and reallocation modeling),
- **AFFE** (long-term social and economic feedback).

---

## Linkage to Other A.B.E. Modules

CCRI is **not** a standalone credit tool. It is a lens on how **credit and banking** are being influenced by **unlawful transportation and identity regimes**.

- CCRI calls the **Constitutional Kernel** shared by the other A.B.E. modules to:
  - validate when DMV / DOT data can or cannot be used,
  - detect when non-commercial citizens are being treated as regulated drivers,
  - measure divergence from federal law.

- CCRI’s outputs flow into:
  - **CIRI** (civil rights / enforcement divergence),
  - **CFF** (financial fraud / exposure),
  - **CIBS** (how many people we can unlock economically),
  - **AFFE** (how much stability is gained when the barriers are removed).

---
