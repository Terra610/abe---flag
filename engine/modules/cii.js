// cii/runner.js
// CII (FINAL) — Build project portfolio from CIBS allocations
// Order: portfolio.csv (curated) → portfolio_template.csv → embedded fallback
// Local-only, deterministic, audit-ready.

function num(x, fallback = 0) {
  if (x === "" || x === null || x === undefined) return fallback;
  const n = Number(x);
  return Number.isFinite(n) ? n : fallback;
}

function parseCSV(text) {
  // Simple CSV parser (no quoted commas). Good for controlled templates & your current CSV.
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

// ----------------- Category normalization / mapping -----------------
function normCat(raw) {
  const c = (raw || "").trim().toLowerCase();
  // map portfolio categories → CIBS categories
  if (c === "health" || c === "clinic" || c === "clinics") return "clinics";
  if (c === "transport" || c === "transportation" || c === "mobility") return "mobility";
  if (c === "education" || c === "workforce" || c === "jobs" || c === "training") return "workforce";
  if (c === "legal" || c === "legal aid" || c === "legal_aid") return "legal_aid";
  if (c === "ops" || c === "admin" || c === "admin_ops") return "admin_ops";
  // already aligned
  return c;
}

// ----------------- Loaders -----------------
async function loadText(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`Could not load ${path}`);
  return await res.text();
}

async function tryLoadPortfolioCSV() {
  // runner.js is in /cii, so these are relative to /cii/
  const txt = await loadText("./portfolio.csv");
  return txt;
}

async function tryLoadTemplateCSV() {
  const txt = await loadText("./portfolio_template.csv");
  return txt;
}

// ----------------- Embedded fallback template -----------------
function embeddedDefaultTemplateRows() {
  return [
    { category: "housing", project_id: "HOU-01", project_name: "Emergency rent stabilization", pct_of_category: 0.6, unit_cost_usd: 1200, unit_name: "household-month", priority: 1, notes: "" },
    { category: "housing", project_id: "HOU-02", project_name: "Security deposit bridge", pct_of_category: 0.4, unit_cost_usd: 1800, unit_name: "household", priority: 2, notes: "" },

    { category: "clinics", project_id: "CLN-01", project_name: "Primary care vouchers", pct_of_category: 0.7, unit_cost_usd: 150, unit_name: "visit", priority: 1, notes: "" },
    { category: "clinics", project_id: "CLN-02", project_name: "Mental health sessions", pct_of_category: 0.3, unit_cost_usd: 120, unit_name: "session", priority: 2, notes: "" },

    { category: "food", project_id: "FOO-01", project_name: "Grocery support cards", pct_of_category: 1.0, unit_cost_usd: 250, unit_name: "household-month", priority: 1, notes: "" },

    { category: "mobility", project_id: "MOB-01", project_name: "Repair-to-road grants", pct_of_category: 0.6, unit_cost_usd: 600, unit_name: "vehicle", priority: 1, notes: "" },
    { category: "mobility", project_id: "MOB-02", project_name: "Transit passes", pct_of_category: 0.4, unit_cost_usd: 75, unit_name: "pass-month", priority: 2, notes: "" },

    { category: "workforce", project_id: "WRK-01", project_name: "Job training stipends", pct_of_category: 0.6, unit_cost_usd: 500, unit_name: "participant", priority: 1, notes: "" },
    { category: "workforce", project_id: "WRK-02", project_name: "Tools + certification fees", pct_of_category: 0.4, unit_cost_usd: 350, unit_name: "participant", priority: 2, notes: "" },

    { category: "legal_aid", project_id: "LEG-01", project_name: "Defense + expungement support", pct_of_category: 1.0, unit_cost_usd: 900, unit_name: "case", priority: 1, notes: "" },

    { category: "admin_ops", project_id: "OPS-01", project_name: "Local ops & audit support", pct_of_category: 1.0, unit_cost_usd: 1, unit_name: "allocation", priority: 9, notes: "" }
  ];
}

