// cda/local.js
// CDA UI logic — runs entirely in-browser.
// - Loads cda/model.json for flag weights and dimension weights.
// - Optionally reads the last Intake artifact from localStorage.
// - Builds a CDA scenario object, computes a 0–1 divergence score,
//   renders JSON + plain-language summary, and produces an audit hash.

(function(){
  const byId = id => document.getElementById(id);

  // Inputs
  const statuteEl   = byId('statute-name');
  const jurisEl     = byId('jurisdiction');
  const levelEl     = byId('level');
  const popEl       = byId('population');
  const citEl       = byId('citations');
  const fundEl      = byId('funding');
  const notesEl     = byId('notes');

  // Flags (checkboxes)
  const flagIds = [
    'scope_noncommercial_treated_as_commercial',
    'preemption_conflict',
    'preemption_field',
    'ultra_vires_enforcement',
    'mcsap_off_mission',
    'funding_conditions_ignored',
    'funding_nontransparent',
    'right_to_travel_burdened',
    'due_process_defects',
    'selective_application'
  ];

  const flagEls = {};
  flagIds.forEach(id=>{
    const el = byId('flag-' + id);
    if(el) flagEls[id] = el;
  });

  // Outputs
  const statusEl   = byId('cda-status');
  const scorePill  = byId('cda-score-pill');
  const scoreValEl = byId('cda-score-value');
  const jsonEl     = byId('cda-json');
  const summaryEl  = byId('cda-summary');
  const dlBtn      = byId('btn-download');
  const genBtn     = byId('btn-generate');
  const hashLineEl = byId('cda-hash-line');
  const intakeNote = byId('intake-bridge-note');

  let model = null;            // from cda/model.json
  let latestScenario = null;   // last CDA object

  // ---------- helpers ----------

  function setStatus(text, kind){
    if(!statusEl) return;
    statusEl.textContent = 'Status: ' + text;
    statusEl.className = 'cda-status';
    if(kind === 'ok')   statusEl.classList.add('cda-status-ok');
    if(kind === 'warn') statusEl.classList.add('cda-status-warn');
    if(kind === 'bad')  statusEl.classList.add('cda-status-bad');
  }

  function setScoreDisplay(score){
    if(scoreValEl) scoreValEl.textContent = (score == null ? '—' : score.toFixed(2));
    if(!scorePill) return;
    scorePill.className = 'cda-score-badge';
    if(score == null){
      return;
    } else if(score >= 0.75){
      scorePill.classList.add('cda-score-high');
    } else if(score >= 0.35){
      scorePill.classList.add('cda-score-mid');
    } else {
      scorePill.classList.add('cda-score-low');
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

  // ---------- load model.json ----------

  async function loadModel(){
    const res = await fetch('cda/model.json',{cache:'no-store'});
    if(!res.ok) throw new Error('cda/model.json not found (HTTP '+res.status+')');
    const j = await res.json();
    return j;
  }

  // ---------- Intake bridge ----------

  function hydrateFromIntake(){
    if(!intakeNote) return;

    try{
      const raw = localStorage.getItem('abe_intake_artifact');
      if(!raw){
        intakeNote.textContent = 'Intake bridge: no recent Intake artifact found. You can still fill this form manually.';
        return null;
      }
      const art = JSON.parse(raw);
      if(!art || typeof art !== 'object'){
        intakeNote.textContent = 'Intake bridge: found something in localStorage, but it does not look like an Intake artifact.';
        return null;
      }

      // Gentle prefill: never overwrite existing user edits
      if(statuteEl && !statuteEl.value){
        statuteEl.value = (art.doc_type || 'scenario from Intake') + ' — ' + (art.original_file_name || '');
      }
      if(notesEl && !notesEl.value && art.text_normalized){
        const snippet = String(art.text_normalized).slice(0, 600).replace(/\s+/g,' ');
        notesEl.value = snippet;
      }

      // doc_type → population hint
      if(popEl && !popEl.value){
        const dt = art.doc_type || '';
        if(dt === 'traffic_ticket') popEl.value = 'non_commercial';
        else if(dt === 'loan_contract') popEl.value = 'mixed';
      }

      intakeNote.textContent =
        'Intake bridge: using the last Intake artifact in this browser as context. You can change any field above.';
      return art;
    }catch(e){
      console.warn('Intake bridge error:', e);
      intakeNote.textContent = 'Intake bridge: could not read the Intake artifact (localStorage parse error).';
      return null;
    }
  }

  // ---------- score computation ----------

  function computeScore(flags){
    if(!model || !model.flag_definitions || !model.scoring || !model.scoring.dimension_weights) return 0;
    const defs = model.flag_definitions;
    const dimW = model.scoring.dimension_weights;
    let sum = 0;

    Object.keys(flags).forEach(key=>{
      if(!flags[key]) return;
      const def = defs[key];
      if(!def) return;
      const dim = def.dimension;
      const sev = typeof def.severity === 'number' ? def.severity : 1;
      const w   = typeof dimW[dim] === 'number' ? dimW[dim] : 1;
      sum += sev * w;
    });

    // Simple clipping 0–1 as in model.json notes
    return Math.max(0, Math.min(1, sum));
  }

  // ---------- summary text ----------

  function buildSummary(scenario){
    const lines = [];
    const s = scenario;
    lines.push(`CDA scenario: ${s.statute_name || '(unnamed)'}`);
    lines.push(`Jurisdiction: ${s.jurisdiction || '—'} · Level: ${s.level}`);
    lines.push(`Population impacted: ${s.population}`);
    if(s.funding_streams && s.funding_streams.length){
      lines.push(`Related funding: ${s.funding_streams.join(', ')}`);
    }
    if(s.citations && s.citations.length){
      lines.push(`Citations: ${s.citations.join(', ')}`);
    }
    lines.push('');
    lines.push(`Divergence score (0–1): ${s.divergence_score.toFixed(2)}`);
    lines.push('');

    const defs = model && model.flag_definitions ? model.flag_definitions : null;
    if(defs){
      const onFlags = Object.keys(s.flags || {}).filter(k => s.flags[k]);
      if(onFlags.length){
        lines.push('Key divergence findings:');
        onFlags.forEach(k=>{
          const def = defs[k];
          const desc = def && def.description ? def.description : k;
          lines.push(`- ${desc}`);
        });
      }else{
        lines.push('No divergence flags were selected for this scenario.');
      }
    }

    if(s.notes){
      lines.push('');
      lines.push('Notes:');
      lines.push(s.notes);
    }

    return lines.join('\n');
  }

  // ---------- main run ----------

  async function run(){
    try{
      if(genBtn) genBtn.disabled = true;
      if(dlBtn)  dlBtn.disabled  = true;
      setStatus('generating CDA scenario…','warn');
      setScoreDisplay(null);
      jsonEl.textContent = '{}';
      summaryEl.textContent = 'Working…';

      // Ensure model loaded
      if(!model){
        model = await loadModel();
      }

      // Build flags
      const flags = {};
      flagIds.forEach(key=>{
        const el = flagEls[key];
        flags[key] = !!(el && el.checked);
      });

      // Parse citations / funding as arrays
      const citList = (citEl && citEl.value.trim())
        ? citEl.value.split(/[,;]+/).map(s=>s.trim()).filter(Boolean)
        : [];

      const fundList = (fundEl && fundEl.value.trim())
        ? fundEl.value.split(/[,;]+/).map(s=>s.trim()).filter(Boolean)
        : [];

      const scenario = {
        version: '1.0',
        module: 'CDA',
        statute_name: (statuteEl && statuteEl.value.trim()) || '',
        jurisdiction: (jurisEl && jurisEl.value.trim()) || '',
        level: (levelEl && levelEl.value) || 'state',
        population: (popEl && popEl.value) || 'mixed',
        citations: citList,
        funding_streams: fundList,
        flags,
        divergence_score: 0,
        notes: (notesEl && notesEl.value.trim()) || ''
      };

      scenario.divergence_score = computeScore(flags);

      const jsonText = JSON.stringify(scenario, null, 2);
      latestScenario = scenario;

      // Render
      jsonEl.textContent    = jsonText;
      setScoreDisplay(scenario.divergence_score);
      summaryEl.textContent = buildSummary(scenario);

      // Hash + download
      const hash = await sha256OfText(jsonText);
      if(hashLineEl){
        hashLineEl.textContent =
          'Audit hash: ' + hash +
          '  (SHA-256 of this CDA JSON. Any tampering will change this value.)';
      }

      if(dlBtn){
        dlBtn.disabled = false;
        dlBtn.onclick = ()=>{
          downloadTextFile('cda_cda-scenario.json', jsonText, 'application/json');
        };
      }

      setStatus('CDA scenario generated. Review the JSON and summary before you download.','ok');

      // Also store in localStorage for any downstream module that wants it
      try{
        localStorage.setItem('ABE_CDA_SCENARIO_V1', jsonText);
      }catch(e){
        console.warn('Could not store CDA scenario in localStorage:', e);
      }

    }catch(err){
      console.error(err);
      setStatus('CDA failed: ' + (err.message || String(err)),'bad');
      jsonEl.textContent = '{}';
      summaryEl.textContent = 'CDA run failed. See console for details.';
      setScoreDisplay(null);
      if(dlBtn) dlBtn.disabled = true;
      if(hashLineEl) hashLineEl.textContent = 'Audit hash: —';
    }finally{
      if(genBtn) genBtn.disabled = false;
    }
  }

  // ---------- init ----------

  (async function init(){
    // Try to load model early (for faster UX), but don’t break if it fails here.
    try{
      model = await loadModel();
    }catch(e){
      console.warn('Could not preload cda/model.json; will retry on run():', e);
    }

    hydrateFromIntake();

    if(genBtn){
      genBtn.addEventListener('click', run);
    }

    setStatus('ready — fill the fields and click “Generate CDA scenario & score”.','ok');
  })();

})();
