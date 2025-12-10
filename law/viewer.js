// law/viewer.js
// Lightweight viewer for A.B.E. law packs.
// All data is static JSON in this repo. No user data, no network writes.

(function(){
  const byId = id => document.getElementById(id);

  // --- Pack catalog ---------------------------------------------------------

  // category: 'statutes' | 'fmcsr' | 'mcsap'
  const LAW_PACKS = [
    {
      id: 'title_49_transport',
      label: 'Title 49 — Transportation Statutes',
      file: 'law/title_49_transport.json',
      category: 'statutes',
      notes: 'Baseline federal transportation and commercial authority.'
    },
    {
      id: 'fmcsr_scope',
      label: 'FMCSR Scope & Definitions',
      file: 'law/fmcsr_scope.json',
      category: 'fmcsr',
      notes: 'Who FMCSRs actually apply to (and who they do not).'
    },
    {
      id: 'mcsap_rules',
      label: 'MCSAP Funding & Conditions',
      file: 'law/mcsap_rules.json',
      category: 'mcsap',
      notes: 'How enforcement dollars are supposed to be used.'
    },
    {
      id: 'title_49_mcsap_fmcsa',
      label: 'Title 49 — MCSAP & FMCSA Provisions',
      file: 'law/title_49_mcsap_fmcsa.json',
      category: 'mcsap',
      notes: 'Statutory backbone for MCSAP and FMCSA grant programs.'
    }
  ];

  // --- DOM refs -------------------------------------------------------------

  const tabsEl        = byId('law-tabs');
  const packListEl    = byId('law-pack-list');
  const nodeListEl    = byId('law-node-list');
  const searchInput   = byId('law-search');
  const searchCountEl = byId('law-search-count');
  const statusEl      = byId('law-status');

  const detailMetaEl  = byId('law-detail-meta');
  const detailJsonEl  = byId('law-detail-json');
  const btnCopy       = byId('law-btn-copy');
  const btnCda        = byId('law-btn-cda');
  const btnDoctrine   = byId('law-btn-doctrine');

  // --- State ----------------------------------------------------------------

  let currentFilter = 'all';
  let currentPackId = null;
  let currentNodeId = null;

  const packData = {};   // packId -> array of nodes
  const packLoaded = {}; // packId -> bool

  // --- helpers --------------------------------------------------------------

  function setStatus(text, kind){
    if(!statusEl) return;
    statusEl.textContent = 'Status: ' + text;
    statusEl.className = 'status-line';
    if(kind === 'ok')   statusEl.classList.add('status-ok');
    if(kind === 'warn') statusEl.classList.add('status-warn');
    if(kind === 'err')  statusEl.classList.add('status-err');
  }

  function safeArray(v){
    return Array.isArray(v) ? v : [];
  }

  function textMatch(node, q){
    if(!q) return true;
    q = q.toLowerCase();
    const fields = [
      node.label,
      node.citation,
      node.short_summary,
      node.description,
      (node.scope && node.scope.summary),
      (node.authority && node.authority.source)
    ];
    return fields.some(f => typeof f === 'string' && f.toLowerCase().includes(q));
  }

  function prettyType(t){
    if(!t) return 'rule';
    if(typeof t !== 'string') return String(t);
    return t.replace(/_/g,' ');
  }

  function prettyLevel(l){
    if(!l) return '';
    if(typeof l !== 'string') return String(l);
    return l.replace(/_/g,' ');
  }

  function copyToClipboard(text){
    try{
      if(navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(text);
        return;
      }
    }catch(e){}
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.top = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try{ document.execCommand('copy'); } catch(e){}
    ta.remove();
  }

  // --- render: packs --------------------------------------------------------

  function renderPacks(){
    if(!packListEl) return;

    packListEl.innerHTML = '';
    const visible = LAW_PACKS.filter(p =>
      currentFilter === 'all' ? true : p.category === currentFilter
    );

    if(!visible.length){
      const li = document.createElement('li');
      li.textContent = 'No packs for this filter yet.';
      li.className = 'pack-item';
      packListEl.appendChild(li);
      return;
    }

    for(const pack of visible){
      const li = document.createElement('li');
      li.className = 'pack-item';
      li.dataset.packId = pack.id;
      if(pack.id === currentPackId){
        li.classList.add('pack-item-active');
      }

      const label = document.createElement('div');
      label.className = 'pack-label';
      label.textContent = pack.label;

      const notes = document.createElement('div');
      notes.className = 'pack-notes';
      notes.textContent = pack.notes || '';

      li.appendChild(label);
      li.appendChild(notes);
      packListEl.appendChild(li);
    }
  }

  // --- fetch a pack ---------------------------------------------------------

  async function loadPack(packId){
    if(packLoaded[packId]) return packData[packId] || [];

    const pack = LAW_PACKS.find(p => p.id === packId);
    if(!pack){
      setStatus('unknown pack: ' + packId, 'err');
      return [];
    }

    try{
      setStatus(`loading ${pack.label}…`, 'warn');
      const resp = await fetch(pack.file, { cache: 'no-store' });
      if(!resp.ok){
        setStatus(`could not load ${pack.file}`, 'err');
        return [];
      }
      const json = await resp.json();
      const arr = Array.isArray(json) ? json : (Array.isArray(json.nodes) ? json.nodes : []);
      packData[packId] = arr;
      packLoaded[packId] = true;
      setStatus(`loaded ${pack.label} (${arr.length} nodes)`, 'ok');
      return arr;
    }catch(err){
      console.error(err);
      setStatus('error loading ' + pack.file, 'err');
      packLoaded[packId] = true;
      packData[packId] = [];
      return [];
    }
  }

  // --- render: nodes --------------------------------------------------------

  async function renderNodes(packId){
    if(!nodeListEl) return;
    nodeListEl.innerHTML = '';
    currentNodeId = null;

    if(!packId){
      searchCountEl.textContent = '0 nodes';
      return;
    }

    const nodes = await loadPack(packId);
    const q = (searchInput && searchInput.value || '').trim();
    const filtered = nodes.filter(n => textMatch(n, q));

    searchCountEl.textContent = `${filtered.length} node${filtered.length===1?'':'s'}`;

    if(!filtered.length){
      const li = document.createElement('li');
      li.textContent = q ? 'No nodes match this search.' : 'No nodes in this pack yet.';
      li.className = 'node-item';
      nodeListEl.appendChild(li);
      return;
    }

    for(const n of filtered){
      const li = document.createElement('li');
      li.className = 'node-item';
      li.dataset.nodeId = n.id || '';

      const label = document.createElement('div');
      label.className = 'node-label';
      label.textContent = n.label || '(unnamed rule)';

      const meta = document.createElement('div');
      meta.className = 'node-meta';

      const bits = [];
      if(n.citation) bits.push(n.citation);
      if(n.type) bits.push(prettyType(n.type));
      if(n.level) bits.push(prettyLevel(n.level));
      meta.textContent = bits.join(' · ');

      li.appendChild(label);
      li.appendChild(meta);

      li.addEventListener('click', () => {
        selectNode(n, packId);
        for(const el of nodeListEl.querySelectorAll('.node-item-active')){
          el.classList.remove('node-item-active');
        }
        li.classList.add('node-item-active');
      });

      nodeListEl.appendChild(li);
    }
  }

  // --- detail view ----------------------------------------------------------

  function selectNode(node, packId){
    currentNodeId = node.id || null;

    const type  = prettyType(node.type);
    const level = prettyLevel(node.level);
    const pack  = LAW_PACKS.find(p => p.id === packId);

    const pills = [];

    if(type){
      pills.push(`<span class="pill pill-type">${type}</span>`);
    }
    if(level){
      pills.push(`<span class="pill pill-level">${level}</span>`);
    }
    if(node.citation){
      pills.push(`<span class="pill pill-src">${node.citation}</span>`);
    }
    if(pack){
      pills.push(`<span class="pill">${pack.label}</span>`);
    }

    const doctr = safeArray(node.doctrine_refs);
    const doctrText = doctr.length
      ? `Linked doctrines: ${doctr.join(', ')}`
      : 'No explicit doctrine links set in this node.';

    detailMetaEl.innerHTML = `
      <div style="margin-bottom:.25rem;">
        ${pills.join(' ')}
      </div>
      <div class="small-note">
        ${node.short_summary || node.description || 'No summary provided yet.'}
      </div>
      <div class="small-note" style="margin-top:.25rem;">
        ${doctrText}
      </div>
    `;

    detailJsonEl.textContent = JSON.stringify(node, null, 2);

    // Enable buttons
    if(btnCopy){
      btnCopy.disabled = false;
    }
    if(btnCda){
      btnCda.disabled = false;
    }
    if(btnDoctrine){
      btnDoctrine.removeAttribute('disabled');
      // Very light convention: if first doctrine ref looks like a slug,
      // link to law/doctrines/<slug>.html; otherwise fall back to index.
      if(doctr.length && typeof doctr[0] === 'string'){
        const slug = doctr[0]
          .toLowerCase()
          .replace(/[^a-z0-9]+/g,'-')
          .replace(/^-+|-+$/g,'');
        btnDoctrine.href = `law/doctrines/${slug}.html`;
      }else{
        btnDoctrine.href = 'law/doctrines/index.html';
      }
    }
  }

  // --- events ---------------------------------------------------------------

  function initTabs(){
    if(!tabsEl) return;
    tabsEl.addEventListener('click', (ev)=>{
      const btn = ev.target.closest('.tab');
      if(!btn) return;
      const f = btn.getAttribute('data-filter') || 'all';
      currentFilter = f;

      for(const el of tabsEl.querySelectorAll('.tab')){
        el.classList.toggle('tab-active', el === btn);
      }

      // Reset current pack when filter changes
      currentPackId = null;
      renderPacks();
      searchInput && (searchInput.value = '');
      searchCountEl.textContent = '0 nodes';
      nodeListEl.innerHTML = '';

      // auto-select first pack in this filter
      const first = LAW_PACKS.find(p =>
        currentFilter === 'all' ? true : p.category === currentFilter
      );
      if(first){
        currentPackId = first.id;
        renderPacks();
        renderNodes(currentPackId);
      }
    });
  }

  function initPackClicks(){
    if(!packListEl) return;
    packListEl.addEventListener('click', (ev)=>{
      const li = ev.target.closest('.pack-item');
      if(!li || !li.dataset.packId) return;
      currentPackId = li.dataset.packId;

      for(const el of packListEl.querySelectorAll('.pack-item')){
        el.classList.toggle('pack-item-active', el === li);
      }

      searchInput && (searchInput.value = '');
      renderNodes(currentPackId);
    });
  }

  function initSearch(){
    if(!searchInput) return;
    searchInput.addEventListener('input', ()=>{
      if(!currentPackId) return;
      renderNodes(currentPackId);
    });
  }

  function initButtons(){
    if(btnCopy){
      btnCopy.addEventListener('click', ()=>{
        if(!currentNodeId) return;
        copyToClipboard(detailJsonEl.textContent || '');
      });
    }

    if(btnCda){
      btnCda.addEventListener('click', ()=>{
        if(!currentNodeId || !currentPackId) return;
        try{
          const nodes = packData[currentPackId] || [];
          const node = nodes.find(n => n.id === currentNodeId);
          if(!node) return;
          const payload = {
            from: 'LAW_VIEWER',
            node,
            at: new Date().toISOString()
          };
          localStorage.setItem('ABE_LAW_TO_CDA', JSON.stringify(payload));
          alert('Node shape stored for CDA. Open the CDA page and it can read ABE_LAW_TO_CDA from this browser.');
        }catch(e){
          console.warn('Could not stash node for CDA:', e);
        }
      });
    }
  }

  // --- boot -----------------------------------------------------------------

  function boot(){
    if(!packListEl || !nodeListEl){
      console.warn('law/viewer.js: required DOM elements missing');
      return;
    }

    initTabs();
    initPackClicks();
    initSearch();
    initButtons();

    // Initial render
    renderPacks();

    // Auto-select first pack in "all" filter
    const first = LAW_PACKS[0];
    if(first){
      currentPackId = first.id;
      renderPacks();
      renderNodes(currentPackId);
    }else{
      setStatus('no law packs configured yet', 'warn');
    }
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', boot);
  }else{
    boot();
  }

})();
