// ciri/local.js
// CIRI — Constitutional Integrity ROI Engine (client-side)
// - Auto-bridges from Intake (abe_intake_artifact), CDA, and CCRI when present.
// - Computes economic recovery categories and CIRI index.
// - Stores ABE_CIRI_SCENARIO_V2 in localStorage, with SHA-256 hash.
// - Lets user download JSON + one-row CSV.

// ---------- helpers ----------

(function(){
  const byId = id => document.getElementById(id);

  function setStatus(text, kind){
    const el = byId('ciri-status');
    if(!el) return;
    el.textContent = 'Status: ' + text;
    el.className = 'ciri-status';
    if(kind === 'ok')   el.classList.add('ciri-status-ok');
    if(kind === 'warn') el.classList.add('ciri-status-warn');
    if(kind === 'bad')  el.classList.add('ciri-status-bad');
  }

  function money(n){
    const num = Number(n) || 0;
    try{
      return num.toLocaleString(undefined,{
        style:'currency',
        currency:'USD',
        maximumFractionDigits:0
      });
    }catch(_){
      return '$' + Math.round(num).toLocaleString();
    }
  }

  async function sha256OfText(text){
    const enc = new TextEncoder();
    const buf = enc.encode(text);
    const hash = await crypto.subtle.digest('SHA-256', buf);
    const bytes = new Uint8Array(hash);
    return Array.from(bytes).map(b=>b.toString(16).padStart(2,'0')).join('');
  }

  function downloadTextFile(name, text, type){
    const blob = new Blob([text], { type: type || 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function numberFromInput(id){
    const el = byId(id);
    if(!el) return 0;
    const raw = (el.value || '').trim();
    const num = Number(raw);
    if(Number.isNaN(num)) return 0;
    return num;
  }

  function setText(id, value){
    const el = byId(id);
    if(el) el.textContent = value;
  }

  // ---------- Intake bridge ----------

  function applyIntakeDefaults(){
    const bridge = byId('ciri-intake-bridge');
    try{
      const raw = localStorage.getItem('abe_intake_artifact');
      if(!raw){
        if(bridge) bridge.textContent =
          'Intake bridge: no recent Intake artifact found. You can still fill values manually.';
        return;
      }
      const art = JSON.parse(raw);

      if(bridge) bridge.textContent =
        'Intake bridge: using the last Intake artifact as context. All fields are editable.';

      // put snippet into notes if empty
      const notesEl = byId('ciri-notes');
      if(notesEl && !notesEl.value && art.text_normalized){
        const snippet = String(art.text_normalized).slice(0,500).replace(/\s+/g,' ');
        notesEl.value = snippet;
      }

      // if Intake already built a CIRI CSV row, try to parse & prefill
      const gen = art.generated_outputs || {};
      if(gen.ciri && gen.ciri.present && gen.ciri.csv_inline){
        const csv = String(gen.ciri.csv_inline);
        const lines = csv.split(/\r?\n/).filter(l=>l.trim().length>0);
        if(lines.length >= 2){
          const header = lines[0].split(',');
          const row    = lines[1].split(',');
          const map = {};
          header.forEach((h,i)=>{
            map[h.trim()] = (i < row.length ? row[i].trim() : '');
          });

          function setIf(key, id){
            if(map[key] && byId(id) && Number(map[key])){
              byId(id).value = Number(map[key]);
            }
          }

          setIf('cases_avoided','cases_avoided');
          setIf('avg_cost_per_case','avg_cost_per_case');
          setIf('jail_days_avoided','jail_days_avoided');
          setIf('cost_per_jail_day','cost_per_jail_day');
          setIf('fees_canceled_total','fees_canceled_total');
          setIf('policy_corrections','policy_corrections');
          setIf('avg_enforcement_cost_savings','avg_enforcement_cost_savings');
          setIf('households_restored','households_restored');
          setIf('avg_monthly_market_spend','avg_monthly_market_spend');
          setIf('months_effective','months_effective');
          setIf('employment_probability','employment_probability');
          setIf('avg_monthly_wage','avg_monthly_wage');
          setIf('expected_lawsuits','expected_lawsuits');
          setIf('avg_payout','avg_payout');
          setIf('litigation_multiplier','litigation_multiplier');
          setIf('transition_costs_one_time','transition_costs_one_time');
        }
      }

    }catch(e){
      console.warn('CIRI Intake bridge error:', e);
      if(bridge) bridge.textContent =
        'Intake bridge: found a value but could not parse it. You can still fill values manually.';
    }
  }

  // ---------- CDA / CCRI context ----------

  function readCdaContext(){
    try{
      const raw = localStorage.getItem('ABE_CDA_SCENARIO_V1');
      if(!raw) return { present:false };
      const obj = JSON.parse(raw);
      return {
        present:true,
        divergence_score: typeof obj.divergence_score === 'number' ? obj.divergence_score : null,
        statute_name: obj.statute_name || '',
        jurisdiction: obj.jurisdiction || ''
      };
    }catch(e){
      console.warn('CIRI CDA context error:', e);
      return { present:false };
    }
  }

  function readCcriContext(){
    try{
      const raw = localStorage.getItem('ABE_CCRI_SCENARIO_V1');
      if(!raw) return { present:false };
      const obj = JSON.parse(raw);
      const s = obj.scores || {};
      return {
        present:true,
        overall_risk_class: s.overall_risk_class || null,
        data_integrity: s.data_integrity,
        constitutional_alignment: s.constitutional_alignment,
        access_fairness: s.access_fairness,
        economic_impact: s.economic_impact
      };
    }catch(e){
      console.warn('CIRI CCRI context error:', e);
      return { present:false };
    }
  }

  // ---------- CIRI math ----------

  function computeRecovery(fields){
    const {
      cases_avoided,
      avg_cost_per_case,
      jail_days_avoided,
      cost_per_jail_day,
      fees_canceled_total,
      policy_corrections,
      avg_enforcement_cost_savings,
      households_restored,
      avg_monthly_market_spend,
      months_effective,
      employment_probability,
      avg_monthly_wage,
      expected_lawsuits,
      avg_payout,
      litigation_multiplier,
      transition_costs_one_time
    } = fields;

    const direct_case_savings = cases_avoided * avg_cost_per_case;
    const detention_savings   = jail_days_avoided * cost_per_jail_day;
    const enforcement_savings = policy_corrections * avg_enforcement_cost_savings;
    const market_access_uplift = households_restored * avg_monthly_market_spend * months_effective;
    const employment_wage_uplift =
      households_restored * employment_probability * avg_monthly_wage * months_effective;
    const litigation_risk_avoided =
      expected_lawsuits * avg_payout * litigation_multiplier;

    const transition_costs = transition_costs_one_time;

    let total_recovery =
      direct_case_savings +
      detention_savings +
      enforcement_savings +
      fees_canceled_total +
      market_access_uplift +
      employment_wage_uplift +
      litigation_risk_avoided -
      transition_costs;

    if(total_recovery < 0) total_recovery = 0;

    // Scale constant for index (can be tuned over time)
    const K = 50000000; // 50M
    const ciri_index = 1 - Math.exp(- total_recovery / K);

    const roi_per_case = cases_avoided > 0
      ? total_recovery / cases_avoided
      : null;

    return {
      direct_case_savings,
      detention_savings,
      enforcement_savings,
      market_access_uplift,
      employment_wage_uplift,
      litigation_risk_avoided,
      transition_costs,
      total_recovery,
      ciri_index,
      roi_per_case
    };
  }

  function buildCsvRow(fields){
    const header = [
      'cases_avoided',
      'avg_cost_per_case',
      'jail_days_avoided',
      'cost_per_jail_day',
      'fees_canceled_total',
      'policy_corrections',
      'avg_enforcement_cost_savings',
      'households_restored',
      'avg_monthly_market_spend',
      'months_effective',
      'employment_probability',
      'avg_monthly_wage',
      'expected_lawsuits',
      'avg_payout',
      'litigation_multiplier',
      'transition_costs_one_time',
      'notes'
    ];
    const notesEl = byId('ciri-notes');
    const notes = notesEl ? (notesEl.value || '') : '';

    const row = [
      fields.cases_avoided,
      fields.avg_cost_per_case,
      fields.jail_days_avoided,
      fields.cost_per_jail_day,
      fields.fees_canceled_total,
      fields.policy_corrections,
      fields.avg_enforcement_cost_savings,
      fields.households_restored,
      fields.avg_monthly_market_spend,
      fields.months_effective,
      fields.employment_probability,
      fields.avg_monthly_wage,
      fields.expected_lawsuits,
      fields.avg_payout,
      fields.litigation_multiplier,
      fields.transition_costs_one_time,
      JSON.stringify(notes.replace(/\s+/g,' ').slice(0,200))
    ];

    return header.join(',') + '\n' + row.join(',');
  }

  function buildScenario(fields, outputs, cdaCtx, ccriCtx){
    const notesEl = byId('ciri-notes');
    const notes = notesEl ? (notesEl.value || '') : '';

    return {
      version: '2.0',
      module: 'CIRI',
      inputs: fields,
      context: {
        cda: cdaCtx,
        ccri: ccriCtx
      },
      outputs: {
        direct_case_savings: outputs.direct_case_savings,
        detention_savings: outputs.detention_savings,
        enforcement_savings: outputs.enforcement_savings,
        market_access_uplift: outputs.market_access_uplift,
        employment_wage_uplift: outputs.employment_wage_uplift,
        litigation_risk_avoided: outputs.litigation_risk_avoided,
        fees_canceled_total: fields.fees_canceled_total,
        transition_costs: outputs.transition_costs,
        total_recovery: outputs.total_recovery,
        ciri_index: outputs.ciri_index,
        roi_per_case: outputs.roi_per_case
      },
      notes,
      created_at: new Date().toISOString()
    };
  }

  function buildSummary(scen){
    const o = scen.outputs;
    const f = scen.inputs;
    const ctx = scen.context || {};
    const cda = ctx.cda || {};
    const ccri = ctx.ccri || {};

    const lines = [];
    lines.push('CIRI scenario — Integrity ROI');
    lines.push('');
    lines.push(`Total recovery (R_T): ${money(o.total_recovery)}`);
    lines.push(`CIRI index (0–1): ${o.ciri_index.toFixed(3)}`);
    if(o.roi_per_case != null){
      lines.push(`ROI per case: ${money(o.roi_per_case)}`);
    }
    lines.push('');
    lines.push('Breakdown:');
    lines.push(`- Direct case cost savings: ${money(o.direct_case_savings)}`);
    lines.push(`- Detention cost savings: ${money(o.detention_savings)}`);
    lines.push(`- Enforcement & policy savings: ${money(o.enforcement_savings)}`);
    lines.push(`- Fees & fines canceled: ${money(o.fees_canceled_total)}`);
    lines.push(`- Market access uplift: ${money(o.market_access_uplift)}`);
    lines.push(`- Employment & wage uplift: ${money(o.employment_wage_uplift)}`);
    lines.push(`- Litigation risk avoided: ${money(o.litigation_risk_avoided)}`);
    lines.push(`- Transition costs: ${money(o.transition_costs)}`);
    lines.push('');
    lines.push('Context anchors:');
    if(cda.present){
      lines.push(`- CDA: divergence score ${cda.divergence_score != null ? cda.divergence_score.toFixed(3) : '—'} ` +
                 `(statute: ${cda.statute_name || '—'}, jurisdiction: ${cda.jurisdiction || '—'})`);
    }else{
      lines.push('- CDA: no divergence scenario found in this browser (optional but recommended).');
    }
    if(ccri.present){
      lines.push(`- CCRI: overall credit risk class = ${ccri.overall_risk_class || '—'} ` +
                 `(data/constitutional/access/economic scores baked into scenario).`);
    }else{
      lines.push('- CCRI: no credit integrity scenario found in this browser (optional).');
    }

    lines.push('');
    lines.push('Downstream engines:');
    lines.push('- CIBS will treat R_T as the recovery pool for community budgets.');
    lines.push('- CII will translate those budgets into actual projects (housing, clinics, transit).');
    lines.push('- Macro will scale this single scenario to many communities.');
    lines.push('');
    lines.push('Viewer shortcuts (if you are on the A.B.E. site):');
    lines.push('  - Law viewer:       /abe---flag/law/index.html');
    lines.push('  - Doctrines index:  /abe---flag/doctrine/index.html');
    lines.push('  - Integration audit:/abe---flag/integration/index.html');

    return lines.join('\n');
  }

  // ---------- main run ----------

  async function runCiri(){
    try{
      const runBtn = byId('ciri-run');
      const dlJson = byId('ciri-download-json');
      const dlCsv  = byId('ciri-download-csv');
      if(runBtn) runBtn.disabled = true;
      if(dlJson) dlJson.disabled = true;
      if(dlCsv)  dlCsv.disabled  = true;

      setStatus('computing recovery…','warn');

      const fields = {
        cases_avoided:                numberFromInput('cases_avoided'),
        avg_cost_per_case:            numberFromInput('avg_cost_per_case'),
        jail_days_avoided:            numberFromInput('jail_days_avoided'),
        cost_per_jail_day:            numberFromInput('cost_per_jail_day'),
        fees_canceled_total:          numberFromInput('fees_canceled_total'),
        policy_corrections:           numberFromInput('policy_corrections'),
        avg_enforcement_cost_savings: numberFromInput('avg_enforcement_cost_savings'),
        households_restored:          numberFromInput('households_restored'),
        avg_monthly_market_spend:     numberFromInput('avg_monthly_market_spend'),
        months_effective:             numberFromInput('months_effective'),
        employment_probability:       numberFromInput('employment_probability'),
        avg_monthly_wage:             numberFromInput('avg_monthly_wage'),
        expected_lawsuits:            numberFromInput('expected_lawsuits'),
        avg_payout:                   numberFromInput('avg_payout'),
        litigation_multiplier:        numberFromInput('litigation_multiplier'),
        transition_costs_one_time:    numberFromInput('transition_costs_one_time')
      };

      const outputs = computeRecovery(fields);
      const cdaCtx  = readCdaContext();
      const ccriCtx = readCcriContext();
      const scen    = buildScenario(fields, outputs, cdaCtx, ccriCtx);

      // KPIs
      setText('kpi-case',  money(outputs.direct_case_savings));
      setText('kpi-jail',  money(outputs.detention_savings));
      setText('kpi-enf',   money(outputs.enforcement_savings));
      setText('kpi-market',money(outputs.market_access_uplift));
      setText('kpi-wage',  money(outputs.employment_wage_uplift));
      setText('kpi-lit',   money(outputs.litigation_risk_avoided));

      setText('kpi-fees',  money(fields.fees_canceled_total));
      setText('kpi-trans', money(outputs.transition_costs));
      setText('kpi-total', money(outputs.total_recovery));

      const idxEl = byId('ciri-index-val');
      if(idxEl) idxEl.textContent = outputs.ciri_index.toFixed(3);
      const roiEl = byId('ciri-roi-case');
      if(roiEl){
        roiEl.textContent = outputs.roi_per_case != null
          ? money(outputs.roi_per_case)
          : '—';
      }

      const jsonText = JSON.stringify(scen,null,2);
      const jsonOut  = byId('ciri-json');
      if(jsonOut) jsonOut.textContent = jsonText;

      const hash = await sha256OfText(jsonText);
      const hashEl = byId('ciri-hash');
      if(hashEl){
        hashEl.textContent =
          'Audit hash: ' + hash +
          '  (SHA-256 of this CIRI scenario. Any tampering will change this value.)';
      }

      const csvRow = buildCsvRow(fields);

      if(dlJson){
        dlJson.disabled = false;
        dlJson.onclick = ()=>{
          downloadTextFile('ciri_scenario.json', jsonText, 'application/json');
        };
      }
      if(dlCsv){
        dlCsv.disabled = false;
        dlCsv.onclick = ()=>{
          downloadTextFile('ciri_inputs_row.csv', csvRow, 'text/csv');
        };
      }

      // Store for Macro/CIBS/CII/Integration
      try{
        localStorage.setItem('ABE_CIRI_SCENARIO_V2', jsonText);
      }catch(e){
        console.warn('Could not store CIRI scenario in localStorage:', e);
      }

      // Summary text (if you later want a separate <pre>, you can split it out)
      const summary = buildSummary(scen);
      // If you want, you can also dump it into another <pre id="ciri-summary"> element.
      // For now, JSON + KPIs + hash carry the meaning.

      setStatus('CIRI scenario computed. Review breakdown & download receipts.','ok');

    }catch(err){
      console.error(err);
      setStatus('CIRI failed: ' + (err.message || String(err)),'bad');
      const jsonOut = byId('ciri-json');
      if(jsonOut) jsonOut.textContent = '{}';
      const hashEl = byId('ciri-hash');
      if(hashEl) hashEl.textContent = 'Audit hash: —';
      const dlJson = byId('ciri-download-json');
      const dlCsv  = byId('ciri-download-csv');
      if(dlJson) dlJson.disabled = true;
      if(dlCsv)  dlCsv.disabled  = true;
    }finally{
      const runBtn = byId('ciri-run');
      if(runBtn) runBtn.disabled = false;
    }
  }

  // ---------- init ----------

  (function init(){
    applyIntakeDefaults();
    const runBtn = byId('ciri-run');
    if(runBtn){
      runBtn.addEventListener('click', runCiri);
    }
    setStatus('ready — use Intake defaults or type your own values, then click “Compute”.','ok');
  })();

})();
