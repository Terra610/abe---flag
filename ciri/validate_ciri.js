(async function(){
  const banner = document.getElementById('data-health');
  function setState(cls, msg){ banner.className=''; banner.classList.add(cls); banner.textContent=msg; }

  // tiny CSV helper (handles quotes)
  function csvToRows(text){
    const rows=[]; let i=0, field='', row=[], inQ=false;
    while(i<text.length){
      const c=text[i++];
      if(inQ){ if(c==='"' && text[i]==='"'){ field+='"'; i++; } else if(c==='\"'){ inQ=false; }
              else field+=c; }
      else{
        if(c==='\"'){ inQ=true; }
        else if(c===','){ row.push(field); field=''; }
        else if(c==='\n' || c==='\r'){ if(field!==''||row.length){ row.push(field); rows.push(row); field=''; row=[]; } }
        else field+=c;
      }
    }
    if(field!==''||row.length){ row.push(field); rows.push(row); }
    return rows.filter(r=>r.length);
  }

  try{
    const [csvRes, schemaRes] = await Promise.all([
      fetch('./inputs.csv',{cache:'no-store'}),
      fetch('./schema.json',{cache:'no-store'})
    ]);
    if(!csvRes.ok){ setState('err','inputs.csv missing'); return; }
    if(!schemaRes.ok){ setState('warn','schema.json missing (skipping strict checks)'); return; }

    const [csvText, schema] = [await csvRes.text(), await schemaRes.json()];
    const rows = csvToRows(csvText.trim());
    if(rows.length<2){ setState('err','inputs.csv has no data row'); return; }

    const headers = rows[0].map(h=>h.trim());
    const required = schema.required||[];
    const missing = required.filter(k=>!headers.includes(k));

    if(missing.length){
      setState('err',`inputs.csv is missing required columns: ${missing.join(', ')}`);
      return;
    }

    // spot numeric sanity based on schema minimums
    const data = rows[1];
    const idx = Object.fromEntries(headers.map((h,i)=>[h,i]));
    const bad = [];
    for(const [k, spec] of Object.entries(schema.properties||{})){
      if(idx[k]==null) continue;
      const raw = (data[idx[k]]||'').replace(/[^0-9.\-]/g,'');
      const v = Number(raw);
      if(!isFinite(v) || (spec.minimum!=null && v<spec.minimum)) bad.push(k);
    }

    if(bad.length){
      setState('warn',`inputs.csv loaded with non-numeric or out-of-range values in: ${bad.join(', ')}`);
    }else{
      setState('ok','inputs.csv validated ✓');
    }
  }catch(e){
    setState('err','Validation error');
    console.error(e);
  }
})();