// ----------------- Portfolio mode (uses portfolio.csv) -----------------
function normalizePortfolioRows(rows) {
  // Expected columns (your current file):
  // name,category,cost_usd,households,status
  return rows
    .map((r, idx) => ({
      project_id: `PRJ-${String(idx + 1).padStart(3, "0")}`,
      name: (r.name || "").trim() || "Unnamed project",
      category: normCat(r.category),
      cost_usd: Math.max(0, num(r.cost_usd, 0)),
      households: Math.max(0, Math.floor(num(r.households, 0))),
      status: (r.status || "").trim()
    }))
    .filter(p => p.name && p.category);
}

function groupBy(arr, keyFn) {
  const m = new Map();
  for (const item of arr) {
    const k = keyFn(item);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(item);
  }
  return m;
}

function allocateBudgetAcrossProjects(category, budget, projects) {
  // Proportional by project cost_usd; if costs all 0, equal split.
  const sumCost = projects.reduce((s, p) => s + p.cost_usd, 0);
  const useEqual = sumCost <= 0;

  const lines = projects.map((p) => {
    const weight = useEqual ? 1 / projects.length : (p.cost_usd / sumCost);
    const amount_usd = Math.round((budget * weight) * 100) / 100;

    // If households exists, estimate funded_households proportionally
    let funded_households = null;
    if (p.households > 0) {
      funded_households = Math.floor(p.households * weight);
    }

    return {
      project_id: p.project_id,
      category,
      name: p.name,
      amount_usd,
      coverage_count: funded_households,
      coverage_unit: funded_households !== null ? "households" : null,
      status: p.status || "",
      notes: "Allocated proportionally by project cost within category."
    };
  });

  // Fix rounding drift by adjusting first project
  const drift = Math.round((budget - lines.reduce((s, l) => s + l.amount_usd, 0)) * 100) / 100;
  if (Math.abs(drift) >= 0.01 && lines.length) {
    lines[0].amount_usd = Math.round((lines[0].amount_usd + drift) * 100) / 100;
  }

  return lines;
}

// ----------------- Template mode (uses portfolio_template.csv) -----------------
function normalizeTemplateRows(rows) {
  return rows
    .map(r => ({
      category: normCat(r.category),
      project_id: (r.project_id || "").trim() || null,
      project_name: (r.project_name || "").trim() || "Unnamed project",
      pct_of_category: num(r.pct_of_category, 0),
      unit_cost_usd: Math.max(0, num(r.unit_cost_usd, 0)),
      unit_name: (r.unit_name || "").trim() || "unit",
      priority: num(r.priority, 99),
      notes: (r.notes || "").trim()
    }))
    .filter(r => r.category);
}

function ensureTemplateIds(rows) {
  const byCat = groupBy(rows, r => r.category);
  for (const [cat, list] of byCat.entries()) {
    list.sort((a, b) => (a.priority - b.priority) || a.project_name.localeCompare(b.project_name));
    list.forEach((p, idx) => {
      if (!p.project_id) p.project_id = `${cat.toUpperCase().slice(0, 3)}-${String(idx + 1).padStart(2, "0")}`;
    });
  }
  return rows;
}

function allocateWithinCategoryTemplate(categoryBudget, projectsForCategory) {
  const sumPct = projectsForCategory.reduce((s, p) => s + p.pct_of_category, 0);
  let normalized = projectsForCategory.map(p => ({ ...p }));

  if (sumPct <= 0) {
    const eq = normalized.length ? 1 / normalized.length : 0;
    normalized.forEach(p => (p.pct_of_category = eq));
  } else {
    normalized.forEach(p => (p.pct_of_category = p.pct_of_category / sumPct));
  }

  const lines = normalized.map(p => {
    const amount_usd = Math.round((categoryBudget * p.pct_of_category) * 100) / 100;
    let coverage_count = null;
    if (p.unit_cost_usd > 0 && p.unit_name !== "allocation") {
      coverage_count = Math.floor(amount_usd / p.unit_cost_usd);
    }

    return {
      project_id: p.project_id,
      category: p.category,
      name: p.project_name,
      amount_usd,
      coverage_count,
      coverage_unit: p.unit_name,
      status: "",
      notes: p.notes || ""
    };
  });

  const drift = Math.round((categoryBudget - lines.reduce((s, l) => s + l.amount_usd, 0)) * 100) / 100;
  if (Math.abs(drift) >= 0.01 && lines.length) {
    lines[0].amount_usd = Math.round((lines[0].amount_usd + drift) * 100) / 100;
  }

  return lines;
}

