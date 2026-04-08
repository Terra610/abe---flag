# Intake — Document & Text Entry Module

**Purpose**:  
The entry point of the ABE engine. Accepts uploaded documents (PDF, images, text) or pasted text and produces a clean, structured `inputs.intake` artifact that all other modules can use. Everything stays local — no data leaves the browser.

**Firing Order Position**: First module.

**Core Responsibilities**:
- Extracts text from PDFs (via PDF.js) and images (via Tesseract.js if available)
- Normalizes and structures input data
- Creates the canonical intake artifact with SHA-256 hash capability
- Passes structured data to CDA, CIRI, and other modules

**Inputs**:
- Files (PDF, images, text) or pasted text
- Optional doc_type (traffic_ticket, court_order, eviction_notice, loan_contract, generic)

**Outputs**:
- `inputs.intake` — structured artifact with extracted text, metadata, and targets

**Key Features**:
- Fully local-only (no network calls with user data)
- Supports multiple file types
- Feeds directly into the rest of the pipeline

**Transparency Note**:
This module is part of the open, non-commercial ABE framework (CC BY-NC 4.0).  
It exists to make constitutional analysis accessible to everyone without compromising privacy.

**Last Updated**: April 2026
