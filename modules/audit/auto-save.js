// ABE Auto-Save — Local only, never loses an audit
function autoSaveAudit(runData) {
  const key = "abe_last_audit_" + Date.now();
  const save = {
    timestamp: new Date().toISOString(),
    divergence: runData.divergence || "N/A",
    recovery: runData.recovery || "N/A",
    certificate: runData.sha256 || "pending"
  };
  
  localStorage.setItem(key, JSON.stringify(save));
  console.log("✅ Audit auto-saved locally");
  
  // Optional: Show a tiny toast
  const toast = document.createElement("div");
  toast.textContent = "Audit saved locally";
  toast.style.cssText = "position:fixed; bottom:80px; left:50%; transform:translateX(-50%); background:#0f0; color:#000; padding:8px 16px; border-radius:8px; font-size:0.85rem;";
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2000);
}

// Hook into existing run button (add this to your orchestrator or index if needed)
window.autoSaveAudit = autoSaveAudit;