// ----------------- Runner -----------------
export async function run(scenario, ctx = {}) {
  const cibs = scenario?.derived?.cibs;
  if (!cibs) throw new Error("Missing derived.cibs (run CIBS first).");

  const allocations = Array.isArray(cibs.allocations) ? cibs.allocations : [];
  const total_alloc = Math.round(allocations.reduce((s, a) => s + num(a.amount_usd, 0), 0) * 100) / 100;

  // Try curated portfolio first
  let mode = "portfolio_csv";
  let portfolioProjects = null;

  try {
    const txt = await tryLoadPortfolioCSV();
    portfolioProjects = normalizePortfolioRows(parseCSV(txt));
    if (!portfolioProjects.length) throw new Error("portfolio.csv empty or invalid");
  } catch (e) {
    portfolioProjects = null;
    mode = "template_csv";
  }

  let templateRows = null;
  if (mode !== "portfolio_csv") {
    try {
      const txt = await tryLoadTemplateCSV();
      templateRows = ensureTemplateIds(normalizeTemplateRows(parseCSV(txt)));
      if (!templateRows.length) throw new Error("portfolio_template.csv empty or invalid");
    } catch (e) {
      mode = "embedded_default";
      templateRows = ensureTemplateIds(embeddedDefaultTemplateRows());
    }
  }

  const portfolioLines = [];
  const missing_categories = [];

  if (mode === "portfolio_csv") {
    const byCat = groupBy(portfolioProjects, p => p.category);

    for (const alloc of allocations) {
      const category = normCat(alloc.category);
      const budget = Math.max(0, num(alloc.amount_usd, 0));

      const projects = byCat.get(category) || [];
      if (!projects.length) {
        missing_categories.push(category);
        portfolioLines.push({
          project_id: `${category.toUpperCase().slice(0, 3)}-00`,
          category,
          name: `${category} — general fund`,
          amount_usd: Math.round(budget * 100) / 100,
          coverage_count: null,
          coverage_unit: null,
          status: "",
          notes: "Auto-generated because no curated projects matched this category."
        });
        continue;
      }

      portfolioLines.push(...allocateBudgetAcrossProjects(category, budget, projects));
    }
  } else {
    const byCat = groupBy(templateRows, r => r.category);

    for (const alloc of allocations) {
      const category = normCat(alloc.category);
      const budget = Math.max(0, num(alloc.amount_usd, 0));

      const projects = byCat.get(category) || [];
      if (!projects.length) {
        missing_categories.push(category);
        portfolioLines.push({
          project_id: `${category.toUpperCase().slice(0, 3)}-00`,
          category,
          name: `${category} — general fund`,
          amount_usd: Math.round(budget * 100) / 100,
          coverage_count: null,
          coverage_unit: "allocation",
          status: "",
          notes: "Auto-generated because no template rows existed for this category."
        });
        continue;
      }

      const sorted = [...projects].sort((a, b) => (a.priority - b.priority) || a.project_name.localeCompare(b.project_name));
      portfolioLines.push(...allocateWithinCategoryTemplate(budget, sorted));
    }
  }

  // Deterministic sort for stable hashing
  portfolioLines.sort((a, b) => {
    const c = a.category.localeCompare(b.category);
    if (c !== 0) return c;
    return a.project_id.localeCompare(b.project_id);
  });

  return {
    module: "CII",
    module_version: "1.0",
    generated_at: new Date().toISOString(),
    inputs_used: {
      cibs_present: true,
      mode // portfolio_csv | template_csv | embedded_default
    },
    total_budget_in: total_alloc,
    missing_categories,
    portfolio: portfolioLines,
    notes:
      "CII converts CIBS allocations into a project portfolio. Prefers curated portfolio.csv, falls back to portfolio_template.csv, then embedded defaults. Deterministic + audit-ready."
  };
      }
