# CDA — Constitutional Divergence Analysis

## Function

CDA evaluates all inputs against constitutional authority and classifies alignment or divergence.

All inputs are processed.  
Inputs either align with constitutional constraints or they do not.

Conditions that fail validation are measured as divergence.

---

## Input

- Intake artifact (`intake_artifact.json`)
- Uploaded documents (local, user-provided)

---

## Output

- Constitutional alignment status (aligned / divergent)
- Divergence classification
- Authority trace (federal / state / delegated scope)

---

## Validation Logic

CDA evaluates:

- Jurisdictional authority
- Scope of delegated power
- Consistency with controlling federal law
- Constitutional constraints

Conditions that exceed authority, conflict with controlling law, or rely on incompatible definitions are classified as divergence.

---

## Deterministic Rule

All inputs are evaluated.

Alignment = 0 divergence  
Misalignment = measurable divergence

No input is excluded.

---

## System Position

Upstream:  
- Intake (data ingestion and artifact creation)

Downstream:  
- CFF (funding validation)  
- AFFE (financial exposure)  
- CIRI (impact and recovery)

---

## System Role

CDA establishes the baseline condition for all downstream calculations.

All modules depend on CDA classification.

Divergence identified here propagates through the entire system.

---

## Output Dependency

- CFF uses CDA output to determine funding alignment
- AFFE quantifies financial exposure based on divergence
- CIRI models social and economic impact
- Macro aggregates all divergence and recovery outputs

---

## Core Principle

All inputs are evaluated against a single controlling authority.

No condition is treated as separate from the constitutional framework.

---

## Result

CDA produces a deterministic classification of alignment or divergence.

This classification drives all subsequent calculations in A.B.E.
