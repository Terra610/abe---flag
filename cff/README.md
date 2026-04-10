# CFF — Constitutional Funding Fidelity

## Function

CFF evaluates whether actions, programs, or enforcement activities are supported by funding tied to their authorized scope.

Funding defines operational authority.

If an action is not supported by funding within its authorized scope, it exceeds that authority and is measured as divergence.

---

## Input

- CDA output (alignment / divergence classification)
- Funding sources (federal, state, grants, appropriations)
- Program allocation data
- Agency scope and duties

---

## Output

- Funding alignment status (aligned / misaligned)
- Off-scope funding classification
- Funding traceability map
- Divergence linked to funding misuse

---

## Validation Logic

CFF evaluates:

- Whether funding is tied to a specific authorized duty
- Whether expenditures match the scope of that authority
- Whether funding has been applied outside its intended purpose
- Whether actions are performed without corresponding funding authority

---

## Deterministic Rule

Funding defines scope.

If funding does not cover an action:
→ the action exceeds authority  
→ the condition is measured as divergence

If funding is applied outside its designated purpose:
→ the condition is measured as divergence

---

## System Position

Upstream:  
- CDA (constitutional validation and divergence classification)

Downstream:  
- AFFE (financial exposure and liability)  
- CIRI (impact and recovery modeling)

---

## System Role

CFF enforces the linkage between authority and funding.

It determines whether actions identified in CDA are supported by lawful funding structures.

CFF converts divergence into financially traceable conditions.

---

## Output Dependency

- AFFE uses CFF output to quantify financial liability and exposure
- CIRI uses CFF output to model real-world economic and social impact
- Macro aggregates funding misalignment into total economic drag

---

## Core Principle

Funding is not separate from authority.

Funding is the operational boundary of authority.

Actions outside funded scope are off-mission and measurable as divergence.

---

## Result

CFF produces a deterministic evaluation of funding alignment.

All off-scope or misapplied funding contributes to measurable economic loss within A.B.E.
