# CFF — Funding Forensics

**Purpose**:  
Performs forensic analysis on public funding streams to classify spending as On-Mission (constitutionally authorized), Off-Mission (ultra vires or misapplied), or Unclear. Identifies recoverable constitutional capital from misused funds.

**Firing Order Position**: After ccr i, before affe.

**Core Responsibilities**:
- Classifies budgets and grants as on-mission vs off-mission
- Quantifies the dollar value of off-mission spending (primary source of constitutional capital)
- Feeds directly into AFFE and CIRI for deeper fidelity and ROI analysis
- Supports both 0-1 divergence scale and 2σ–4σ statistical confidence

**Inputs**:
- Raw budget data or funding documents (via Intake)

**Outputs**:
- `derived.cff` — funding classification percentages and recoverable capital estimates

**Key Features**:
- Deterministic, local-only execution
- Full audit trail with SHA-256 receipt
- Transparency-first design

**Transparency Note**:
This module is part of the open, non-commercial ABE framework (CC BY-NC 4.0).  
It exists to expose and quantify unconstitutional fund misuse without ever monetizing the framework.

**Last Updated**: April 2026
