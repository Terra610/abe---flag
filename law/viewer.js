async function loadJSON(path){
  const res = await fetch(path + '?t=' + Date.now());
  if(!res.ok) throw new Error(`Failed to load ${path}`);
  return res.json();
}

function renderList(el, items){
  el.innerHTML = items.map(item => `
    <div class="card">
      <h3>${item.title || item.id}</h3>
      ${item.description ? `<p>${item.description}</p>` : ''}
      ${item.links ? `<small>${item.links.join(", ")}</small>` : ''}
    </div>
  `).join('');
}

async function init(){
  try{
    const doctrineMap = await loadJSON('law/doctrine_map.json');
    const fmcsr = await loadJSON('law/fmcsr_scope.json');
    const mcsap = await loadJSON('law/mcsap_rules.json');
    const title49 = await loadJSON('law/title_49_mcsap.json'); // ✅ FIXED

    renderList(document.getElementById('doctrines'), doctrineMap.doctrines);
    renderList(document.getElementById('fmcsr'), fmcsr.rules || []);
    renderList(document.getElementById('mcsap'), mcsap.rules || []);
    renderList(document.getElementById('title49'), title49.sections || []);

  }catch(e){
    console.error(e);
    document.getElementById('doctrines').innerText = 'Error loading law data';
  }
}

init();
