// engine/modules/cii/index.js
// CII — Community Impact & Integrity (Project Portfolios)
// Self-contained module (logic + UI)
// Takes CIBS allocation and turns it into tangible project portfolios

import { getOrCreateScenario, writeDerived, setModuleStatus } from "../core/session.js";

export async function run(scenario) {
  const s = scenario || getOrCreateScenario();

  const cibs = s.derived?.cibs || {};
  const ciri = s.derived?.ciri || {};

  const portfolio = {
    module: "CII",
    module_version: "1.0",
    generated_at: new Date().toISOString(),
    constitutional_capital_allocated: cibs.constitutional_capital_unlocked || 0,
    projects: [
      {
        name: "Housing Restoration",
        allocation: cibs.allocation_breakdown?.housing_restoration || 0,
        description: "Remodel vacant homes using local contractors and recycled materials",
        impact: "Serves homeless population, foster youth, and domestic violence survivors",
        metrics: `${Math.round((cibs.allocation_breakdown?.housing_restoration || 0) / 50000)} homes restored`
      },
      {
        name: "Public Safety Realignment",
        allocation: cibs.allocation_breakdown?.public_safety_realignment || 0,
        description: "Transition DOC and law enforcement officers to true public protection roles (playground safety, child abduction prevention, domestic violence response)",
        impact: "Reduces unconstitutional enforcement while increasing actual community safety",
        metrics: "Officer payroll continuity + new protection-focused positions"
      },
      {
        name: "Youth & Community Centers",
        allocation: cibs.allocation_breakdown?.community_centers_youth || 0,
        description: "Build and staff local centers for after-school safety and youth programs",
        impact: "30% projected reduction in youth crime through presence and opportunity",
        metrics: "Community cohesion and prevention-focused investment"
      },
      {
        name: "Local Job Training & Soil Health",
        allocation: (cibs.allocation_breakdown?.local_job_training || 0) + (cibs.allocation_breakdown?.soil_health_agriculture || 0),
        description: "Workforce reintegration and regenerative agriculture support",
        impact: "Breaks poverty cycles and restores rural economic floor",
        metrics: "Jobs created + improved soil capital"
      }
    ],
    total_projects_funded: 4,
    notes: "All projects funded exclusively from recovered constitutional capital — no new taxes or debt."
  };

  writeDerived("cii", portfolio);
  setModuleStatus("cii", "OK", "Community Impact portfolios generated");

  return portfolio;
}

// Self-contained UI for CII module
export function renderUI(container) {
  container.innerHTML = `
    <div class="module-box">
      <h2>CII — Community Impact & Integrity (Project Portfolios)</h2>
      <p>Turns recovered constitutional capital into real, tangible community projects.</p>
      
      <button id="run-cii">Generate Project Portfolios</button>
      
      <div id="cii-result" style="margin-top: 1.5rem;"></div>
    </div>
  `;

  const btn = container.querySelector('#run-cii');
  const resultDiv = container.querySelector('#cii-result');

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    btn.textContent = 'Generating Portfolios...';

    const scenario = getOrCreateScenario();
    const result = await run(scenario);

    let html = `<strong>CII Project Portfolios</strong><br><br>`;
    html += `Total Constitutional Capital Allocated: $${(result.constitutional_capital_allocated / 1e9).toFixed(2)} Billion<br><br>`;

    result.projects.forEach(project => {
      html += `<strong>${project.name}</strong><br>`;
      html += `Allocation: $${(project.allocation / 1e9).toFixed(2)}B<br>`;
      html += `Impact: ${project.impact}<br>`;
      html += `Metrics: ${project.metrics}<br><br>`;
    });

    resultDiv.innerHTML = html;

    btn.disabled = false;
    btn.textContent = 'Generate Project Portfolios';
  });
        }
