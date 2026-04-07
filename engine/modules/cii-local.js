// cii/local.js
// CII — Community Investment Interface
// - Reads CIBS budget (ABE_CIBS_BUDGET_V1) from localStorage.
// - Lets user set per-category unit costs.
// - Computes simple project lines & stores ABE_CII_PORTFOLIO_V1 + SHA-256 hash.

(function(){
  const byId = id => document.getElementById(id);

  function setStatus(text, kind){
    const el = byId('cii-status');
    if(!el) return;
    el.textContent = 'Status: ' + text;
    el.className = 'cii-status';
    if(kind === 'ok')   el.classList.add('cii-status-ok');
    if(kind === 'warn') el.classList.add('cii-status-warn');
    if(kind === 'bad')  el.classList.add('cii-status-bad');
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

  function numberFromInput(el){
    if(!el) return 0;
    const raw = (el.value || '').trim();
    const num = Number(raw);
    if(Number.isNaN(num) || num <= 0) return 0;
    return num;
  }

  let budget = null;   // from CIBS
  let unitInputs = {}; // category_id -> input element

  function hydrateFromCibs(){
    const bridge = byId('cii-bridge');
    try{
      const raw = localStorage.getItem('ABE_CIBS_BUDGET_V1');
      if(!raw){
        if(bridge) bridge.textContent =
          'CIBS bridge: no budget found yet. Build one in CIBS, then return here.';
        setStatus('no CIBS budget available yet.','bad');
        return;
      }
      budget = JSON.parse(raw);
      if(bridge){
        bridge.textContent =
          'CIBS bridge: using budget from your last CIBS run (ABE_CIBS_BUDGET_V1).';
      }
      setStatus('budget loaded — set unit assumptions and recalc.','ok');
      renderUnitInputs();
    }catch(e){
      console.warn('CII CIBS bridge error:', e);
      if(bridge) bridge.textContent =
        'CIBS bridge: found a value but could not parse it.';
      setStatus('could not parse CIBS budget.','bad');
    }
  }

  function renderUnitInputs(){
    const area = byId('cii-units-area');
    if(!area || !budget) return;
    area.innerHTML = '';

    unitInputs = {};

    const cats = Array.isArray(budget.categories) ? budget.categories : [];
    if(!cats.length){
      const p = document.createElement('p');
      p.className = 'cii-mini';
      p.textContent = 'No categories present in CIBS budget.';
      area.appendChild(p);
      return;
    }

    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const tbody = document.createElement('tbody');

    const trh = document.createElement('tr');
    ['Category','Budget amount','Unit label','Unit cost (USD)'].forEach(h=>{
      const th = document.createElement('th');
      th.textContent = h;
      trh.appendChild(th);
    });
    thead.appendChild(trh);

    cats.forEach(cat=>{
      const tr = document.createElement('tr');

      // col 1: label
      const tdLabel = document.createElement('td');
      tdLabel.textContent = cat.label || cat.category_label || cat.id || '(unnamed)';
      tr.appendChild(tdLabel);

      // col 2: amount
      const tdAmt = document.createElement('td');
      tdAmt.textContent = money(cat.amount);
      tr.appendChild(tdAmt);

      // col 3: unit label (e.g., "housing-months")
      const tdUnitLabel = document.createElement('td');
      const unitLabelInput = document.createElement('input');
      unitLabelInput.type = 'text';
      unitLabelInput.value = suggestUnitLabel(cat.id);
      tdUnitLabel.appendChild(unitLabelInput);
      tr.appendChild(tdUnitLabel);

      // col 4: unit cost
      const tdUnitCost = document.createElement('td');
      const unitCostInput = document.createElement('input');
      unitCostInput.type = 'number';
      unitCostInput.min = '1';
      unitCostInput.step = '1';
      unitCostInput.value = suggestUnitCost(cat.id);
      tdUnitCost.appendChild(unitCostInput);
      tr.appendChild(tdUnitCost);

      tbody.appendChild(tr);

      unitInputs[cat.id] = {
        labelInput: unitLabelInput,
        costInput: unitCostInput
      };
    });

    table.appendChild(thead);
    table.appendChild(tbody);
    area.appendChild(table);
  }

  function suggestUnitLabel(catId){
    switch(catId){
      case 'housing': return 'housing-months';
      case 'health': return 'clinic-visits';
      case 'food': return 'monthly-food-boxes';
      case 'mobility': return 'transit-passes';
      case 'workforce': return 'training-seats-months';
      case 'justice_repair': return 'legal-aid-cases';
      case 'reserve': return 'reserve-dollars';
      default: return `${catId || 'units'}`;
    }
  }

  function suggestUnitCost(catId){
    switch(catId){
      case 'housing': return 1200;     // per-month illustrative
      case 'health': return 200;       // per visit
      case 'food': return 150;         // per month box
      case 'mobility': return 80;      // per monthly pass
      case 'workforce': return 600;    // per seat-month
      case 'justice_repair': return 400; // per case
      case 'reserve': return 1;        // reserve dollars
      default: return 100;
    }
  }

  function buildPortfolio(){
    if(!budget){
      setStatus('cannot build portfolio without CIBS budget.','bad');
      return null;
    }
    const cats = Array.isArray(budget.categories) ? budget.categories : [];
    const rows = [];

    cats.forEach(cat=>{
      const uid = cat.id;
      const amount = Number(cat.amount || 0);
      const inputs = unitInputs[uid];
      if(!inputs){
        return;
      }
      const unitLabel = (inputs.labelInput.value || '').trim() || suggestUnitLabel(uid);
      const unitCost  = numberFromInput(inputs.costInput);
      const units     = unitCost > 0 ? amount / unitCost : 0;

      rows.push({
        category_id: uid,
        category_label: cat.label || cat.category_label || uid,
        budget_amount: amount,
        unit_label: unitLabel,
        unit_cost: unitCost,
        units_funded: units
      });
    });

    return rows;
  }

  function renderPortfolioTable(rows){
    const wrap = byId('cii-table-wrap');
    if(!wrap){
      return;
    }
    wrap.innerHTML = '';

    if(!rows || !rows.length){
      const p = document.createElement('p');
      p.className = 'cii-mini';
      p.textContent = 'No portfolio rows yet. Set unit costs and click “Recalculate project portfolio”.';
      wrap.appendChild(p);
      return;
    }

    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const tbody = document.createElement('tbody');

    const trh = document.createElement('tr');
    ['Category','Budget amount','Unit','Unit cost','Units funded'].forEach(h=>{
      const th = document.createElement('th');
      th.textContent = h;
      trh.appendChild(th);
    });
    thead.appendChild(trh);

    rows.forEach(r=>{
      const tr = document.createElement('tr');
      const cells = [
        r.category_label,
        money(r.budget_amount),
        r.unit_label,
        money(r.unit_cost),
        Math.floor(r.units_funded).toLocaleString()
      ];
      cells.forEach(val=>{
        const td = document.createElement('td');
        td.textContent = val;
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });

    table.appendChild(thead);
    table.appendChild(tbody);
    wrap.appendChild(table);
  }

  async function recalc(){
    const rows = buildPortfolio();
    if(!rows){
      return;
    }

    renderPortfolioTable(rows);

    const scenario = {
      version:'1.0',
      module:'CII',
      source_budget: {
        total_recovery: budget.total_recovery,
        percent_sum: budget.percent_sum
      },
      portfolio: rows,
      created_at: new Date().toISOString()
    };

    const json = JSON.stringify(scenario,null,2);
    const jsonEl = byId('cii-json');
    if(jsonEl) jsonEl.textContent = json;

    const hash = await sha256OfText(json);
    const hashEl = byId('cii-hash');
    if(hashEl){
      hashEl.textContent =
        'Audit hash: ' + hash +
        '  (SHA-256 of this CII portfolio. Any tampering will change this value.)';
    }

    try{
      localStorage.setItem('ABE_CII_PORTFOLIO_V1', json);
    }catch(e){
      console.warn('Could not store CII portfolio in localStorage:', e);
    }

    const btnCsv  = byId('cii-download-csv');
    const btnJson = byId('cii-download-json');
    if(btnCsv){
      btnCsv.disabled = false;
      btnCsv.onclick = ()=>{
        const header = [
          'category_id',
          'category_label',
          'budget_amount_usd',
          'unit_label',
          'unit_cost_usd',
          'units_funded'
        ];
        const lines = [header.join(',')];
        rows.forEach(r=>{
          lines.push([
            r.category_id,
            `"${String(r.category_label).replace(/"/g,'""')}"`,
            r.budget_amount,
            `"${String(r.unit_label).replace(/"/g,'""')}"`,
            r.unit_cost,
            Math.floor(r.units_funded)
          ].join(','));
        });
        downloadTextFile('cii_portfolio.csv', lines.join('\n'), 'text/csv');
      };
    }
    if(btnJson){
      btnJson.disabled = false;
      btnJson.onclick = ()=>{
        downloadTextFile('cii_portfolio.json', json, 'application/json');
      };
    }

    setStatus('portfolio rebuilt — review units and download receipts.','ok');
  }

  // ---------- init ----------

  (function init(){
    hydrateFromCibs();

    const btn = byId('cii-recalc');
    if(btn){
      btn.addEventListener('click', recalc);
    }
  })();

})();
