// cibs/local.js
// CIBS — Constitutional Integrity Baseline Schema
// - Reads CIRI scenario (ABE_CIRI_SCENARIO_V2) from localStorage if present.
// - Lets user choose / tweak category percentages (sum ~ 100%).
// - Computes allocations and stores ABE_CIBS_BUDGET_V1 + SHA-256 hash.

(function(){
  const byId = id => document.getElementById(id);

  function setStatus(text, kind){
    const el = byId('cibs-status');
    if(!el) return;
    el.textContent = 'Status: ' + text;
    el.className = 'cibs-status';
    if(kind === 'ok')   el.classList.add('cibs-status-ok');
    if(kind === 'warn') el.classList.add('cibs-status-warn');
    if(kind === 'bad')  el.classList.add('cibs-status-bad');
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
    const blob = new Blob([text], { type: type || 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // ---------- templates ----------

  const BASE_CATEGORIES = [
    { id:'housing',       label:'Housing & shelter' },
    { id:'health',        label:'Clinics & health access' },
    { id:'food',          label:'Food & basic needs' },
    { id:'mobility',      label:'Mobility & transit' },
    { id:'workforce',     label:'Workforce & jobs' },
    { id:'justice_repair',label:'Justice repair & legal aid' },
    { id:'reserve',       label:'Reserve / contingency' }
  ];

  const TEMPLATES = {
    default: {
      name:'Default',
      percents:{
        housing:30,
        health:20,
        food:10,
        mobility:10,
        workforce:15,
        justice_repair:10,
        reserve:5
      }
    },
    housing_heavy:{
      name:'Housing-heavy',
      percents:{
        housing:45,
        health:15,
        food:8,
        mobility:8,
        workforce:12,
        justice_repair:7,
        reserve:5
      }
    },
    workforce_heavy:{
      name:'Workforce-heavy',
      percents:{
        housing:25,
        health:15,
        food:8,
        mobility:10,
        workforce:30,
        justice_repair:7,
        reserve:5
      }
    }
  };

  // ---------- state ----------

  let currentPercents = {};
  let totalRecovery = 0;

  // ---------- DOM wiring ----------

  function initTemplate(templateKey){
    const tpl = TEMPLATES[templateKey] || TEMPLATES.default;
    currentPercents = { ...tpl.percents };
    renderCategories();
    recalc();
  }

  function renderCategories(){
    const wrap = byId('cibs-cats');
    if(!wrap) return;
    wrap.innerHTML = '';

    BASE_CATEGORIES.forEach(cat=>{
      const p = currentPercents[cat.id] ?? 0;

      const div = document.createElement('div');
      div.className = 'cibs-cat';
      div.dataset.catId = cat.id;

      const header = document.createElement('div');
      header.className = 'cibs-cat-header';

      const nameSpan = document.createElement('span');
      nameSpan.className = 'cibs-cat-name';
      nameSpan.textContent = cat.label;

      const input = document.createElement('input');
      input.type = 'number';
      input.min = '0';
      input.max = '100';
      input.step = '0.1';
      input.value = p;
      input.className = 'cibs-cat-perc';
      input.addEventListener('input', ()=>{
        const val = Number(input.value);
        if(Number.isNaN(val)) return;
        currentPercents[cat.id] = val;
        if(byId('cibs-template-lock')?.checked){
          // keep sum at 100 by scaling
          rebalancePercents(cat.id);
          renderCategories();
        }else{
          recalc();
        }
      });

      header.appendChild(nameSpan);
      header.appendChild(input);

      const amount = document.createElement('div');
      amount.className = 'cibs-cat-amount';
      amount.id = `cibs-amount-${cat.id}`;
      amount.textContent = money(0);

      div.appendChild(header);
      div.appendChild(amount);
      wrap.appendChild(div);
    });
  }

  function rebalancePercents(changedId){
    const sum = Object.values(currentPercents).reduce((a,b)=>a+(Number(b)||0),0);
    if(sum === 0) return;

    // Scale all others to keep total ~100, keep changed as user set it
    const targetTotal = 100;
    const changedVal = currentPercents[changedId] || 0;
    const restTotal = sum - changedVal;
    if(restTotal <= 0){
      // everyone else zero
      for(const id of Object.keys(currentPercents)){
        if(id !== changedId) currentPercents[id] = 0;
      }
      return;
    }
    const scale = (targetTotal - changedVal) / restTotal;
    for(const id of Object.keys(currentPercents)){
      if(id === changedId) continue;
      currentPercents[id] = Math.max(0, currentPercents[id] * scale);
    }
  }

  function recalc(){
    const totalEl = byId('cibs-total');
    totalRecovery = totalEl ? Number(totalEl.value || 0) : 0;
    if(Number.isNaN(totalRecovery) || totalRecovery < 0) totalRecovery = 0;

    let sumPerc = 0;
    BASE_CATEGORIES.forEach(cat=>{
      sumPerc += Number(currentPercents[cat.id] || 0);
    });

    const allocs = BASE_CATEGORIES.map(cat=>{
      const perc = Number(currentPercents[cat.id] || 0);
      const amount = totalRecovery * (perc/100);
      const amtEl = byId(`cibs-amount-${cat.id}`);
      if(amtEl) amtEl.textContent = money(amount);
      return {
        id: cat.id,
        label: cat.label,
        percent: perc,
        amount
      };
    });

    // Build JSON artifact
    const budget = {
      version:'1.0',
      module:'CIBS',
      total_recovery: totalRecovery,
      percent_sum: sumPerc,
      categories: allocs,
      created_at: new Date().toISOString()
    };

    const json = JSON.stringify(budget,null,2);
    const out = byId('cibs-json');
    if(out) out.textContent = json;

    // Set status
    if(Math.abs(sumPerc - 100) < 0.5){
      setStatus(`budget ready · template sums to ~100% (actual ${sumPerc.toFixed(1)}%)`,'ok');
    }else{
      setStatus(`budget built but template sums to ${sumPerc.toFixed(1)}% (you may want 100%)`,'warn');
    }

    // Hash + store + enable buttons
    sha256OfText(json).then(hash=>{
      const hashEl = byId('cibs-hash');
      if(hashEl){
        hashEl.textContent =
          'Audit hash: ' + hash +
          '  (SHA-256 of this CIBS budget. Any tampering will change this value.)';
      }
      try{
        localStorage.setItem('ABE_CIBS_BUDGET_V1', json);
      }catch(e){
        console.warn('Could not store CIBS budget in localStorage:', e);
      }
    });

    const btnCsv  = byId('cibs-download-csv');
    const btnJson = byId('cibs-download-json');
    if(btnCsv){
      btnCsv.disabled = false;
      btnCsv.onclick = ()=>{
        const header = ['category_id','category_label','percent','amount_usd'];
        const rows = allocs.map(a=>[
          a.id,
          `"${a.label.replace(/"/g,'""')}"`,
          a.percent,
          a.amount
        ]);
        const csv = [header.join(',')]
          .concat(rows.map(r=>r.join(',')))
          .join('\n');
        downloadTextFile('cibs_budget.csv', csv, 'text/csv');
      };
    }
    if(btnJson){
      btnJson.disabled = false;
      btnJson.onclick = ()=>{
        downloadTextFile('cibs_budget.json', json, 'application/json');
      };
    }
  }

  function hydrateFromCiri(){
    const bridge = byId('cibs-bridge');
    try{
      const raw = localStorage.getItem('ABE_CIRI_SCENARIO_V2');
      if(!raw){
        if(bridge) bridge.textContent =
          'CIRI bridge: no CIRI scenario found yet. You can still type a total recovery by hand.';
        return;
      }
      const scen = JSON.parse(raw);
      const out = scen.outputs || {};
      const total = typeof out.total_recovery === 'number' ? out.total_recovery : 0;
      const totalEl = byId('cibs-total');
      if(totalEl && total > 0){
        totalEl.value = Math.round(total);
      }
      if(bridge){
        bridge.textContent =
          'CIRI bridge: using total_recovery from your last CIRI scenario (ABE_CIRI_SCENARIO_V2).';
      }
    }catch(e){
      console.warn('CIBS CIRI bridge error:', e);
      if(bridge) bridge.textContent =
        'CIRI bridge: found a value but could not parse it. You can still type a total.';
    }
  }

  // ---------- init ----------

  (function init(){
    hydrateFromCiri();
    initTemplate('default');

    const tplSelect = byId('cibs-template');
    if(tplSelect){
      tplSelect.addEventListener('change',()=>{
        initTemplate(tplSelect.value || 'default');
      });
    }
    const totalEl = byId('cibs-total');
    if(totalEl){
      totalEl.addEventListener('input', recalc);
    }
    const recalcBtn = byId('cibs-recalc');
    if(recalcBtn){
      recalcBtn.addEventListener('click', recalc);
    }

    setStatus('ready — pick a template or adjust percentages, then recalc.','ok');
  })();

})();
