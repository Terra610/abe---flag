# CDA — Constitutional Divergence Analyzer

**Purpose**:  
The core divergence engine of the ABE framework. Measures constitutional misalignment using the original 0-1 scale and the new 2σ–4σ statistical layer. Expanded to include Justice Monopoly (cost of knowing the law), Creditworthiness & extensions of credit, Eviction/Coercive Control, and Animal Displacement.

**Firing Order Position**: After cae, before ccri.

**Core Responsibilities**:
- Runs the original 0-1 divergence scoring (fully protected)
- Applies the new 2σ–4σ statistical confidence layer (useful for AI governance, quantum, macro cascades, credit, etc.)
- Scores new categories: Justice Monopoly, Credit barriers, Eviction/coercive control, Animal displacement
- Produces clear interpretation and overall severity
- Generates SHA-256 audit receipt for every analysis

**Inputs**:
- Intake artifact or raw document data

**Outputs**:
- `derived.cda` — divergence scores (0-1 + sigma), category breakdowns, interpretation

**Key Features**:
- Original formulas are 100% protected and unchanged
- Supports Constitutional Systems Engineering metrics
- Fully deterministic, local-only, privacy-absolute

**Transparency Note**:
This is the heart of the open, non-commercial ABE framework (CC BY-NC 4.0).  
It exists to make constitutional violations measurable and actionable for regular people.

**Last Updated**: April 2026
