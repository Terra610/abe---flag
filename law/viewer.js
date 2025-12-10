// law/viewer.js
// Simple in-browser viewer for the Federal Authority Corpus.
// No network calls leave the GitHub Pages origin; everything is static JSON.

(function(){
  const byId = id => document.getElementById(id);

  // ---------------------------------------------------------------------------
  // Packs: keep in sync with law/model.json
  // ---------------------------------------------------------------------------
  const LAW_PACKS = [
    {
      id: 'title_49_transport',
      label: 'Title 49 — Transportation (Core FMCSA Scope)',
      file: 'law/title_49_transport.json',
      notes: 'Definitions, general FMCSA authority, and transportation scope.',
      kind: 'usc_cfr'
    },
    {
      id: 'title_49_mcsap_fmcsa',
      label: 'Title 49 — MCSAP & FMCSA Program Funding',
      file: 'law/title_49_mcsap_fmcsa.json',
      notes: 'Funding authority, program conditions, and matching requirements.',
      kind: 'funding'
    },
    {
      id: 'fmcsr_scope',
      label: 'FMCSR Scope Map (49 CFR 390.3 / 390.5)',
      file: 'law/fmcsr_scope.json',
      notes: 'Commercial vs non-commercial coverage, exclusions, and definitions.',
      kind: 'cfr'
    },
    {
      id: 'mcsap_rules',
      label: 'MCSAP Program Rules (49 CFR Part 350)',
      file: 'law/mcsap_rules.json',
      notes: 'State plan rules, off-mission limits, and spending conditions.',
      kind: 'funding'
    }
  ];

  // Doctrine slugs -> URLs (so we can add links in detail view)
  const DOCTRINE_LINKS = {
    constitutional_fidelity: 'doctrine/constitutional-fidelity.html',
    void_ab_initio:          'doctrine/void-ab-initio.html',
    abe_crra:                'doctrine/abe-crra.html'
  };

  const statusEl   = byId('law-status');
  const packListEl = byId('law-pack-list');
  const nodeListEl = byId('law-node-list');
  const detailEl   = byId('law-detail');
  const linksEl    = byId('law-detail-links');
  const searchEl   = byId('law-search');

  let currentPack   = null;
  let currentNodes  = [];
  let currentFilter = '';

  // ---------------------------------------------------------------------------
  // helpers
  // ---------------------------------------------------------------------------

  function setStatus(text, kind){
    if(!statusEl) return;
    statusEl.textContent = `Status: ${text}`;
    statusEl.className = 'law-status';
    if(kind === 'ok')   statusEl.classList.add('law-status-ok');
    if(kind === 'warn') statusEl.classList.add('law-status-warn');
    if(kind === 'bad')  statusEl.classList.add('law-status-bad');
  }

  function pillForType(type){
    const span = document.createElement('span');
    span.className = 'law-pill';
    if(type === 'usc'){
      span.classList.add('law-pill-usc');
      span.textContent = 'USC';
    } else if(type === 'cfr'){
      span.classList.add('law-pill-cfr');
      span.textContent = 'CFR';
    } else if(type === 'funding'){
      span.classList.add('law-pill-funding');
      span.textContent = 'Funding';
    } else {
      span.textContent = type || 'Other';
    }
    return span;
  }

  function matchesFilter(node){
    if(!currentFilter) return true;
    const f = currentFilter.toLowerCase();
    const hay = [
      node.citation,
      node.title,
      node.short_title,
      (node.programs || []).join(' '),
      (node.tags || []).join(' '),
      node.scope?.summary
    ].join(' ').toLowerCase();
    return hay.includes(f);
  }

  // ---------------------------------------------------------------------------
  // renderers
  // ---------------------------------------------------------------------------

  function renderPacks(){
    if(!packListEl) return;
    packListEl.innerHTML = '';
    LAW_PACKS.forEach(pack=>{
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'law-pack-btn';
      btn.textContent = pack.label;
      btn.dataset.packId = pack.id;

      btn.addEventListener('click', ()=>{
        Array.from(packListEl.querySelectorAll('.law-pack-btn'))
          .forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        loadPack(pack);
      });

      li.appendChild(btn);
      packListEl.appendChild(li);
    });
  }

  function renderNodes(){
    if(!nodeListEl) return;
    nodeListEl.innerHTML = '';
    if(!currentNodes.length){
      const li = document.createElement('li');
      li.className = 'law-node';
      const span = document.createElement('span');
      span.style.display = 'block';
      span.style.padding = '.5rem .6rem';
      span.textContent = currentPack
        ? 'No entries match this filter.'
        : 'Choose a pack to see entries.';
      li.appendChild(span);
      nodeListEl.appendChild(li);
      return;
    }

    currentNodes.forEach(node=>{
      const li = document.createElement('li');
      li.className = 'law-node';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.nodeId = node.id || '';
      const title = node.short_title || node.title || '(untitled)';
      const cite  = node.citation || '';

      btn.innerHTML = `
        <strong>${cite || 'No citation'}</strong> — ${title}
        <small>${(node.programs || []).join(', ')}</small>
      `;

      btn.addEventListener('click', ()=> renderDetail(node));
      li.appendChild(btn);
      nodeListEl.appendChild(li);
    });
  }

  function renderDetail(node){
    if(!detailEl) return;
    const lines = [];
    const cite = node.citation || '(no citation)';
    const title = node.title || node.short_title || '(untitled)';

    lines.push(`${cite}`);
    lines.push(title);
    lines.push('');

    if(node.scope && (node.scope.summary || node.scope.text)){
      lines.push('Scope:');
      if(node.scope.summary) lines.push('  ' + node.scope.summary);
      if(node.scope.text)    lines.push('  ' + node.scope.text);
      lines.push('');
    }

    if(node.preemption){
      lines.push('Preemption / Supremacy:');
      if(node.preemption.rule)  lines.push('  Rule: ' + node.preemption.rule);
      if(node.preemption.notes) lines.push('  Notes: ' + node.preemption.notes);
      lines.push('');
    }

    if(node.funding){
      lines.push('Funding / Conditions:');
      if(node.funding.program)  lines.push('  Program: ' + node.funding.program);
      if(node.funding.section)  lines.push('  Section: ' + node.funding.section);
      if(node.funding.notes)    lines.push('  Notes: ' + node.funding.notes);
      lines.push('');
    }

    if(node.tags && node.tags.length){
      lines.push('Tags: ' + node.tags.join(', '));
      lines.push('');
    }

    if(node.notes){
      lines.push('Notes:');
      lines.push(node.notes);
      lines.push('');
    }

    detailEl.innerHTML = '';
    const topRow = document.createElement('div');
    if(node.type){
      topRow.appendChild(pillForType(node.type));
    } else if(currentPack && currentPack.kind){
      topRow.appendChild(pillForType(currentPack.kind));
    }
    if(node.programs && node.programs.length){
      const p = document.createElement('span');
      p.className = 'law-pill';
      p.textContent = node.programs.join(', ');
      topRow.appendChild(p);
    }
    detailEl.appendChild(topRow);

    const pre = document.createElement('pre');
    pre.textContent = lines.join('\n');
    detailEl.appendChild(pre);

    // Doctrine links & integration hints
    if(linksEl){
      linksEl.innerHTML = '';
      const refs = node.doctrine_refs || [];
      if(refs.length){
        const span = document.createElement('span');
        span.textContent = 'Related doctrines: ';
        linksEl.appendChild(span);

        refs.forEach((slug,idx)=>{
          const href = DOCTRINE_LINKS[slug];
          const a = document.createElement('a');
          a.href = href || 'doctrine/index.html';
          a.textContent = slug.replace(/_/g,' ');
          if(idx > 0) linksEl.appendChild(document.createTextNode(' · '));
          linksEl.appendChild(a);
        });
      } else {
        linksEl.textContent = 'No doctrine references attached yet. You can still cross-check this rule from the Doctrines page.';
      }
    }
  }

  // ---------------------------------------------------------------------------
  // loading
  // ---------------------------------------------------------------------------

  async function loadPack(pack){
    try{
      currentPack  = pack;
      currentNodes = [];
      if(detailEl) detailEl.textContent = 'Loading…';
      if(nodeListEl) nodeListEl.innerHTML = '';
      setStatus(`loading ${pack.label}…`, 'warn');

      const res = await fetch(pack.file,{cache:'no-store'});
      if(!res.ok){
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();

      // Expect a top-level { nodes: [...] } or just [ ... ]
      const nodes = Array.isArray(data) ? data : (data.nodes || []);
      currentNodes = nodes.filter(n => matchesFilter(n));
      renderNodes();
      if(currentNodes[0]) renderDetail(currentNodes[0]);
      setStatus(`loaded ${nodes.length} entries from ${pack.label}`, 'ok');

      // Expose for other modules (Integration / CDA)
      try{
        window.ABE_LAW = window.ABE_LAW || {};
        window.ABE_LAW[pack.id] = {
          pack,
          nodes,
          getById: id => nodes.find(n => n.id === id || n.citation === id)
        };
      }catch(e){}
    }catch(err){
      console.error(err);
      setStatus(`failed to load ${pack.label}: ${err.message || err}`, 'bad');
      if(detailEl) detailEl.textContent = 'Could not load this authority pack.';
    }
  }

  // ---------------------------------------------------------------------------
  // init
  // ---------------------------------------------------------------------------

  renderPacks();
  setStatus('choose a pack to begin.', 'warn');

  if(searchEl){
    searchEl.addEventListener('input', ()=>{
      currentFilter = searchEl.value.trim();
      if(!currentPack || !currentNodes.length){
        // if nothing loaded yet, filter applies once a pack is clicked
        return;
      }
      // Re-filter from the underlying full list exposed via ABE_LAW
      const store = window.ABE_LAW && window.ABE_LAW[currentPack.id];
      const allNodes = store && store.nodes ? store.nodes : currentNodes;
      currentNodes = allNodes.filter(n => matchesFilter(n));
      renderNodes();
    });
  }

})();
