// cff/local.js
// CFF — Constitutional Funding Forensics
// - Parses a simple CSV of funding line items in-browser.
// - Computes totals by spend_category_code (ON_MISSION/OFF_MISSION/UNCLEAR).
// - Builds a CFF artifact with SHA-256 hash and stores it in localStorage.

(function(){
  const byId = id => document.getElementById(id);

  const fileInput    = byId('cff-file');
  const fileNameEl   = byId('cff-file-name');
  const runBtn       = byId('cff-run');
  const statusEl     = byId('cff-status');

  const kOnCount     = byId('kpi-on-count');
  const kOnAmount    = byId('kpi-on-amount');
  const kOffCount    = byId('kpi-off-count');
  const kOffAmount   = byId('kpi-off-amount');
  const kUncCount    = byId('kpi-unc-count');
  const kUncAmount   = byId('kpi-unc-amount');

  const tableContainer = byId('cff-table-container');
  const dlJsonBtn      = byId('cff-download-json');
  const dlSummaryBtn   = byId('cff-download-summary');
  const hashEl         = byId('cff-hash');

  let latestArtifact = null;
  let latestSummaryCsv = null;

  // ---------- helpers ----------

  function setStatus(text, kind){
    if(!statusEl) return;
    statusEl.textContent = 'Status: ' + text;
    statusEl.className = 'cff-status';
    if(kind === 'ok')   statusEl.classList.add('cff-status-ok');
    if(kind === 'warn') statusEl.classList.add('cff-status-warn');
    if(kind === 'bad')  statusEl.classList.add('cff-status-bad');
  }

  function fmtMoney(n){
    const num = Number(n) || 0;
    try{
      return num.toLocaleString(undefined, {
        style:'currency',
        currency:'USD',
        maximumFractionDigits:0
      });
    }catch(_){
      return '$' + Math.round(num).toLocaleString();
    }
  }

  function fmtInt(n){
    const num = Number(n) || 0;
    return num.toLocaleString(undefined, { maximumFractionDigits:0 });
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

  // ---------- CSV parsing (simple but safe enough for our structure) ----------

  function parseCsv(text){
    // Very small CSV parser that handles commas and quotes, assuming
    // no embedded newlines within quoted fields.
    const rows = [];
    const lines = text.split(/\r?\n/).filter(l=>l.trim().length > 0);
    for(const line of lines){
      const cells = [];
      let current = '';
      let inQuotes = false;

      for(let i=0;i<line.length;i++){
        const ch = line[i];
        if(ch === '"'){
          if(inQuotes && line[i+1] === '"'){ // escaped quote
            current += '"';
            i++;
          }else{
            inQuotes = !inQuotes;
          }
        }else if(ch === ',' && !inQuotes){
          cells.push(current);
          current = '';
        }else{
          current += ch;
        }
      }
      cells.push(current);
      rows.push(cells.map(c => c.trim()));
    }
    return rows;
  }

  function indexColumns(header){
    const idx = {};
    header.forEach((name, i)=>{
      const key = (name || '').toLowerCase().trim();
      idx[key] = i;
    });

    function col(names){
      for(const n of names){
        const k = n.toLowerCase();
        if(Object.prototype.hasOwnProperty.call(idx,k)) return idx[k];
      }
      return -1;
    }

    return {
      program_name: col(['program_name']),
      authority:    col(['federal_authority_citation','authority','federal_authority']),
      jurisdiction: col(['state_or_jurisdiction','jurisdiction','state']),
      agency:       col(['agency']),
      desc:         col(['line_item_description','description']),
      category:     col(['spend_category_code','category','code']),
      amount:       col(['amount_usd','amount','value'])
    };
  }

  // ---------- render table ----------

  function renderTable(rows){
    if(!tableContainer) return;
    tableContainer.innerHTML = '';

    if(!rows.length){
      const div = document.createElement('div');
      div.textContent = 'No rows parsed from this CSV.';
      tableContainer.appendChild(div);
      return;
    }

    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const tbody = document.createElement('tbody');

    const headerRow = document.createElement('tr');
    ['program_name','jurisdiction','agency','category','amount_usd'].forEach(h=>{
      const th = document.createElement('th');
      th.textContent = h;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);

    rows.slice(0,20).forEach(r=>{
      const tr = document.createElement('tr');
      const cat = (r.category || '').toUpperCase();
      if(cat === 'OFF_MISSION') tr.classList.add('cff-off');
      else if(cat === 'UNCLEAR') tr.classList.add('cff-unclear');

      const cells = [
        r.program_name || '',
        r.state_or_jurisdiction || r.jurisdiction || '',
        r.agency || '',
        r.spend_category_code || '',
        r.amount_usd != null ? fmtMoney(r.amount_usd) : ''
      ];
      cells.forEach(v=>{
        const td = document.createElement('td');
        td.textContent = v;
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });

    table.appendChild(thead);
    table.appendChild(tbody);
    tableContainer.appendChild(table);
  }

  // ---------- main run ----------

  async function runCff(){
    try{
      if(runBtn) runBtn.disabled = true;
      if(dlJsonBtn) dlJsonBtn.disabled = true;
      if(dlSummaryBtn) dlSummaryBtn.disabled = true;
      latestArtifact   = null;
      latestSummaryCsv = null;
      setStatus('reading CSV (local only)…','warn');

      const file = fileInput && fileInput.files && fileInput.files[0];
      if(!file){
        setStatus('please select a CSV file first','bad');
        return;
      }

      const text = await new Promise((resolve, reject)=>{
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Could not read file as text'));
        reader.onload  = () => resolve(String(reader.result || ''));
        reader.readAsText(file);
      });

      const rows = parseCsv(text);
      if(!rows.length){
        setStatus('CSV appears to be empty.','bad');
        return;
      }

      const header = rows[0];
      const idx = indexColumns(header);
      const dataRows = rows.slice(1);

      const parsed = [];
      dataRows.forEach(cols=>{
        function val(i){ return i >= 0 && i < cols.length ? cols[i] : ''; }

        let amount = 0;
        if(idx.amount >= 0){
          const raw = val(idx.amount).replace(/[$,]/g,'');
          const num = Number(raw);
          if(!Number.isNaN(num)) amount = num;
        }

        const categoryRaw = idx.category >= 0 ? val(idx.category) : '';
        const category = (categoryRaw || '').toUpperCase().trim();

        parsed.push({
          program_name: val(idx.program_name),
          federal_authority_citation: val(idx.authority),
          state_or_jurisdiction: val(idx.jurisdiction),
          agency: val(idx.agency),
          line_item_description: val(idx.desc),
          spend_category_code: category,
          amount_usd: amount
        });
      });

      // Aggregate
      const totals = {
        ON_MISSION: { count: 0, amount: 0 },
        OFF_MISSION:{ count: 0, amount: 0 },
        UNCLEAR:   { count: 0, amount: 0 }
      };

      parsed.forEach(row=>{
        const cat = (row.spend_category_code || 'UNCLEAR').toUpperCase();
        const t = totals[cat] || totals.UNCLEAR;
        t.count += 1;
        t.amount += row.amount_usd || 0;
      });

      // KPIs
      if(kOnCount)  kOnCount.textContent  = fmtInt(totals.ON_MISSION.count);
      if(kOnAmount) kOnAmount.textContent = totals.ON_MISSION.count
        ? fmtMoney(totals.ON_MISSION.amount)
        : '—';

      if(kOffCount)  kOffCount.textContent  = fmtInt(totals.OFF_MISSION.count);
      if(kOffAmount) kOffAmount.textContent = totals.OFF_MISSION.count
        ? fmtMoney(totals.OFF_MISSION.amount)
        : '—';

      if(kUncCount)  kUncCount.textContent  = fmtInt(totals.UNCLEAR.count);
      if(kUncAmount) kUncAmount.textContent = totals.UNCLEAR.count
        ? fmtMoney(totals.UNCLEAR.amount)
        : '—';

      renderTable(parsed);

      // Build artifact
      const now = new Date().toISOString();
      const artifact = {
        version: '1.0',
        module: 'CFF',
        source_file_name: file.name,
        parsed_row_count: parsed.length,
        totals,
        sample_rows: parsed.slice(0, 50),
        created_at: now,
        notes: 'CFF artifact generated locally in the browser. ' +
               'Use this with Integration + LAW corpus to show ON/OFF mission usage.'
      };

      const artifactJson = JSON.stringify(artifact, null, 2);
      const hash = await sha256OfText(artifactJson);

      latestArtifact = artifact;
      latestSummaryCsv = buildSummaryCsv(totals);

      if(hashEl){
        hashEl.textContent =
          'Audit hash: ' + hash +
          '  (SHA-256 of this CFF artifact. Any tampering will change this value.)';
      }

      if(dlJsonBtn){
        dlJsonBtn.disabled = false;
        dlJsonBtn.onclick = ()=>{
          downloadTextFile(
            'cff_artifact_' + Date.now() + '.json',
            artifactJson,
            'application/json'
          );
        };
      }

      if(dlSummaryBtn && latestSummaryCsv){
        dlSummaryBtn.disabled = false;
        dlSummaryBtn.onclick = ()=>{
          downloadTextFile(
            'cff_summary_' + Date.now() + '.csv',
            latestSummaryCsv,
            'text/csv'
          );
        };
      }

      setStatus('CFF complete — review totals and download the artifact for your records.','ok');

      // Store in localStorage
      try{
        localStorage.setItem('ABE_CFF_ARTIFACT_V1', artifactJson);
      }catch(e){
        console.warn('Could not store CFF artifact in localStorage:', e);
      }

    }catch(err){
      console.error(err);
      setStatus('CFF failed: ' + (err.message || String(err)),'bad');
      if(kOnCount)  kOnCount.textContent  = '—';
      if(kOnAmount) kOnAmount.textContent = '—';
      if(kOffCount)  kOffCount.textContent  = '—';
      if(kOffAmount) kOffAmount.textContent = '—';
      if(kUncCount)  kUncCount.textContent  = '—';
      if(kUncAmount) kUncAmount.textContent = '—';
      if(tableContainer) tableContainer.innerHTML = '';
      if(dlJsonBtn) dlJsonBtn.disabled = true;
      if(dlSummaryBtn) dlSummaryBtn.disabled = true;
      if(hashEl) hashEl.textContent = 'Audit hash: —';
    }finally{
      if(runBtn) runBtn.disabled = false;
    }
  }

  function buildSummaryCsv(totals){
    const rows = [
      ['category','count','amount_usd'],
      ['ON_MISSION', totals.ON_MISSION.count, totals.ON_MISSION.amount],
      ['OFF_MISSION', totals.OFF_MISSION.count, totals.OFF_MISSION.amount],
      ['UNCLEAR', totals.UNCLEAR.count, totals.UNCLEAR.amount]
    ];
    return rows.map(r => r.join(',')).join('\n');
  }

  // ---------- init ----------

  if(fileInput && fileNameEl){
    fileInput.addEventListener('change', ()=>{
      if(!fileInput.files || !fileInput.files.length){
        fileNameEl.textContent = 'No file selected';
      }else{
        fileNameEl.textContent = Array.from(fileInput.files).map(f=>f.name).join(', ');
      }
    });
  }

  if(runBtn){
    runBtn.addEventListener('click', runCff);
  }

  setStatus('waiting for CSV…','warn');
})();
