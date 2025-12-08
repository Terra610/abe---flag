// law/viewer.js
// Lightweight viewer for A.B.E. law corpus packs.
// Loads local JSON files, no network calls beyond same-origin static fetches.

(function(){
  const byId = id => document.getElementById(id);

  // TODO: add more packs here as you create them.
  // Each pack is a JSON file containing an array of authority nodes
  // that conform to law_schema.json.
  const LAW_PACKS = [
    {
      id: 'title_49_transport',
      label: 'Title 49 — Transportation',
      file: 'law/title_49_transport.json',
      notes: 'FMCSA scope (commercial vs non-commercial), MCSAP funding, and related CFR parts.'
    }
    // e.g.,
    // { id: 'title_23_highway', label: 'Title 23 — Highway & Safety Funding', file: 'law/title_23_highway.json', notes: '23 USC 402, 154, etc.' }
    // { id: 'title_42_cps', label: 'Title 42 — Child Welfare / CPS', file: 'law/title_42_cps.json', notes: 'IV-E, 45 CFR 1355/1356, etc.' }
  ];

  const statusEl   = byId('law-status');
  const packListEl = byId('law-pack-list');
  const nodeListEl = byId('law-node-list');
  const detailEl   = byId('law-detail');
  const searchEl   = byId('law-search');
  const domainSel  = byId('law-domain-filter');
  const kindSel    = byId('law-kind-filter');

  let allNodes = [];    // flattened list of nodes with pack metadata
  let packMeta = {};    // id -> { hash, nodeCount, ... }

  function setStatus(msg, kind){
    if(!statusEl) return;
    statusEl.textContent = msg;
    statusEl.className = 'law-status';
    if(kind === 'ok')   statusEl.classList.add('law-status-ok');
    if(kind === 'warn') statusEl.classList.add('law-status-warn');
    if(kind === 'err')  statusEl.classList.add('law-status-err');
  }

  function safe(val, fallback){
    if(val === null || val === undefined) return (fallback === undefined ? '' : fallback);
    return val;
  }

  async function hashString(str){
    if(!window.crypto || !crypto.subtle) return null;
    const enc = new TextEncoder();
    const data = enc.encode(str);
    const hash = await crypto.subtle.digest('SHA-256', data);
    const bytes = new Uint8Array(hash);
    return Array.from(bytes).map(b=>b.toString(16).padStart(2,'0')).join('');
  }

  function buildDomainOptions(nodes){
    const domains = new Set();
    nodes.forEach(n => {
      if(n.domain) domains.add(n.domain);
    });
    const sorted = Array.from(domains).sort();
    domainSel.innerHTML = '<option value="">All domains</option>' + 
      sorted.map(d => `<option value="${d}">${d}</option>`).join('');
  }

  function renderPackList(){
    if(!packListEl) return;
    if(!LAW_PACKS.length){
      packListEl.innerHTML = '<div class="law-empty">No law packs registered yet. Add JSON files to <code>law/</code> and list them in <code>LAW_PACKS</code>.</div>';
      return;
    }
    const parts = [];
    for(const pack of LAW_PACKS){
      const meta = packMeta[pack.id] || {};
      const hashShort = meta.hash ? meta.hash.slice(0, 12) + '…' : null;
      const hashLine = hashShort
        ? `<span class="law-small">SHA-256: <span class="law-hash">${hashShort}</span></span>`
        : `<span class="law-small">Hash: not computed yet</span>`;
      const countLine = `<span class="law-small">${meta.nodeCount || 0} nodes loaded</span>`;

      parts.push(`
        <div class="law-pack">
          <strong>${pack.label}</strong>
          <small>${safe(pack.notes,'')}</small>
          <div>${countLine}</div>
          <div>${hashLine}</div>
        </div>
      `);
    }
    packListEl.innerHTML = parts.join('');
  }

  function kindClass(kind){
    if(kind === 'statute')     return 'law-node-item-kind law-node-item-kind-statute';
    if(kind === 'regulation')  return 'law-node-item-kind law-node-item-kind-regulation';
    if(kind === 'funding')     return 'law-node-item-kind law-node-item-kind-funding';
    if(kind === 'constitution')return 'law-node-item-kind law-node-item-kind-constitution';
    return 'law-node-item-kind';
  }

  function nodeTitle(node){
    if(node.usc_full_cite) return node.usc_full_cite;
    if(node.cfr_full_cite) return node.cfr_full_cite;
    if(node.id)            return node.id;
    return '(unnamed authority)';
  }

  function nodeMetaLine(node){
    const bits = [];
    if(node.domain) bits.push(node.domain);
    if(node.usc_title) bits.push(`USC Title ${node.usc_title}`);
    if(node.cfr_title) bits.push(`CFR Title ${node.cfr_title}`);
    if(node.population && node.population.length){
      bits.push(`pop: ${node.population.join(', ')}`);
    }
    return bits.join(' · ');
  }

  function applyFilters(){
    const q = (searchEl && searchEl.value || '').toLowerCase();
    const d = (domainSel && domainSel.value) || '';
    const k = (kindSel && kindSel.value) || '';

    return allNodes.filter(n => {
      if(d && n.domain !== d) return false;
      if(k && n.kind !== k)  return false;
      if(q){
        const hay = [
          n.id,
          n.usc_full_cite,
          n.cfr_full_cite,
          n.domain,
          (n.authority_granted || []).join(' '),
          (n.authority_limited || []).join(' ')
        ].join(' ').toLowerCase();
        if(!hay.includes(q)) return false;
      }
      return true;
    });
  }

  function renderNodeList(){
    if(!nodeListEl) return;
    const nodes = applyFilters();
    if(!nodes.length){
      nodeListEl.innerHTML = '<div class="law-empty">No authority nodes match the current filters.</div>';
      detailEl.innerHTML = '<p class="law-empty">Select a statute, regulation, or funding node on the left to see its details here.</p>';
      return;
    }
    const parts = nodes.map((n, idx) => `
      <div class="law-node-item" data-node-idx="${idx}">
        <div>
          <span class="${kindClass(n.kind)}">${n.kind || 'node'}</span>
          <span class="law-node-item-title">${nodeTitle(n)}</span>
        </div>
        <div class="law-node-item-meta">${nodeMetaLine(n)}</div>
      </div>
    `);
    nodeListEl.innerHTML = parts.join('');
  }

  function renderNodeDetail(node){
    if(!detailEl) return;
    if(!node){
      detailEl.innerHTML = '<p class="law-empty">Select a statute, regulation, or funding node to see its details here.</p>';
      return;
    }

    const pops = (node.population || []).map(p => `<span class="law-pill law-pill-pop">${p}</span>`).join(' ');
    const domains = node.domain ? `<span class="law-pill law-pill-domain">${node.domain}</span>` : '';
    const pre = node.preemption || {};
    const preBlock = pre.type && pre.type !== 'none'
      ? `<span class="law-pill law-pill-preemption">Preemption: ${pre.type}</span>`
      : '';

    const authGranted = (node.authority_granted || []).length
      ? `<ul>${node.authority_granted.map(a=>`<li>${a}</li>`).join('')}</ul>`
      : '<p class="law-small">No explicit authority_granted entries defined yet.</p>';

    const authLimited = (node.authority_limited || []).length
      ? `<ul>${node.authority_limited.map(a=>`<li>${a}</li>`).join('')}</ul>`
      : '<p class="law-small">No explicit authority_limited entries defined yet.</p>';

    const relCfr = (node.related_cfr || []).length
      ? `<ul>${node.related_cfr.map(r=>`<li>${r.cfr_full_cite || ('Title ' + r.cfr_title + ' Part ' + r.cfr_part)} — ${safe(r.purpose,'')}</li>`).join('')}</ul>`
      : '<p class="law-small">No related CFR entries defined.</p>';

    const funds = (node.funding_links || []).length
      ? `<ul>${node.funding_links.map(f=>`<li><strong>${f.program}</strong>${f.usc_authority ? ' · ' + f.usc_authority : ''}<br><span class="law-small">${(f.conditions||[]).join(' · ')}</span></li>`).join('')}</ul>`
      : '<p class="law-small">No funding_links defined for this node.</p>';

    const preCases = (pre.related_cases || []).length
      ? `<p class="law-small">Cases: ${pre.related_cases.join(', ')}</p>`
      : '';

    detailEl.innerHTML = `
      <h3>${nodeTitle(node)}</h3>
      <p class="law-small">
        Kind: ${node.kind || 'node'}
        ${domains}
        ${preBlock}
      </p>
      <p class="law-small">
        ${node.usc_full_cite ? 'USC: ' + node.usc_full_cite + '<br>' : ''}
        ${node.cfr_full_cite ? 'CFR: ' + node.cfr_full_cite + '<br>' : ''}
        ${node.constitution_ref ? 'Constitution: ' + node.constitution_ref : ''}
      </p>

      <div style="margin-top:.4rem">
        <strong>Populations:</strong><br>
        ${pops || '<span class="law-small">No populations specified.</span>'}
      </div>

      <div style="margin-top:.4rem">
        <strong>Authority granted:</strong>
        ${authGranted}
      </div>

      <div style="margin-top:.4rem">
        <strong>Authority limited / exclusions:</strong>
        ${authLimited}
      </div>

      <div style="margin-top:.4rem">
        <strong>Preemption:</strong>
        <p class="law-small">
          Type: ${pre.type || 'none'}<br>
          ${pre.summary ? pre.summary : 'No preemption summary provided.'}
        </p>
        ${preCases}
      </div>

      <div style="margin-top:.4rem">
        <strong>Related CFR:</strong>
        ${relCfr}
      </div>

      <div style="margin-top:.4rem">
        <strong>Funding links:</strong>
        ${funds}
      </div>

      <div style="margin-top:.6rem">
        <strong>Raw JSON node:</strong>
        <pre>${JSON.stringify(node, null, 2)}</pre>
      </div>
    `;
  }

  function wireNodeClicks(){
    if(!nodeListEl) return;
    nodeListEl.addEventListener('click', (e)=>{
      const item = e.target.closest('.law-node-item');
      if(!item) return;
      const idx = Number(item.getAttribute('data-node-idx'));
      const nodes = applyFilters();
      const node = nodes[idx];
      renderNodeDetail(node);
    });
  }

  async function loadPacks(){
    if(!LAW_PACKS.length){
      setStatus('No law packs registered. Add JSON files to law/ and list them in LAW_PACKS.', 'warn');
      renderPackList();
      return;
    }

    allNodes = [];
    packMeta = {};
    setStatus('Loading law packs from local JSON…', 'warn');

    for(const pack of LAW_PACKS){
      try{
        const resp = await fetch(pack.file, { cache: 'no-store' });
        if(!resp.ok){
          console.warn('Could not load pack', pack.file, resp.status);
          packMeta[pack.id] = { hash: null, nodeCount: 0 };
          continue;
        }
        const text = await resp.text();
        let json;
        try{
          json = JSON.parse(text);
        } catch(e){
          console.error('Invalid JSON in pack', pack.file, e);
          packMeta[pack.id] = { hash: null, nodeCount: 0 };
          continue;
        }

        const hash = await hashString(text);
        const nodes = Array.isArray(json) ? json : [];
        const enriched = nodes.map(n => Object.assign({}, n, {
          _pack_id: pack.id,
          _pack_label: pack.label
        }));
        allNodes.push(...enriched);
        packMeta[pack.id] = { hash, nodeCount: enriched.length };
      } catch(err){
        console.error('Error loading pack', pack.file, err);
        packMeta[pack.id] = { hash: null, nodeCount: 0 };
      }
    }

    if(!allNodes.length){
      setStatus('No authority nodes loaded. Check that your JSON packs exist and are valid.', 'err');
    } else {
      setStatus(`Loaded ${allNodes.length} authority nodes from ${LAW_PACKS.length} pack(s).`, 'ok');
    }

    buildDomainOptions(allNodes);
    renderPackList();
    renderNodeList();
  }

  function init(){
    if(searchEl){
      searchEl.addEventListener('input', ()=>renderNodeList());
    }
    if(domainSel){
      domainSel.addEventListener('change', ()=>renderNodeList());
    }
    if(kindSel){
      kindSel.addEventListener('change', ()=>renderNodeList());
    }
    wireNodeClicks();
    loadPacks();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
