# Systems — System Map & Pipeline Integrity

**Purpose**:  
Verifies the overall integrity of the ABE engine pipeline, confirms correct firing order, and ensures all modules are operating within the defined constitutional systems architecture.

**Firing Order Position**: Early in the sequence (after intake, before cae).

**Core Responsibilities**:
- Validates the firing order defined in system-map.json
- Checks module status and data flow integrity
- Ensures guardrails (privacy, non-monetization, determinism) are active
- Serves as the "system health check" before deeper analysis modules run

**Inputs**:
- Current scenario state

**Outputs**:
- `derived.systems` — pipeline status, integrity score, and any warnings

**Key Features**:
- Acts as the guardrail enforcer for the entire engine
- Supports the new Constitutional Systems Engineering discipline
- Fully local-only with SHA-256 receipt

**Transparency Note**:
This module is part of the open, non-commercial ABE framework (CC BY-NC 4.0).  
It exists to maintain the deterministic, transparent, and private nature of the entire system.

**Last Updated**: April 2026
