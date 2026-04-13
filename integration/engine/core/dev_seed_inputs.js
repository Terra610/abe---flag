// engine/core/dev_seed_inputs.js
import { getOrCreateScenario, saveScenario } from "./session.js";

export function seedCiriInputs() {
  const s = getOrCreateScenario();
  s.inputs.ciri_inputs = {
    cases_avoided: 1,
    cost_per_case: 1500,
    jail_days_avoided: 2,
    cost_per_jail_day: 110,
    enforcement_hours_avoided: 4,
    cost_per_enforcement_hour: 65,
    fees_canceled_total: 350,
    households_restored: 1,
    market_access_value_per_household: 5000,
    people_impacted: 1,
    employment_probability: 0.6,
    wage_uplift_per_person: 8000,
    litigation_risk_avoided: 500,
    transition_costs: 250,
    K: 1000000
  };
  saveScenario(s);
  alert("Seeded inputs.ciri_inputs into scenario.");
}
