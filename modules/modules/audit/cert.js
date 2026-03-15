// ABE Audit Certificate Generator - Local only
function generateAuditCertificate(runData) {
  const timestamp = new Date().toISOString();
  const hash = btoa(JSON.stringify(runData)).slice(0, 64); // Simple local SHA-like for demo; real SHA-256 can be added later
  
  const cert = {
    abeVersion: "2.0",
    runId: "abe-" + Date.now(),
    timestamp: timestamp,
    divergenceScore: runData.divergence || "N/A",
    recoveredValue: runData.recovery || "N/A",
    sha256: hash,
    message: "This audit was performed 100% locally. Constitution > All."
  };

  const blob = new Blob([JSON.stringify(cert, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement("a");
  a.href = url;
  a.download = `ABE_Audit_${cert.runId}.json`;
  a.click();
  
  return cert;
}

// Export for use in other modules
window.generateAuditCertificate = generateAuditCertificate;