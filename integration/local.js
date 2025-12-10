// integration/local.js
// Reads localStorage footprints from Intake, CIRI, and CDA and surfaces
// them in the "Local Engine Footprints" section. Runs entirely in-browser.

(function(){
  const $ = id => document.getElementById(id);

  function setPill(idStatus, idMeta, mode, label, meta){
    const el = $(idStatus);
    const metaEl = $(idMeta);
    if(!el || !metaEl) return;
    el.className = 'local-pill';
    if(mode === 'ok')   el.classList.add('ok');
    if(mode === 'miss') el.classList.add('miss');
    if(mode === 'warn') el.classList.add('warn');
    el.textContent = label;
    metaEl.innerHTML = meta;
  }

  function fmtMoney(n){
    if(typeof n !== 'number' || !isFinite(n)) return '—';
    try{
      return n.toLocaleString(undefined,{style:'currency',currency:'USD',maximumFractionDigits:0});
    }catch(e){
      return '$' + Math.round(n).toLocaleString();
    }
  }

  function fmt(n){
    if(typeof n !== 'number' || !isFinite(n)) return '—';
    return n.toLocaleString(undefined,{maximumFractionDigits:0});
  }

  function fmtHash(h){
    if(!h) return '—';
    return h.slice(0,16) + '…';
  }

  async function sha256(text){
    const enc = new TextEncoder();
    const buf = enc.encode(text);
    const hash = await crypto.subtle.digest('SHA-256', buf);
    const bytes = new Uint8Array(hash);
    return Array.from(bytes).map(b=>b.toString(16).padStart(2,'0')).join('');
  }

  async function init(){
    // ----- Intake -----
    try{
      const raw = localStorage.getItem('abe_intake_artifact');
      if(!raw){
        setPill('local-intake-status','local-intake-meta','miss','not found',
          'No Intake artifact stored yet. Run <a href="../intake/index.html">Intake</a> in this browser.');
      }else{
        const hash = await sha256(raw);
        setPill('local-intake-status','local-intake-meta','ok','present',
          `Key: <code>abe_intake_artifact</code><br>SHA-256: <code>${fmtHash(hash)}</code>`);
      }
    }catch(e){
      setPill('local-intake-status','local-intake-meta','warn','error',
        'Could not read <code>abe_intake_artifact</code> from this browser.');
    }

    // ----- CIRI -----
    try{
      const raw = localStorage.getItem('ABE_CIRI_SCENARIO_V2');
      if(!raw){
        setPill('local-ciri-status','local-ciri-meta','miss','not found',
          'No CIRI scenario stored yet. Upload a CSV on <a href="../ciri/index.html">CIRI</a>.');
      }else{
        const scen = JSON.parse(raw);
        const out = scen && scen.outputs ? scen.outputs : {};
        const total = fmtMoney(out.total_recovery);
        const roi   = fmtMoney(out.roi_per_case);
        const hash  = await sha256(raw);
        setPill('local-ciri-status','local-ciri-meta','ok','present',
          `Total recovery: <strong>${total}</strong><br>ROI per case: <strong>${roi}</strong><br>` +
          `SHA-256: <code>${fmtHash(hash)}</code>`);
      }
    }catch(e){
      setPill('local-ciri-status','local-ciri-meta','warn','malformed',
        'Found something in <code>ABE_CIRI_SCENARIO_V2</code> but could not parse it as JSON.');
    }

    // ----- CDA -----
    try{
      const raw = localStorage.getItem('ABE_CDA_SCENARIO_V1');
      if(!raw){
        setPill('local-cda-status','local-cda-meta','miss','not found',
          'No CDA scenario stored yet. Run <a href="../cda/index.html">CDA</a> in this browser.');
      }else{
        const scen = JSON.parse(raw);
        const score = typeof scen.divergence_score === 'number'
          ? scen.divergence_score
          : '—';
        const name  = scen.statute_name || '(unnamed scenario)';
        const hash  = await sha256(raw);
        setPill('local-cda-status','local-cda-meta','ok','present',
          `Scenario: <strong>${name}</strong><br>` +
          `Divergence score: <strong>${score}</strong><br>` +
          `SHA-256: <code>${fmtHash(hash)}</code>`);
      }
    }catch(e){
      setPill('local-cda-status','local-cda-meta','warn','malformed',
        'Found something in <code>ABE_CDA_SCENARIO_V1</code> but could not parse it as JSON.');
    }
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  }else{
    init();
  }
})();
