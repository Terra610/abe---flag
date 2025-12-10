// ccri/local.js
// CCRI — Consumer Credit Risk Integrity
// Runs entirely in-browser. No network calls with user data.
// Builds a system-level risk profile for how DMV/DOT & enforcement data
// is used in non-commercial credit decisions.

(function(){
  const byId = id => document.getElementById(id);

  // Inputs
  const instNameEl = byId('inst-name');
  const instTypeEl = byId('inst-type');
  const geoScopeEl = byId('geo-scope');
  const notesEl    = byId('ccri-notes');

  // Radio groups
  function getRadio(name, fallback){
    const els = document.querySelectorAll('input[name="'+name+'"]');
    for(const el of els){
      if(el.checked) return el.value;
    }
    return fallback;
  }

  // Outputs
  const statusEl   = byId('ccri-status');
  const bridgeEl   = byId('ccri-intake-bridge');
  const runBtn     = byId('ccri-run');
  const jsonEl     = byId('ccri-json');
  const summaryEl  = byId('ccri-summary');
  const dlBtn      = byId('ccri-download');
  const hashEl     = byId('ccri-hash');

  const dataEl   = byId('score-data');
  const constEl  = byId('score-const');
  const accessEl = byId('score-access');
  const econEl   = byId('score-econ');
  const classEl  = byId('ccri-class');

  let latestScenario = null;

  // ---------- helpers ----------

  function setStatus(text, kind){
    if(!statusEl) return;
    statusEl.textContent = 'Status: ' + text;
    statusEl.className = 'ccri-status';
    if(kind === 'ok')   statusEl.classList.add('ccri-status-ok');
    if(kind === 'warn') statusEl.classList.add('ccri-status-warn');
    if(kind === 'bad')  statusEl.classList.add('ccri-status-bad');
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

  // ---------- Intake bridge ----------

  function hydrateFromIntake(){
    if(!bridgeEl) return;
    try{
      const raw = localStorage.getItem('abe_intake_artifact');
      if(!raw){
        bridgeEl.textContent = 'Intake bridge: no recent Intake artifact found. You can still fill this form manually.';
        return;
      }
      const art = JSON.parse(raw);
      if(!art || typeof art !== 'object'){
        bridgeEl.textContent = 'Intake bridge: found a value, but it does not look like an Intake artifact.';
        return;
      }

      if(instNameEl && !instNameEl.value){
        instNameEl.value = (art.doc_type || 'credit scenario') + ' — ' + (art.original_file_name || '');
      }
      if(notesEl && !notesEl.value && art.text_normalized){
        const snippet = String(art.text_normalized).slice(0, 600).replace(/\s+/g,' ');
        notesEl.value = snippet;
      }

      bridgeEl.textContent = 'Intake bridge: using the last Intake artifact as context (you can change any field).';
    }catch(e){
      console.warn('CCRI Intake bridge error:', e);
      bridgeEl.textContent = 'Intake bridge: could not read the Intake artifact.';
    }
  }

  // ---------- scoring ----------

  function classifyScore(num){
    if(num >= 75) return 'high';
    if(num >= 40) return 'mid';
    return 'low';
  }

  function setScore(el, val){
    if(!el) return;
    if(val == null){
      el.textContent = '—';
      return;
    }
    el.textContent = Math.round(val);
  }

  function computeScores(inputs){
    // inputs: { dmvUse, suspensionRule, appeal, instType, geoScope }
    // All scores are 0–100, where 100 = best (low risk), 0 = worst (high risk).
    let data = 100;
    let align = 100;
    let access = 100;
    let econ = 100;

    // DMV use
    if(inputs.dmvUse === 'yes'){
      data -= 45;
      align -= 40;
      access -= 35;
      econ -= 30;
    }else if(inputs.dmvUse === 'limited'){
      data -= 10;
      align -= 5;
    }

    // Suspension rule
    if(inputs.suspensionRule === 'direct'){
      align -= 40;
      access -= 30;
      econ -= 25;
    }else if(inputs.suspensionRule === 'indirect'){
      align -= 25;
      access -= 20;
      econ -= 15;
    }

    // Appeal
    if(inputs.appeal === 'weak'){
      access -= 15;
      align -= 10;
    }else if(inputs.appeal === 'none'){
      access -= 30;
      align -= 20;
      econ -= 10;
    }

    // Geo scope multiplies impact
    if(inputs.geoScope === 'multi_state'){
      econ -= 10;
    }else if(inputs.geoScope === 'national'){
      econ -= 20;
    }

    // Bound 0–100
    data   = Math.min(100, Math.max(0, data));
    align  = Math.min(100, Math.max(0, align));
    access = Math.min(100, Math.max(0, access));
    econ   = Math.min(100, Math.max(0, econ));

    // Overall risk: invert average
    const avg = (data + align + access + econ) / 4;
    let overallClass = 'LOW';
    if(avg <= 40) overallClass = 'HIGH';
    else if(avg <= 70) overallClass = 'MODERATE';

    return {
      data_integrity: data,
      constitutional_alignment: align,
      access_fairness: access,
      economic_impact: econ,
      overall_risk_class: overallClass
    };
  }

  // ---------- summary ----------

  function buildSummary(scen){
    const s = scen;
    const lines = [];
    lines.push(`CCRI scenario: ${s.institution_name || '(unnamed institution)'}`);
    lines.push(`Type: ${s.institution_type} · Scope: ${s.geographic_scope}`);
    lines.push('');
    lines.push(`Data integrity score: ${Math.round(s.scores.data_integrity)} / 100`);
    lines.push(`Constitutional alignment score: ${Math.round(s.scores.constitutional_alignment)} / 100`);
    lines.push(`Access & fairness score: ${Math.round(s.scores.access_fairness)} / 100`);
    lines.push(`Economic impact score: ${Math.round(s.scores.economic_impact)} / 100`);
    lines.push(`Overall risk classification: ${s.scores.overall_risk_class}`);
    lines.push('');

    lines.push('Key signals:');
    if(s.flags.uses_dmv_for_gating){
      lines.push('- Model uses DMV/DOT or license status as a gate for non-commercial credit.');
    }
    if(s.flags.suspension_triggers_denial){
      lines.push('- License suspension / unpaid tickets can trigger denial or higher risk.');
    }
    if(s.flags.weak_or_no_appeal){
      lines.push('- Appeal path is weak or missing; citizens have little remedy.');
    }
    if(s.flags.multi_state_or_national){
      lines.push('- Practices are scaled beyond a single state, increasing systemic harm.');
    }
    if(!s.flags.uses_dmv_for_gating &&
       !s.flags.suspension_triggers_denial &&
       !s.flags.weak_or_no_appeal &&
       !s.flags.multi_state_or_national){
      lines.push('- No high-risk signals were marked; CCRI still recommends periodic review.');
    }

    if(s.notes){
      lines.push('');
      lines.push('Notes:');
      lines.push(s.notes);
    }

    lines.push('');
    lines.push('Law & doctrine anchors:');
    if(s.flags.uses_dmv_for_gating || s.flags.suspension_triggers_denial){
      lines.push('  - LAW: Title 49 Transportation scope + FMCSR adoption rules (non-commercial vs commercial).');
      lines.push('  - LAW: Check MCSAP/FMCSA packs for spillover into consumer credit models.');
      lines.push('  - Doctrine: Constitutional Fidelity + Void ab initio for DMV-based gating outside commerce nexus.');
    }else{
      lines.push('  - For deeper review, open: /abe---flag/law/index.html and /abe---flag/doctrine/index.html');
    }

    lines.push('');
    lines.push('Downstream engines:');
    lines.push('  - Feed economic harm into CIRI using expected cases, lost jobs, and wage suppression.');
    lines.push('  - Use CFF/AFFE if federal funds are propping up the data infrastructure or enforcement inputs.');

    return lines.join('\n');
  }

  // ---------- run ----------

  async function run(){
    try{
      if(runBtn) runBtn.disabled = true;
      if(dlBtn)  dlBtn.disabled  = true;
      setStatus('computing CCRI risk profile…','warn');
      jsonEl.textContent = '{}';
      summaryEl.textContent = 'Working…';

      const institution_name  = (instNameEl && instNameEl.value.trim()) || '';
      const institution_type  = (instTypeEl && instTypeEl.value) || 'auto_lender';
      const geographic_scope  = (geoScopeEl && geoScopeEl.value) || 'single_state';
      const dmvUse            = getRadio('dmv-use','no');
      const suspensionRule    = getRadio('suspension-rule','no');
      const appeal            = getRadio('appeal','robust');
      const notes             = (notesEl && notesEl.value.trim()) || '';

      const flags = {
        uses_dmv_for_gating: (dmvUse === 'yes'),
        uses_dmv_identity_only: (dmvUse === 'limited'),
        suspension_triggers_denial: (suspensionRule === 'direct' || suspensionRule === 'indirect'),
        direct_suspension_gate: (suspensionRule === 'direct'),
        weak_or_no_appeal: (appeal === 'weak' || appeal === 'none'),
        multi_state_or_national: (geographic_scope === 'multi_state' || geographic_scope === 'national')
      };

      const scores = computeScores({
        dmvUse,
        suspensionRule,
        appeal,
        instType: institution_type,
        geoScope: geographic_scope
      });

      const scenario = {
        version: '1.0',
        module: 'CCRI',
        institution_name,
        institution_type,
        geographic_scope,
        inputs: {
          dmv_use: dmvUse,
          suspension_rule: suspensionRule,
          appeal_process: appeal
        },
        flags,
        scores,
        notes,
        created_at: new Date().toISOString()
      };

      latestScenario = scenario;
      const jsonText = JSON.stringify(scenario, null, 2);
      jsonEl.textContent = jsonText;
      summaryEl.textContent = buildSummary(scenario);

      // Scores display
      setScore(dataEl, scores.data_integrity);
      setScore(constEl, scores.constitutional_alignment);
      setScore(accessEl, scores.access_fairness);
      setScore(econEl, scores.economic_impact);
      if(classEl) classEl.textContent = scores.overall_risk_class;

      // Hash + download
      const hash = await sha256OfText(jsonText);
      if(hashEl){
        hashEl.textContent =
          'Audit hash: ' + hash +
          '  (SHA-256 of this CCRI scenario. Any tampering will change this value.)';
      }

      if(dlBtn){
        dlBtn.disabled = false;
        dlBtn.onclick = ()=>{
          downloadTextFile('ccri_scenario.json', jsonText, 'application/json');
        };
      }

      setStatus('CCRI scenario generated. Review the risk profile and summary.','ok');

      // Store for downstream modules
      try{
        localStorage.setItem('ABE_CCRI_SCENARIO_V1', jsonText);
      }catch(e){
        console.warn('Could not store CCRI scenario in localStorage:', e);
      }

    }catch(err){
      console.error(err);
      setStatus('CCRI failed: ' + (err.message || String(err)),'bad');
      jsonEl.textContent = '{}';
      summaryEl.textContent = 'CCRI run failed. See console for details.';
      if(dlBtn) dlBtn.disabled = true;
      if(hashEl) hashEl.textContent = 'Audit hash: —';
      setScore(dataEl,null);
      setScore(constEl,null);
      setScore(accessEl,null);
      setScore(econEl,null);
      if(classEl) classEl.textContent = '—';
    }finally{
      if(runBtn) runBtn.disabled = false;
    }
  }

  function setScore(el,val){
    if(!el){
      return;
    }
    if(val==null){
      el.textContent='—';
      el.classList.remove('ccri-score-high','ccri-score-mid','ccri-score-low');
      return;
    }
    el.textContent = Math.round(val);
    el.classList.remove('ccri-score-high','ccri-score-mid','ccri-score-low');
    const band = classifyScore(val);
    if(band === 'high') el.classList.add('ccri-score-high');
    else if(band === 'mid') el.classList.add('ccri-score-mid');
    else el.classList.add('ccri-score-low');
  }

  // ---------- init ----------

  (function init(){
    hydrateFromIntake();
    if(runBtn){
      runBtn.addEventListener('click', run);
    }
    setStatus('ready — describe the model and click “Generate CCRI risk classification”.','ok');
  })();

})();
