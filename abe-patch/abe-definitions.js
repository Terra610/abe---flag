
(function(){
  const MAP = {"ABE": "American Butterfly Effect", "CRRA": "Citizens Rights Restoration Act", "CIBS": "Constitutional Integrity Baseline Schema", "CIRI": "Constitutional Integrity Risk Index", "CII": "Constitutional Integrity Index", "CDI": "Constitutional Divergence Index"};
  const CORRECTIONS = [
    [/(\b)CRRA(\s*[-–—:]\s*)(Citizens'?\s*Right[s]?\s*Restoration\s*Act)?/gi, '$1CRRA$2Citizens Rights Restoration Act'],
    [/(\b)CIBS(\s*[-–—:]\s*)(Constitutional\s*Integrity\s*Baseline\s*Schema)?/gi, '$1CIBS$2Constitutional Integrity Baseline Schema']
  ];
  function walk(node){
    if (!node || node.nodeType !== 1) return;
    const tag = node.tagName; if (/(CODE|PRE|SCRIPT|STYLE)/.test(tag)) return;
    for (let child = node.firstChild; child; child = child.nextSibling) {
      if (child.nodeType === 3) {
        let txt = child.nodeValue;
        CORRECTIONS.forEach(([re, rep]) => { txt = txt.replace(re, rep); });
        Object.keys(MAP).forEach(acr => {
          const re = new RegExp('\\\b' + acr + '\\\b(?![^<]*>)', 'g');
          txt = txt.replace(re, '<abbr class="abe-tooltip" title="'+MAP[acr]+'">'+acr+'</abbr>');
        });
        if (txt !== child.nodeValue) {
          const span = document.createElement('span'); span.innerHTML = txt; child.parentNode.replaceChild(span, child);
        }
      } else if (child.nodeType === 1) { walk(child); }
    }
  }
  document.addEventListener('DOMContentLoaded', function(){ walk(document.body); });
})();
