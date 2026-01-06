// system/runner.js
// system → Engine System Map (reads system/map.json)
// Local-only. Produces derived.systemmap for transparency + linkage.

async function loadMap() {
  const res = await fetch("./map.json", { cache: "no-store" });
  if (!res.ok) throw new Error("Could not load system/map.json");
  return await res.json();
}

function makePlainEnglish(map) {
  // Junior-high friendly explanation
  const steps = [];

  // Support both old and new shapes:
  // - new: map.flows = [{from,to,control,...}, ...]
  // - old: map.flow / map.data_flow / map.pipeline = ["step", ...]
  if (Array.isArray(map?.flows)) {
    map.flows.forEach((f, i) => {
      const from = f?.from ? String(f.from) : "(unknown)";
      const to = f?.to ? String(f.to) : "(unknown)";
      const control = f?.control ? ` — ${String(f.control)}` : "";
      steps.push(`${i + 1}. ${from} → ${to}${control}`);
    });
  } else {
    const flow = map?.flow || map?.data_flow || map?.pipeline || null;
    if (Array.isArray(flow)) {
      flow.forEach((s, i) => steps.push(`${i + 1}. ${String(s)}`));
    }
  }

  return {
    headline: "ABE runs like an engine: modules fire in order, using the same uploaded data.",
    bullets: [
      "You upload files once (or use defaults).",
      "Each module reads specific inputs and writes specific outputs.",
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
    module: "system",
    module_version: "1.0",
    generated_at: new Date().toISOString(),
    system_map: map,
    explain_like_im_12: plain,
    notes: "Loaded from system/map.json. This output exists so Integration can hash + receipt the map state too."
  };
}
