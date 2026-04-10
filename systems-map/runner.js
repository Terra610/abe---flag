// system/runner.js
// SYSTEM → Engine System Map (reads system/map.json)
// Local-only. Produces derived.systemmap for transparency + linkage.

async function loadMap() {
  // IMPORTANT: Resolve map.json relative to this module file, not the calling page.
  const url = new URL("./map.json", import.meta.url);
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Could not load system/map.json (${res.status})`);
  return await res.json();
}

function makePlainEnglish(map) {
  // Junior-high friendly explanation
  const steps = [];
  const flow = map?.flows || map?.flow || map?.data_flow || map?.pipeline || null;

  if (Array.isArray(flow)) {
    flow.forEach((s, i) => {
      if (typeof s === "string") steps.push(`${i + 1}. ${s}`);
      else if (s && typeof s === "object") {
        const from = s.from ? `From: ${s.from}` : "";
        const to = s.to ? `To: ${s.to}` : "";
        const control = s.control ? `How: ${s.control}` : "";
        const line = [from, to, control].filter(Boolean).join(" • ");
        steps.push(`${i + 1}. ${line || "Step"}`);
      }
    });
  }

  return {
    headline: "ABE runs like an engine: modules fire in order using the same local scenario.",
    bullets: [
      "You can upload files once (or use a default scenario).",
      "Each module reads inputs.* and writes derived.* deterministically.",
      "Integration runs the firing order automatically.",
      "SHA-256 receipts prove what ran and what was produced — without servers, logins, or tracking."
    ],
    steps: steps.length ? steps : null
  };
}

export async function run(scenario, ctx = {}) {
  const map = await loadMap();
  const plain = makePlainEnglish(map);

  return {
    module: "SYSTEM",
    module_version: "1.1",
    generated_at: new Date().toISOString(),
    system_map: map,
    explain_like_im_12: plain,
    notes: "Loaded from system/map.json (resolved via import.meta.url). Hash this output for chain-of-custody."
  };
}
