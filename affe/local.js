// affe/local.js
// AFFE — American Funding & Fidelity Explorer
// Reads a CFF artifact (localStorage or uploaded JSON) and visualizes ON/OFF/UNCLEAR funding.

(function(){
  const byId = id => document.getElementById(id);

  const fileInput  = byId('affe-file');
  const fileNameEl = byId('affe-file-name');
  const statusEl   = byId('affe-status');
  const chartEl    = byId('affe-chart');
  const tableWrap  = byId('affe-table-container');

  let chart = null;
  let artifact = null;

  function setStatus(text, kind){
    if(!statusEl) return;
    statusEl.textContent = 'Status: ' + text;
    statusEl.className = 'affe-status';
    if(kind === 'ok')   statusEl.classList.add('affe-status-ok');
    if(kind === 'warn') statusEl.classList.add('affe-status-warn');
    if(kind === 'bad')  statusEl.classList.add('affe-status-bad');
  }

  function fmtMoney(n){
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

  function ensureArray(val){
    if(Array.isArray(val)) return val;
    if(val == null) return [];
    return [val];
  }

  function aggregateByCategory(rows){
    const totals = {
      ON_MISSION:{count:0,amount:0},
      OFF_MISSION:{count:0,amount:0},
      UNCLEAR:{count:0,amount:0}
    };
    rows.forEach(r=>{
      const cat = (r.spend_category_code || 'UNCLEAR').toUpperCase();
      const key = totals[cat] ? cat : 'UNCLEAR';
      totals[key].count += 1;
      totals[key].amount += Number(r.amount_usd || 0);
    });
    return totals;
  }

  function aggregateByProgram(rows){
    const map = new Map();
    rows.forEach(r=>{
      const key = (r.program_name || 'unknown').trim() || 'unknown_program';
      const cat = (r.spend_category_code || 'UNCLEAR').toUpperCase();
      const amt = Number(r.amount_usd || 0);

      if(!map.has(key)){
        map.set(key,{
          program_name: key,
          ON_MISSION:0,
          OFF_MISSION:0,
          UNCLEAR:0,
          total:0
        });
      }
      const obj = map.get(key);
      const slot = (cat === 'ON_MISSION' || cat === 'OFF_MISSION') ? cat : 'UNCLEAR';
      obj[slot] += amt;
      obj.total += amt;
    });
    return Array.from(map.values());
  }

  function renderChart(totals){
    if(!chartEl) return;
    const ctx = chartEl.getContext('2d');
    if(chart) chart.destroy();

    const labels = ['ON_MISSION','OFF_MISSION','UNCLEAR'];
    const data = labels.map(l => totals[l].amount);

    chart = new Chart(ctx,{
      type:'bar',
      data:{
        labels,
        datasets:[{
          label:'Amount (USD)',
          data
        }]
      },
      options:{
        responsive:true,
        plugins:{
          legend:{display:false},
          tooltip:{
            callbacks:{
              label:(ctx)=>fmtMoney(ctx.raw)
            }
          }
        },
        scales:{
          y:{
            ticks:{
              callback:(v)=>fmtMoney(v)
            }
          }
        }
      }
    });
  }

  function renderTable(programs){
    if(!tableWrap) return;
    tableWrap.innerHTML = '';

    if(!programs.length){
      const div = document.createElement('div');
      div.textContent = 'No rows found in CFF artifact.';
      tableWrap.appendChild(div);
      return;
    }

    // Sort by OFF_MISSION amount desc and take top 20
    const sorted = programs
      .slice()
      .sort((a,b)=>b.OFF_MISSION - a.OFF_MISSION)
      .slice(0,20);

    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const tbody = document.createElement('tbody');

    const headRow = document.createElement('tr');
    ['program_name','ON_MISSION','OFF_MISSION','UNCLEAR','total'].forEach(h=>{
      const th = document.createElement('th');
      th.textContent = h;
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);

    sorted.forEach(p=>{
      const tr = document.createElement('tr');
      if(p.OFF_MISSION > 0) tr.classList.add('affe-off');
      else if(p.UNCLEAR > 0) tr.classList.add('affe-unclear');
      else tr.classList.add('affe-good');

      const cells = [
        p.program_name,
        fmtMoney(p.ON_MISSION),
        fmtMoney(p.OFF_MISSION),
        fmtMoney(p.UNCLEAR),
        fmtMoney(p.total)
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
    tableWrap.appendChild(table);
  }

  function tryHydrateFromLocal(){
    try{
      const raw = localStorage.getItem('ABE_CFF_ARTIFACT_V1');
      if(!raw){
        setStatus('no local CFF artifact yet — upload one or run CFF first.','warn');
        return null;
      }
      const art = JSON.parse(raw);
      setStatus('loaded CFF artifact from this browser (ABE_CFF_ARTIFACT_V1).','ok');
      return art;
    }catch(e){
      console.warn('AFFE local artifact error:', e);
      setStatus('found a local value but could not parse it as CFF artifact.','bad');
      return null;
    }
  }

  function applyArtifact(art){
    artifact = art;
    const sample = ensureArray(art.sample_rows || []);
    const totals = art.totals || aggregateByCategory(sample);
    const programs = aggregateByProgram(sample);

    renderChart(totals);
    renderTable(programs);
  }

  async function handleFileUpload(){
    const file = fileInput && fileInput.files && fileInput.files[0];
    if(!file){
      setStatus('no file selected.','bad');
      return;
    }
    fileNameEl.textContent = file.name;

    const text = await new Promise((resolve, reject)=>{
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Could not read JSON file'));
      reader.onload  = () => resolve(String(reader.result || ''));
      reader.readAsText(file);
    });

    try{
      const art = JSON.parse(text);
      setStatus('using uploaded CFF artifact json.','ok');
      applyArtifact(art);
    }catch(e){
      console.error(e);
      setStatus('uploaded file could not be parsed as JSON.','bad');
    }
  }

  // ---------- init ----------

  (function init(){
    if(fileInput && fileNameEl){
      fileInput.addEventListener('change', ()=>{
        if(!fileInput.files || !fileInput.files.length){
          fileNameEl.textContent = 'No file selected';
        }else{
          fileNameEl.textContent = fileInput.files[0].name;
          handleFileUpload();
        }
      });
    }

    const art = tryHydrateFromLocal();
    if(art){
      applyArtifact(art);
    }
  })();
})();
