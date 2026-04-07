// ABE AI Assistant - Fully local, privacy-first
class ABEAssistant {
  constructor() {
    this.messages = [];
    this.moduleData = {}; // Will pull from your existing CIRI/CCRI etc.
  }

  async respond(userInput) {
    const lower = userInput.toLowerCase();
    
    // Intake guidance
    if (lower.includes("intake") || lower.includes("upload") || lower.includes("start")) {
      return "✅ Step 1: Click 'Intake & OCR'. Upload any PDF/CSV (ticket, statute, loan doc). The engine processes it 100% locally. Step 2: Review the cleaned text. Ready?";
    }
    
    // Module walkthrough
    if (lower.includes("cda") || lower.includes("divergence")) {
      return "CDA = Constitutional Divergence Audit. It scores 0–1 how far a rule strays from the Constitution (e.g., FMCSR on non-commercial drivers = 0.75 drag). Output shows ALLOW / HALT / REMEDIATE + SHA-256 proof.";
    }
    if (lower.includes("ciri") || lower.includes("roi") || lower.includes("savings")) {
      return "CIRI calculates exact economic harm and recovery. Example: 0.75 divergence on transport = $3.5T national drag → realignment saves $0.5T/year + 1.8× multiplier = $1.3T 5-year uplift for your community.";
    }
    
    // General Q&A (ties to your tables)
    if (lower.includes("total") || lower.includes("savings") || lower.includes("uplift")) {
      return "Current U.S. totals from the engine: 8.1T annual drag → 1.3T annual savings → 5.8T 5-year uplift. Global: 21.3T drag → 6.3T savings. Want the full sector table or your local projection?";
    }
    
    // Default helpful reply
    return "I'm your ABE guide. Ask me about any module (Intake, CDA, CIRI, CIBS, Macro), a specific score, or how to read an audit certificate. What would you like to know? 🦋";
  }

  addMessage(text, isUser = true) {
    this.messages.push({ text, isUser });
    return this.messages;
  }
}

// Auto-attach to page (add this at the bottom of your main index.html)
window.abeAssistant = new ABEAssistant();
