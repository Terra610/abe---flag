(async function(){
  const banner = document.getElementById('cibs-health');
  const set = (c,m)=>{ banner.className=''; banner.classList.add(c); banner.textContent=m; };

  function csvRows(s){
    const rows=[]; let i=0,f='',r=[],q=false;
    while(i<s.length){ const c=s[i++]; if(q){ if(c=='"'&&s[i]=='"'){f+='"';i++;} else if(c=='"'){q=false;} else f+=c; }
      else { if(c=='"'){q=true;} else if(c==','){r.push(f);f='';} else if(c=='\n'||c=='\r'){ if(f!==''||r.length){r.push(f);rows.push(r);f='';r=[];} } else f+=c; } }
    if(f!==''||r.length){r.push(f);rows.push(r);} return rows;
  }

  try{
    const [csvRes, schemaRes] = await Promise.all([
      fetch('./auto_budget.csv',{cache:'no-store'}),
      fetch('./schema.json',{cache:'no-store'})
    ]);
    if(!csvRes.ok){ set('err','auto_budget.csv missing'); return; }
    if(!schemaRes.ok){ set('warn','schema.json missing (skipping strict checks)'); return; }

    const [csvText, schema] = [await csvRes.text(), await schemaRes.json()];
    const rows = csvRows(csvText.trim()); if(!rows.length){ set('err','auto_budget.csv empty'); return; }
    const head = rows.shift().map(h=>h.trim());
    const idx = Object.fromEntries(head.map((h,i)=>[h,i]));
    const required = schema.required||[];
    const missing = required.filter(k=>idx[k]==null && idx[k.charAt(0).toUpperCase()+k.slice(1)]==null);
    if(missing.length){ set('err','auto_budget.csv missing columns: '+missing.join(', ')); return; }

    let bad=0, total=0;
    for(const r of rows){
      const v = Number(String(r[idx.value??idx.Value]).replace(/[^0-9.\-]/g,''));
      if(!isFinite(v) || v<0){ bad++; }
      else total+=v;
    }
    if(bad){ set('warn',`auto_budget.csv validated with ${bad} row issue(s); total = $${Math.round(total).toLocaleString()}`); }
    else   { set('ok',  `auto_budget.csv validated ✓ — total = $${Math.round(total).toLocaleString()}`); }
  }catch(e){
    set('err','Validation error'); console.error(e);
  }
})();
