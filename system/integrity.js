// /system/integrity.js  — dependency-free validator + SHA-256
(async function(){
  const enc = new TextEncoder();

  async function sha256(text){
    const hash = await crypto.subtle.digest('SHA-256', enc.encode(text));
    return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('');
  }

  async function fetchText(url){
    const r = await fetch(url, {cache:'no-store'});
    if(!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.text();
  }

  // CSV helpers (simple, safe enough for our schema)
  function parseCSV(text){
    const lines = text.trim().split(/\r?\n/).filter(Boolean);
    return lines.map(l => l.split(',').map(s => s.trim()));
  }
  const toNum = v => {
    const n = Number(String(v).replace(/[^0-9.\-]/g,''));
    return isFinite(n) ? n : 0;
  };

  // ---- validators ----

  // CIRI: recompute total for consistency sanity check
  function computeCIRI(o){
    const c=o.cases_avoided, C=o.avg_cost_per_case, D=o.jail_days_avoided, J=o.cost_per_jail_day,
          F=o.fees_canceled_total, P=o.policy_corrections, E=o.avg_enforcement_cost_savings,
          H=o.households_restored, M=o.avg_monthly_market_spend, m=o.months_effective,
          pe=o.employment_probability, W=o.avg_monthly_wage, L=o.expected_lawsuits,
          A=o.avg_payout, lam=o.litigation_multiplier, T=o.transition_costs_one_time;

    const total = (c*C+F) + (D*J) + (P*E) + (H*M*m) + ((H*pe)*W*m) + (L*A*lam) - T;
    return { total, CIRI: (1 - Math.exp(- total / 2_000_000_000)) };
  }

  async function validateCIRI(url){
    try{
      const text = await fetchText(url);
      const hash = await sha256(text);
      const rows = parseCSV(text);
      if(rows.length < 2) return {status:'bad', message:'missing data row', sha256:hash};
      const head = rows[0], vals = rows[1];
      const keys = [
        'cases_avoided','avg_cost_per_case','jail_days_avoided','cost_per_jail_day',
        'fees_canceled_total','policy_corrections','avg_enforcement_cost_savings',
        'households_restored','avg_monthly_market_spend','months_effective',
        'employment_probability','avg_monthly_wage','expected_lawsuits','avg_payout',
        'litigation_multiplier','transition_costs_one_time'
      ];
      for(const k of keys) if(!head.includes(k)) return {status:'bad', message:`missing column: ${k}`, sha256:hash};

      const obj = Object.fromEntries(head.map((h,i)=>[h, toNum(vals[i]??0)]));
      const {total,CIRI} = computeCIRI(obj);
      const msg = `total=${Math.round(total).toLocaleString()} • CIRI=${CIRI.toFixed(2)}`;
      return {status:'ok', message:msg, sha256:hash, derived:{total,CIRI}};
    }catch(e){
      return {status:'bad', message:String(e), sha256:null};
    }
  }

  // CIBS: sum values and compute shares
  async function validateCIBS(url){
    try{
      const text = await fetchText(url);
      const hash = await sha256(text);
      const rows = parseCSV(text);
      if(rows.length < 2) return {status:'bad', message:'no rows', sha256:hash};
      const head = rows[0];
      const idxVal = head.findIndex(h=>/^(value)$/i.test(h));
      const idxCat = head.findIndex(h=>/^(category)$/i.test(h));
      if(idxVal<0||idxCat<0) return {status:'bad', message:'missing headers category/value', sha256:hash};
      const total = rows.slice(1).reduce((s,r)=> s + toNum(r[idxVal]), 0);
      const msg = `categories=${rows.length-1} • total=${Math.round(total).toLocaleString()}`;
      return {status:'ok', message:msg, sha256:hash, derived:{total, categories:rows.length-1}};
    }catch(e){
      return {status:'bad', message:String(e), sha256:null};
    }
  }

  // CDI: ensure divergence in [0,1], presence of rows
  async function validateCDI(url){
    try{
      const text = await fetchText(url);
      const hash = await sha256(text);
      const rows = parseCSV(text);
      if(rows.length < 2) return {status:'warn', message:'no data rows', sha256:hash};
      const head = rows[0];
      const idxD  = head.findIndex(h=>/divergence/i.test(h));
      if(idxD<0) return {status:'bad', message:'missing divergence column', sha256:hash};
      let ok=0, bad=0;
      for(const r of rows.slice(1)){
        const v = Number(r[idxD]);
        if(isFinite(v) && v>=0 && v<=1) ok++; else bad++;
      }
      const status = bad===0 ? 'ok' : (ok>0 ? 'warn' : 'bad');
      const msg = `rows=${rows.length-1} • valid=${ok} • out_of_range=${bad}`;
      return {status, message:msg, sha256:hash, derived:{rows:rows.length-1, valid:ok, out_of_range:bad}};
    }catch(e){
      return {status:'bad', message:String(e), sha256:null};
    }
  }

  // CAE: simple schema plausibility: categories[], each {key,name,multiplier}
  async function validateCAE(url){
    try{
      const text = await fetchText(url);
      const hash = await sha256(text);
      const j = JSON.parse(text);
      const cats = Array.isArray(j.categories) ? j.categories : [];
      const miss = [];
      cats.forEach((c,i)=>{
        if(typeof c.key!=='string') miss.push(`categories[${i}].key`);
        if(typeof c.name!=='string') miss.push(`categories[${i}].name`);
        if(typeof c.multiplier!=='number' || !isFinite(c.multiplier)) miss.push(`categories[${i}].multiplier`);
      });
      const status = (cats.length>0 && miss.length===0) ? 'ok' : (cats.length>0 ? 'warn' : 'bad');
      const msg = cats.length>0 ? `categories=${cats.length}` : 'no categories';
      return {status, message: miss.length? `${msg} • missing: ${miss.join(', ')}` : msg, sha256:hash, derived:{categories:cats.length}};
    }catch(e){
      return {status:'bad', message:String(e), sha256:null};
    }
  }

  // Public API for the page
  window.runIntegrity = async function(opts){
    const started = new Date().toISOString();
    const [ciri,cibs,cdi,cae] = await Promise.all([
      validateCIRI(opts.files.ciri),
      validateCIBS(opts.files.cibs),
      validateCDI(opts.files.cdi),
      validateCAE(opts.files.cae)
    ]);

    // overall: any 'bad' => bad; else any 'warn' => warn; else ok
    const statuses = [ciri.status,cibs.status,cdi.status,cae.status];
    const overall = statuses.includes('bad') ? 'bad' : (statuses.includes('warn') ? 'warn' : 'ok');

    const material = [
      {path:'ciri/inputs.csv', sha256:ciri.sha256},
      {path:'cibs/auto_budget.csv', sha256:cibs.sha256},
      {path:'cdi/divergence.csv', sha256:cdi.sha256},
      {path:'cae/model.json', sha256:cae.sha256},
    ];

    const body = JSON.stringify(material);
    const ledger_sha256 = await sha256(body);

    return {
      audit_id: ledger_sha256.slice(0,16),
      generated_at: started,
      overall,
      modules: { ciri, cibs, cdi, cae },
      material,
      hash_of_material_list: ledger_sha256
    };
  };
})();
