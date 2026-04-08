// integration/local.js
// Client-side integrity checker for the A.B.E. engine.
// No hashes or user data ever leave this browser.

(function(){
  const byId = id => document.getElementById(id);

  const lastCheckEl = byId('int-last-check');
  const countModEl  = byId('int-count-mod');
  const countOkEl   = byId('int-count-ok');
  const countWarnEl = byId('int-count-warn');
  const countBadEl  = byId('int-count-bad');
  const lawPillEl   = byId('int-law-pill');
  const lawNoteEl   = byId('int-law-note');
  const modListEl   = byId('int-mod-list');
  const detailEl    = byId('int-detail');

  let state = {
    modules: {},     // key -> module summary
    selected: null   // key
  };

  // ---------- helpers ----------

  function nowPretty(){
    const d = new Date();
    return d.toLocaleString(undefined, {
      year:'numeric', month:'2-digit', day:'2-digit',
      hour:'2-digit', minute:'2-digit', second:'2-digit'
    });
  }

  async function sha256OfResponse(res){
    const buf  = await res.arrayBuffer();
    const hash = await crypto.subtle.digest('SHA-256', buf);
    const bytes = new Uint8Array(hash);
    return Array.from(bytes).map(b=>b.toString(16).padStart(2,'0')).join('');
  }

  function summarizeModule(key, mapEntry, files){
    // files: [{ path, expected, actual, ok }]
    const tracked = files.length;
    const mismatches = files.filter(f=>f.ok === false).length;
    const unresolved = files.filter(f=>f.ok == null).length;

    let status = 'untracked';
    if(tracked === 0){
      status = 'untracked';
    } else if(mismatches > 0){
      status = 'mismatch';
    } else if(unresolved > 0){
      status = 'partial';
    } else {
      status = 'ok';
    }

    return {
      key,
      name: (mapEntry && (mapEntry.long_name || mapEntry.name)) || key,
      map: mapEntry || null,
      files,
      status
    };
  }

  function statusLabel(status){
    if(status === 'ok')        return 'verified';
    if(status === 'mismatch')  return 'mismatch';
    if(status === 'partial')   return 'partial / unknown';
    return 'untracked';
  }

  function statusClass(status){
    if(status === 'ok')        return 'int-mod-status int-mod-status-ok';
    if(status === 'mismatch')  return 'int-mod-status int-mod-status-mismatch';
    if(status === 'partial')   return 'int-mod-status int-mod-status-partial';
    return 'int-mod-status';
  }

  // ---------- render ----------

  function renderSummary(){
    const modules = Object.values(state.modules);
    const total   = modules.length;
    const ok      = modules.filter(m=>m.status === 'ok').length;
    const warn    = modules.filter(m=>m.status === 'partial').length;
    const bad     = modules.filter(m=>m.status === 'mismatch').length;

    if(lastCheckEl) lastCheckEl.textContent = `Last check: ${nowPretty()}`;
    if(countModEl)  countModEl.textContent  = `Modules: ${total || '—'}`;
    if(countOkEl)   countOkEl.textContent   = `Verified: ${ok}`;
    if(countWarnEl) countWarnEl.textContent = `Partial: ${warn}`;
    if(countBadEl)  countBadEl.textContent  = `Mismatch: ${bad}`;
  }

  function renderModules(){
    if(!modListEl) return;
    modListEl.innerHTML = '';

    const modules = Object.values(state.modules).sort((a,b)=>a.key.localeCompare(b.key));

    modules.forEach(m=>{
      const div = document.createElement('button');
      div.type = 'button';
      div.className = 'int-mod';
      if(state.selected === m.key) div.classList.add('active');

      const name = document.createElement('div');
      name.className = 'int-mod-name';
      name.textContent = m.name;
      div.appendChild(name);

      const status = document.createElement('div');
      status.className = statusClass(m.status);
      status.innerHTML = `Status: <span>${statusLabel(m.status)}</span>`;
      div.appendChild(status);

      const small = document.createElement('div');
      small.className = 'int-mod-status';
      small.style.marginTop = '.15rem';
      const tracked = m.files.length;
      const mismatches = m.files.filter(f=>f.ok === false).length;
      small.textContent = tracked
        ? `${tracked} file(s) tracked · mismatches: ${mismatches}`
        : 'Not yet tracked in ledger.json';
      div.appendChild(small);

      div.addEventListener('click', ()=>{
        state.selected = m.key;
        renderModules();
        renderDetail();
      });

      modListEl.appendChild(div);
    });
  }

  function renderDetail(){
    if(!detailEl) return;
    const m = state.modules[state.selected];
    if(!m){
      detailEl.textContent = 'Select a module on the left to see details.';
      return;
    }

    const lines = [];
    lines.push(`Module: ${m.key}`);
    if(m.map && (m.map.long_name || m.map.name)){
      lines.push(`Name:   ${m.map.long_name || m.map.name}`);
    }
    if(m.map && m.map.purpose){
      lines.push('');
      lines.push('Purpose:');
      lines.push('  ' + m.map.purpose);
    }

    lines.push('');
    lines.push(`Status: ${statusLabel(m.status)}`);
    lines.push('');

    if(!m.files.length){
      lines.push('No files are tracked for this module in system/ledger.json yet.');
    } else {
      lines.push('Tracked files:');
      m.files.forEach(f=>{
        lines.push(`- ${f.path}`);
        lines.push(`    expected:   ${f.expected || '(none)'}`);
        lines.push(`    actual:     ${f.actual || '(not loaded)'}`);
        lines.push(`    result:     ${f.ok === null ? 'not checked' : (f.ok ? 'ok' : 'MISMATCH')}`);
      });
    }

    if(m.key === 'law'){
      lines.push('');
      lines.push('LAW corpus note:');
      lines.push('  This module references law/model.json and the authority packs it lists.');
      lines.push('  Each pack (Title 49, MCSAP/FMCSA, FMCSR scope, MCSAP rules) should be tracked');
      lines.push('  in system/ledger.json to keep the constitutional rails auditable.');
    }

    detailEl.textContent = lines.join('\n');
  }

  function renderLawExtras(lawModule, lawModel){
    if(!lawPillEl || !lawNoteEl) return;
    if(!lawModule){
      lawPillEl.style.display = 'none';
      lawNoteEl.textContent = 'LAW corpus note: No LAW module entry found in system/map.json yet.';
      return;
    }

    const packs = (lawModel && Array.isArray(lawModel.packs)) ? lawModel.packs.length : null;

    lawPillEl.style.display = 'inline-flex';
    lawPillEl.textContent = `LAW corpus: ${statusLabel(lawModule.status)}`;

    if(!lawModel){
      lawNoteEl.textContent =
        'LAW corpus note: law/model.json not found. The engine will still run, ' +
        'but CDA and CFF have less authority context. Commit law/model.json to complete the rails.';
      return;
    }

    const trackedFiles = lawModule.files.length;
    const msg = [
      `LAW corpus packs in model.json: ${packs ?? 'unknown'}.`,
      `Tracked LAW files in ledger.json: ${trackedFiles}.`,
      `Status: ${statusLabel(lawModule.status)}.`,
      '',
      'Open the Law viewer to see the controlling USC, CFR, and MCSAP/FMCSA rules:',
      'abe---flag/law/index.html'
    ].join(' ');

    lawNoteEl.textContent = msg;
  }

  // ---------- load ----------

  async function loadJson(path){
    const res = await fetch(path,{cache:'no-store'});
    if(!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
    return res.json();
  }

  async function computeModuleState(){
    const [map, ledger] = await Promise.all([
      loadJson('system/map.json'),
      loadJson('system/ledger.json')
    ]);

    const modules = map.modules || map || {};
    const ledgerFiles = (ledger && ledger.files) || [];

    // Group ledger entries by module key (first path segment)
    const byMod = {};
    ledgerFiles.forEach(entry=>{
      const path = entry.path || '';
      const modKey = path.split('/')[0] || 'root';
      if(!byMod[modKey]) byMod[modKey] = [];
      byMod[modKey].push({
        path,
        expected: entry.sha256 || null,
        actual:   null,
        ok:       null
      });
    });

    // For each tracked file, recompute hash
    for(const modKey of Object.keys(byMod)){
      for(const file of byMod[modKey]){
        try{
          const res = await fetch(file.path,{cache:'no-store'});
          if(!res.ok){
            file.actual = null;
            file.ok = null;
            continue;
          }
          const digest = await sha256OfResponse(res);
          file.actual = digest;
          file.ok = file.expected ? (digest === file.expected) : null;
        }catch(e){
          file.actual = null;
          file.ok = null;
        }
      }
    }

    const out = {};

    Object.keys(modules).forEach(key=>{
      const mEntry = modules[key];
      const files  = byMod[key] || [];
      out[key] = summarizeModule(key, mEntry, files);
    });

    // Also include any ledger groups that don't have a map entry
    Object.keys(byMod).forEach(key=>{
      if(out[key]) return;
      out[key] = summarizeModule(key, null, byMod[key]);
    });

    return out;
  }

  async function init(){
    try{
      const [modules, lawModel] = await Promise.all([
        computeModuleState(),
        // law/model.json might not exist yet; swallow errors.
        (async()=>{
          try{ return await loadJson('law/model.json'); }
          catch(_){ return null; }
        })()
      ]);

      state.modules = modules;
      // default selection: Intake or first alphabetically
      state.selected = modules.intake ? 'intake' : Object.keys(modules).sort()[0] || null;

      renderSummary();
      renderModules();
      renderDetail();

      const lawMod = modules.law || null;
      renderLawExtras(lawMod, lawModel);

    }catch(err){
      console.error(err);
      if(detailEl){
        detailEl.textContent =
          'Integration failed to load map or ledger.\n\n' +
          'Check that system/map.json and system/ledger.json are present and valid JSON.\n\n' +
          'Error: ' + (err.message || String(err));
      }
      if(lawNoteEl){
        lawNoteEl.textContent = 'LAW corpus note: Integration could not complete due to a load error.';
      }
    }
  }

  // Fire immediately when script loads
  init();

})();
