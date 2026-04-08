# CCRI — Credit & Collateral Integrity

**Purpose**:  
Evaluates constitutional violations in creditworthiness assessments, extensions of credit, underwriting practices, foreclosures, and related financial gatekeeping. Quantifies economic harm caused by inaccessible or discriminatory credit systems.

**Firing Order Position**: After divergence, before cff.

**Core Responsibilities**:
- Scores credit-related practices for constitutional fidelity (due process, equal protection, Commerce Clause limits)
- Calculates harm from credit denials, predatory underwriting, and retaliatory foreclosures
- Supports new expansions including justice monopoly effects on credit access
- Uses both 0-1 divergence scale and 2σ–4σ statistical layer

**Inputs**:
- `derived.divergence` (credit-specific flags)

**Outputs**:
- `derived.ccri` — credit integrity score, harm estimates, and constitutional capital unlocked

**Key Features**:
- Focuses on economic abuse through credit barriers
- Fully deterministic and local-only
- SHA-256 audit receipt for every analysis

**Transparency Note**:
This module is part of the open, non-commercial ABE framework (CC BY-NC 4.0).  
It exists to expose how credit systems can violate constitutional rights and to quantify the resulting harm.

**Last Updated**: April 2026
