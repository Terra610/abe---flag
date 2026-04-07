// cda/cda.js
// CDA runs 100% client-side. No network writes.
// - Reads optional law context from localStorage.ABE_LAW_TO_CDA
// - Lets user set divergence flags
// - Computes 0–1 divergence score
// - Stores result as ABE_CDA_SCENARIO_V1 in localStorage

(function(){
  const $ = id => document.getElementById(id);

  // --- DOM refs -------------------------------------------------------------

  const statuteNameEl   = $('statute-name');
  const jurisdictionEl  = $('jurisdiction');
  const levelEl         = $('level');
  const populationEl    = $('population');
  const citationsEl     = $('citations');
  const fundingEl       = $('funding-streams');

  const fScope          = $('flag-scope-noncommercial');
  const fPreemptConf    = $('flag-preemption-conflict');
  const fPreemptField   = $('flag-preemption-field');
  const fUltraVires     = $('flag-ultra-vires');
  const fMcsapOff       = $('flag-mcsap-off-mission');
  const fFundIgnore     = $('flag-funding-conditions-ignored');
  const fFundOpaque     = $('flag-funding-nontransparent');
  const fTravel         = $('flag-right-to-travel');
  const fDueProcess     = $('flag-due-process');
  const fSelective      = $('flag-selective');

  const btnGenerate     = $('btn-generate');
  const statusEl        = $('cda-status');
  const scoreValueEl    = $('score-value');
  const jsonEl          = $('cda-json');
  const summaryEl       = $('cda-summary');
  const btnDownload     = $('btn-download');
  const btnCopyHash     = $('btn-copy-hash');
  const pillLawBridge   = $('law-bridge-pill');

  let latestScenario = null;
  let latestHash     = null;

  // --- model (mirrors cda/model.json) --------------------------------------

  const DIM_WEIGHTS = {
    scope_alignment:      0.36,
    preemption_fidelity:  0.33,
    funding_integrity:    0.18,
    rights_and_process:   0.13
  };

  const FLAG_DEFS = {
    scope_noncommercial_treated_as_commercial: {
      dimension: 'scope_alignment',
      severity:  1.0
    },
    preemption_conflict: {
      dimension: 'preemption_fidelity',
      severity:  1.0
    },
    preemption_field: {
      dimension: 'preemption_fidelity',
      severity:  0.9
    },
    ultra_vires_enforcement: {
      dimension: 'scope_alignment',
      severity:  0.9
    },
    mcsap_off_mission: {
      dimension: 'funding_integrity',
      severity:  0.9
    },
    funding_conditions_ignored: {
      dimension: 'funding_integrity',
      severity:  0.8
    },
    funding_nontransparent: {
      dimension: 'funding_integrity',
      severity:  0.4
    },
    right_to_travel_burdened: {
      dimension: 'rights_and_process',
      severity:  0.85
    },
    due_process_defects: {
      dimension: 'rights_and_process',
      severity:  0.8
    },
    selective_application: {
      dimension: 'rights_and_process',
      severity:  0.5
    }
  };

  // --- helpers --------------------------------------------------------------

  function setStatus(text, kind){
    statusEl.textContent = 'Status: ' + text;
    statusEl.className = 'status-line';
    if(kind === 'ok')   statusEl.classList.add('status-ok');
    if(kind === 'warn') statusEl.classList.add('status-warn');
    if(kind === 'err')  statusEl.classList.add('status-err');
  }

  function parseMulti(text){
    if(!text) return [];
    return text
      .split(/[\n,;]/)
      .map(s => s.trim())
      .filter(Boolean);
  }

  function computeScore(flags){
    let total = 0;
    for(const [name, value] of Object.entries(flags)){
      if(!value) continue;
      const def = FLAG_DEFS[name];
      if(!def) continue;
      const dimWeight = DIM_WEIGHTS[def.dimension] || 0;
      total += def.severity * dimWeight;
    }
    if(total < 0) total = 0;
    if(total > 1) total = 1;
    return Number(total.toFixed(3));
  }

  async function sha256(text){
    const enc = new TextEncoder();
    const buf = enc.encode(text);
    const hash = await crypto.subtle.digest('SHA-256', buf);
    const bytes = new Uint8Array(hash);
    return Array.from(bytes).map(b=>b.toString(16).padStart(2,'0')).join('');
  }

  function buildSummary(s){
    const lines = [];
    lines.push(`CDA scenario: ${s.statute_name || '(unnamed)'}`);
    lines.push(`Jurisdiction: ${s.jurisdiction || '—'} · Level: ${s.level}`);
    lines.push(`Population impacted: ${s.population}`);
    if(s.funding_streams && s.funding_streams.length){
      lines.push(`Related funding: ${s.funding_streams.join(', ')}`);
    }
    if(s.citations && s.citations.length){
      lines.push(`Citations: ${s.citations.join('; ')}`);
    }
    lines.push('');
    lines.push(`Divergence score (0–1): ${s.divergence_score}`);
    lines.push('');

    const f = s.flags || {};
    const bullets = [];

    if(f.scope_noncommercial_treated_as_commercial){
      bullets.push('- State practice is treating non-commercial citizens as if they were commercial/DOT-regulated.');
    }
    if(f.preemption_conflict){
      bullets.push('- State rule conflicts with, or expands beyond, federal commercial scope (49 U.S.C. / 49 CFR).');
    }
    if(f.preemption_field){
      bullets.push('- State appears to legislate in a field already occupied by Congress (field preemption).');
    }
    if(f.ultra_vires_enforcement){
      bullets.push('- Agency conduct goes beyond what its enabling statute actually authorizes (ultra vires).');
    }
    if(f.mcsap_off_mission){
      bullets.push('- MCSAP or similar commercial enforcement funding is used for non-commercial activity.');
    }
    if(f.funding_conditions_ignored){
      bullets.push('- Practice appears inconsistent with federal funding conditions or FMCSR adoption requirements.');
    }
    if(f.funding_nontransparent){
      bullets.push('- Funding source and statutory authority are not transparent to affected people.');
    }
    if(f.right_to_travel_burdened){
      bullets.push('- Practice burdens the right to travel for people not engaged in commerce.');
    }
    if(f.due_process_defects){
      bullets.push('- There are gaps in notice, hearing, or appeal before rights are restricted.');
    }
    if(f.selective_application){
      bullets.push('- Rule appears to be applied selectively or arbitrarily across similar cases.');
    }

    if(bullets.length){
      lines.push('Flags set:');
      bullets.forEach(b => lines.push(b));
    }else{
      lines.push('No divergence flags were set. This scenario currently looks aligned in CDA.');
    }

    if(s.notes && s.notes.trim()){
      lines.push('');
      lines.push('Notes:');
      lines.push(s.notes.trim());
    }

    return lines.join('\n');
  }

  function enableOutputs(enable){
    btnDownload.disabled = !enable;
    btnCopyHash.disabled = !enable;
  }

  // --- Law bridge: read ABE_LAW_TO_CDA -------------------------------------

  function tryLoadLawContext(){
    try{
      const raw = localStorage.getItem('ABE_LAW_TO_CDA');
      if(!raw) return;
      const payload = JSON.parse(raw);
      if(!payload || !payload.node) return;
      const node = payload.node;

      // Light-touch prefill. User can always override.
      if(node.label && statuteNameEl && !statuteNameEl.value){
        statuteNameEl.value = node.label;
      }
      if(node.citation && citationsEl && !citationsEl.value){
        citationsEl.value = node.citation;
      }
      if(Array.isArray(node.funding_refs) && node.funding_refs.length && fundingEl && !fundingEl.value){
        fundingEl.value = node.funding_refs.join(', ');
      }

      if(pillLawBridge){
        pillLawBridge.style.display = 'inline-flex';
      }

      setStatus('Law node loaded from ABE_LAW_TO_CDA — review fields and set flags.', 'ok');
    }catch(e){
      console.warn('Could not read ABE_LAW_TO_CDA:', e);
    }
  }

  // --- main generate --------------------------------------------------------

  async function generate(){
    try{
      btnGenerate.disabled = true;
      setStatus('Building CDA scenario…', 'warn');
      enableOutputs(false);
      latestScenario = null;
      latestHash = null;

      const statute_name = (statuteNameEl.value || '').trim();
      if(!statute_name){
        setStatus('Please enter a name for the statute / practice.', 'err');
        btnGenerate.disabled = false;
        return;
      }

      const flags = {
        scope_noncommercial_treated_as_commercial: !!fScope.checked,
        preemption_conflict:                       !!fPreemptConf.checked,
        preemption_field:                          !!fPreemptField.checked,
        ultra_vires_enforcement:                   !!fUltraVires.checked,
        mcsap_off_mission:                         !!fMcsapOff.checked,
        funding_conditions_ignored:                !!fFundIgnore.checked,
        funding_nontransparent:                    !!fFundOpaque.checked,
        right_to_travel_burdened:                  !!fTravel.checked,
        due_process_defects:                       !!fDueProcess.checked,
        selective_application:                     !!fSelective.checked
      };

      const scenario = {
        version: '1.0',
        module: 'CDA',
        statute_name,
        jurisdiction: (jurisdictionEl.value || '').trim() || undefined,
        level: levelEl.value || 'state',
        population: populationEl.value || 'non_commercial',
        citations: parseMulti(citationsEl.value),
        funding_streams: parseMulti(fundingEl.value),
        flags,
        divergence_score: computeScore(flags),
        notes: ''
      };

      // Remove empty optional arrays to keep JSON clean & schema-friendly
      if(!scenario.citations.length)      delete scenario.citations;
      if(!scenario.funding_streams.length)delete scenario.funding_streams;

      const jsonText = JSON.stringify(scenario, null, 2);
      jsonEl.textContent = jsonText;
      scoreValueEl.textContent = String(scenario.divergence_score);
      const summary = buildSummary(scenario);
      summaryEl.textContent = summary;

      latestScenario = scenario;
      latestHash = await sha256(jsonText);

      enableOutputs(true);

      try{
        localStorage.setItem('ABE_CDA_SCENARIO_V1', jsonText);
      }catch(e){
        console.warn('Could not persist CDA scenario:', e);
      }

      setStatus('CDA scenario generated. Hash ready for audit trail.', 'ok');
    }catch(err){
      console.error(err);
      setStatus('CDA failed: ' + (err.message || String(err)), 'err');
      enableOutputs(false);
    }finally{
      btnGenerate.disabled = false;
    }
  }

  function downloadScenario(){
    if(!latestScenario) return;
    const text = JSON.stringify(latestScenario, null, 2);
    const blob = new Blob([text], { type:'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = 'cda_cda-scenario.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function copyHash(){
    if(!latestHash) return;
    try{
      if(navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(latestHash);
      }else{
        const ta = document.createElement('textarea');
        ta.value = latestHash;
        ta.style.position = 'fixed';
        ta.style.top = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
      }
      setStatus('SHA-256 hash copied to clipboard.', 'ok');
    }catch(e){
      console.warn('Could not copy hash:', e);
      setStatus('Could not copy hash, but it is shown in the Integration view.', 'warn');
    }
  }

  // --- wire events ----------------------------------------------------------

  function boot(){
    if(btnGenerate){
      btnGenerate.addEventListener('click', generate);
    }
    if(btnDownload){
      btnDownload.addEventListener('click', downloadScenario);
    }
    if(btnCopyHash){
      btnCopyHash.addEventListener('click', copyHash);
    }
    setStatus('waiting for inputs…', 'warn');
    tryLoadLawContext();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', boot);
  }else{
    boot();
  }

})();
