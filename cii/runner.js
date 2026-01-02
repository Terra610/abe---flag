// cii/runner.js
// CII → Convert CIBS allocations into a project portfolio (template-driven)
// Local-only. Reads derived.cibs.allocations. Uses cii/portfolio_template.csv with embedded fallback.

function num(x, fallback = 0) {
  if (x === "" || x === null || x === undefined) return fallback;
  const n = Number(x);
  return Number.isFinite(n) ? n : fallback;
}

function parseCSV(text) {
  // Simple CSV parser (no quotes). OK for controlled templates.
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

async function loadPortfolioCSV() {
  // From /cii/runner.js, resolves to /cii/portfolio_template.csv
  const res = await fetch("./portfolio_template.csv", { cache: "no-store" });
  if (!res.ok) throw new Error("Could not load cii/portfolio_template.csv");
  return await res.text();
}

function embeddedDefaultPortfolio() {
  return [
    { category: "housing", project_id: "HOU-01", project_name: "Emergency rent stabilization", pct_of_category: 0.6, unit_cost_usd: 1200, unit_name: "household-month", priority: 1, notes: "Stops displacement fast" },
    { category: "housing", project_id: "HOU-02", project_name: "Security deposit bridge", pct_of_category: 0.4, unit_cost_usd: 1800, unit_name: "household", priority: 2, notes: "Helps people get into stable housing" },

    { category: "clinics", project_id: "CLN-01", project_name: "Primary care vouchers", pct_of_category: 0.7, unit_cost_usd: 150, unit_name: "visit", priority: 1, notes: "Immediate access" },
    { category: "clinics", project_id: "CLN-02", project_name: "Mental health sessions", pct_of_category: 0.3, unit_cost_usd: 120, unit_name: "session", priority: 2, notes: "Stabilization support" },

    { category: "food", project_id: "FOO-01", project_name: "Grocery support cards", pct_of_category: 1.0, unit_cost_usd: 250, unit_name: "household-month", priority: 1, notes: "Basic nutrition" },

    { category: "mobility", project_id: "MOB-01", project_name: "Repair-to-road grants", pct_of_category: 0.6, unit_cost_usd: 600, unit_name: "vehicle", priority: 1, notes: "Keep people mobile" },
    { category: "mobility", project_id: "MOB-02", project_name: "Transit passes", pct_of_category: 0.4, unit_cost_usd: 75, unit_name: "pass-month", priority: 2, notes: "Short-term mobility" },

    { category: "workforce", project_id: "WRK-01", project_name: "Job training stipends", pct_of_category: 0.6, unit_cost_usd: 500, unit_name: "participant", priority: 1, notes: "Skill lift" },
    { category: "workforce", project_id: "WRK-02", project_name: "Tools + certification fees", pct_of_category: 0.4, unit_cost_usd: 350, unit_name: "participant", priority: 2, notes: "Removes barriers" },

    { category: "legal_aid", project_id: "LEG-01", project_name: "Defense + expungement support", pct_of_category: 1.0, unit_cost_usd: 900, unit_name: "case", priority: 1, notes: "Converts relief into permanence" },

    { category: "admin_ops", project_id: "OPS-01", project_name: "Local ops & audit support", pct_of_category: 1.0, unit_cost_usd: 1, unit_name: "allocation", priority: 9, notes: "Keep it running + verifiable" }
  ];
}

function normalizePortfolio(rows) {
  return rows
    .map(r => ({
      category: (r.category || "").trim(),
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

function groupByCategory(items) {
  const m = new Map();
  for (const it of items) {
    if (!m.has(it.category)) m.set(it.category, []);
    m.get(it.category).push(it);
  }
  return m;
}

function ensureIds(projects) {
  // If any project_id missing, generate deterministic IDs by category + index
  const byCat = groupByCategory(projects);
  for (const [cat, list] of byCat.entries()) {
    list.sort((a, b) => (a.priority - b.priority) || a.project_name.localeCompare(b.project_name));
    list.forEach((p, idx) => {
      if (!p.project_id) p.project_id = `${cat.toUpperCase().slice(0, 3)}-${String(idx + 1).padStart(2, "0")}`;
    });
  }
  return projects;
}

function allocateWithinCategory(categoryBudget, projectsForCategory) {
  // Normalize pct_of_category within this category; if all 0 -> equal weights
  const sumPct = projectsForCategory.reduce((s, p) => s + p.pct_of_category, 0);
  let normalized = projectsForCategory.map(p => ({ ...p }));

  if (sumPct <= 0) {
    const eq = normalized.length ? 1 / normalized.length : 0;
    normalized.forEach(p => (p.pct_of_category = eq));
  } else {
    normalized.forEach(p => (p.pct_of_category = p.pct_of_category / sumPct));
  }

  // Compute allocations + coverage
  return normalized.map(p => {
    const amount = categoryBudget * p.pct_of_category;
    const amount_usd = Math.round(amount * 100) / 100;

    // Coverage = floor(amount / unit_cost) when unit_cost is meaningful
    let coverage_count = null;
    if (p.unit_cost_usd > 0 && p.unit_name !== "allocation") {
      coverage_count = Math.floor(amount_usd / p.unit_cost_usd);
    }

    return {
      project_id: p.project_id,
      category: p.category,
      name: p.project_name,
      amount_usd,
      unit_cost_usd: p.unit_cost_usd,
      unit_name: p.unit_name,
      coverage_count,
      priority: p.priority,
      notes: p.notes || ""
    };
  });
}

export async function run(scenario, ctx = {}) {
  const cibs = scenario?.derived?.cibs;
  if (!cibs) throw new Error("Missing derived.cibs (run CIBS first).");

  const allocations = Array.isArray(cibs.allocations) ? cibs.allocations : [];
  const total_alloc = allocations.reduce((s, a) => s + num(a.amount_usd, 0), 0);

  // Load portfolio template CSV if possible; fallback otherwise
  let templateSource = "repo_csv";
  let portfolioRows;
  try {
    const csvText = await loadPortfolioCSV();
    portfolioRows = normalizePortfolio(parseCSV(csvText));
  } catch (e) {
    templateSource = "embedded_default";
    portfolioRows = embeddedDefaultPortfolio();
  }

  portfolioRows = ensureIds(portfolioRows);

  const byCat = groupByCategory(portfolioRows);

  // Build portfolio: for each allocation category, allocate projects
  const portfolio = [];
  const missingCategories = [];

  for (const alloc of allocations) {
    const category = (alloc.category || "").trim();
    const budget = Math.max(0, num(alloc.amount_usd, 0));

    const projects = byCat.get(category) || [];
    if (!projects.length) {
      // No template row for this category: create a deterministic fallback project
      missingCategories.push(category);
      portfolio.push({
        project_id: `${category.toUpperCase().slice(0, 3)}-00`,
        category,
        name: `${category} — general fund`,
        amount_usd: Math.round(budget * 100) / 100,
        unit_cost_usd: 0,
        unit_name: "allocation",
        coverage_count: null,
        priority: 9,
        notes: "Auto-generated fallback project because no template rows exist for this category."
      });
      continue;
    }

    // Sort by priority (lower is higher)
    const sorted = [...projects].sort((a, b) => (a.priority - b.priority) || a.project_name.localeCompare(b.project_name));
    const lines = allocateWithinCategory(budget, sorted);
    portfolio.push(...lines);
  }

  // Deterministic cleanup: sort portfolio lines for stable hashing
  portfolio.sort((a, b) => {
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
      template_source: templateSource
    },
    total_budget_in: Math.round(total_alloc * 100) / 100,
    missing_categories: missingCategories,
    portfolio,
    notes:
      "CII converts category allocations into a project portfolio using portfolio_template.csv (or embedded fallback). Coverage is computed deterministically from unit_cost_usd."
  };
      }
