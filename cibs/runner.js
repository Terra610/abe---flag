// cibs/runner.js
// CIBS → Budget allocation from CIRI total_recovery
// Local-only. Template-driven via cibs/budget_template.csv, with embedded fallback.
// Output shape is stable for CII consumption.

function num(x, fallback = 0) {
  if (x === "" || x === null || x === undefined) return fallback;
  const n = Number(x);
  return Number.isFinite(n) ? n : fallback;
}

function parseCSV(text) {
  // Simple CSV parser (no quotes handling). Works for our controlled templates.
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (!lines.length) return [];
  const headers = lines[0].split(",").map(h => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map(c => c.trim());
    const row = {};
    headers.forEach((h, idx) => (row[h] = cols[idx] ?? ""));
    rows.push(row);
  }
  return rows;
}

async function loadTemplateCSV() {
  // From /cibs/runner.js, this resolves to /cibs/budget_template.csv
  const res = await fetch("./budget_template.csv", { cache: "no-store" });
  if (!res.ok) throw new Error("Could not load cibs/budget_template.csv");
  return await res.text();
}

function embeddedDefaultTemplate() {
  return [
    { category: "housing", pct: 0.25, min_usd: 0, max_usd: null, priority: 1, notes: "Stability and shelter" },
    { category: "clinics", pct: 0.15, min_usd: 0, max_usd: null, priority: 2, notes: "Healthcare access" },
    { category: "food", pct: 0.10, min_usd: 0, max_usd: null, priority: 3, notes: "Nutrition support" },
    { category: "mobility", pct: 0.20, min_usd: 0, max_usd: null, priority: 2, notes: "Transportation access" },
    { category: "workforce", pct: 0.15, min_usd: 0, max_usd: null, priority: 2, notes: "Jobs and training" },
    { category: "legal_aid", pct: 0.05, min_usd: 0, max_usd: null, priority: 3, notes: "Defense and admin relief" },
    { category: "admin_ops", pct: 0.10, min_usd: 0, max_usd: null, priority: 4, notes: "Operating costs" }
  ];
}

function normalizeTemplate(rows) {
  const cleaned = rows
    .map(r => ({
      category: (r.category || "").trim(),
      pct: num(r.pct, 0),
      min_usd: num(r.min_usd, 0),
      max_usd: r.max_usd === "" ? null : num(r.max_usd, null),
      priority: num(r.priority, 99),
      notes: (r.notes || "").trim()
    }))
    .filter(r => r.category);

  // If all pcts are 0, make equal weights
  const sumPct = cleaned.reduce((a, r) => a + r.pct, 0);
  if (sumPct <= 0) {
    const eq = cleaned.length ? 1 / cleaned.length : 0;
    cleaned.forEach(r => (r.pct = eq));
    return cleaned;
  }

  // Normalize to 1.0
  cleaned.forEach(r => (r.pct = r.pct / sumPct));
  return cleaned;
}

function allocateWithCaps(total, template) {
  // Start with proportional allocation
  const alloc = template.map(t => ({
    category: t.category,
    pct: t.pct,
    min_usd: t.min_usd,
    max_usd: t.max_usd,
    priority: t.priority,
    notes: t.notes,
    amount_usd: 0
  }));

  // Step 1: initial proportional amounts
  alloc.forEach(a => {
    a.amount_usd = total * a.pct;
  });

  // Step 2: enforce mins
  let remaining = total;
  alloc.forEach(a => {
    const floor = Math.max(0, a.min_usd || 0);
    if (a.amount_usd < floor) a.amount_usd = floor;
  });
  remaining = total - alloc.reduce((s, a) => s + a.amount_usd, 0);

  // If mins exceed total, scale mins down proportionally (hard reality)
  if (remaining < 0) {
    const sum = alloc.reduce((s, a) => s + a.amount_usd, 0) || 1;
    alloc.forEach(a => (a.amount_usd = (a.amount_usd / sum) * total));
    remaining = 0;
  }

  // Step 3: enforce max caps, reclaim excess
  let reclaimed = 0;
  alloc.forEach(a => {
    if (a.max_usd !== null && a.max_usd !== undefined) {
      const cap = Math.max(0, a.max_usd);
      if (a.amount_usd > cap) {
        reclaimed += (a.amount_usd - cap);
        a.amount_usd = cap;
      }
    }
  });
  remaining += reclaimed;

  // Step 4: redistribute remaining by priority + pct (excluding capped items)
  // Lower priority number = more important
  // We iterate until no remaining or no eligible buckets
  let safety = 0;
  while (remaining > 0.01 && safety < 50) {
    safety++;

    const eligible = alloc.filter(a => {
      const capped = (a.max_usd !== null && a.max_usd !== undefined) && a.amount_usd >= a.max_usd - 0.0001;
      return !capped;
    });

    if (!eligible.length) break;

    // Weighted by (1/priority) * pct
    const weights = eligible.map(a => (1 / Math.max(1, a.priority)) * Math.max(0.000001, a.pct));
    const wSum = weights.reduce((s, w) => s + w, 0) || 1;

    let distributed = 0;
    eligible.forEach((a, idx) => {
      const share = remaining * (weights[idx] / wSum);

      // Respect max cap if present
      if (a.max_usd !== null && a.max_usd !== undefined) {
        const capRoom = Math.max(0, a.max_usd - a.amount_usd);
        const add = Math.min(share, capRoom);
        a.amount_usd += add;
        distributed += add;
      } else {
        a.amount_usd += share;
        distributed += share;
      }
    });

    remaining -= distributed;

    // If we couldn't distribute (all capped), stop
    if (distributed < 0.01) break;
  }

  // Step 5: round to cents and fix rounding drift
  alloc.forEach(a => (a.amount_usd = Math.round(a.amount_usd * 100) / 100));
  const drift = Math.round((total - alloc.reduce((s, a) => s + a.amount_usd, 0)) * 100) / 100;
  if (Math.abs(drift) >= 0.01 && alloc.length) {
    // Add/subtract drift to the highest priority item
    const best = [...alloc].sort((a, b) => a.priority - b.priority)[0];
    best.amount_usd = Math.round((best.amount_usd + drift) * 100) / 100;
  }

  return alloc;
}

export async function run(scenario, ctx = {}) {
  const ciri = scenario?.derived?.ciri;
  if (!ciri) throw new Error("Missing derived.ciri (run CIRI first).");

  const total = Math.max(0, num(ciri.total_recovery, 0));

  // Load template from CSV if possible; fallback otherwise
  let templateSource = "repo_csv";
  let template;
  try {
    const csvText = await loadTemplateCSV();
    const rows = parseCSV(csvText);
    template = normalizeTemplate(rows);
  } catch (e) {
    templateSource = "embedded_default";
    template = embeddedDefaultTemplate();
  }

  // If template ended up empty, force one bucket
  if (!template || !template.length) {
    templateSource = "forced_single_bucket";
    template = [{ category: "general", pct: 1, min_usd: 0, max_usd: null, priority: 1, notes: "Fallback allocation" }];
  }

  const allocations = allocateWithCaps(total, template);

  return {
    module: "CIBS",
    module_version: "1.0",
    generated_at: new Date().toISOString(),
    inputs_used: {
      ciri_present: true,
      template_source: templateSource
    },
    total_recovery: total,
    allocations,
    notes:
      "CIBS allocates total_recovery into categories using budget_template.csv (or embedded fallback). Output is deterministic and audit-ready."
  };
}
