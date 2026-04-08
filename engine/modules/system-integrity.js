// system/integrity.js
// A.B.E. client-side integrity helper — extended for CFF, AFFE, CCRI.
// All hashing is done locally in the browser. No data leaves the device.

(function(global){
  async function sha256(text){
    const enc = new TextEncoder().encode(text);
    const digest = await crypto.subtle.digest('SHA-256', enc);
    const bytes = Array.from(new Uint8Array(digest));
    return bytes.map(b => b.toString(16).padStart(2,'0')).join('');
  }

  async function fetchText(path){
    const res = await fetch(path,{cache:'no-store'});
    if(!res.ok) throw new Error('Fetch failed: '+path);
    return res.text();
  }

  async function checkFile(path){
    try{
      const txt = await fetchText(path);
      const trimmed = txt.trim();
      if(!trimmed){
        return { status:'warn', message:'File empty', sha256:await sha256('') };
      }
      return {
        status:'ok',
        message:`File present (${trimmed.length} chars)`,
        sha256: await sha256(trimmed)
      };
    }catch(err){
      return {
        status:'bad',
        message:'File missing or unreadable',
        sha256: 'N/A'
      };
    }
  }

  async function runIntegrity(opts){
    const base = opts.base || '';
    const now  = new Date().toISOString();

    // core modules
    const ciri = await checkFile(base + '/ciri/inputs.csv');
    const cibs = await checkFile(base + '/cibs/auto_budget.csv');
    const cdi  = await checkFile(base + '/cdi/divergence.csv');
    const cae  = await checkFile(base + '/cae/model.json');

    // new: CFF, AFFE, CCRI scaffolds
    const cff  = await checkFile(base + '/cff/inputs.csv');
    const affe = await checkFile(base + '/affe/index.html'); // interface presence
    const ccri = await checkFile(base + '/ccri/inputs.json');

    const auditId = (await sha256(
      [ciri.sha256,cibs.sha256,cdi.sha256,cae.sha256,cff.sha256,affe.sha256,ccri.sha256,now].join('|')
    )).slice(0,32);

    return {
      audit_id: auditId,
      generated_at: now,
      modules: {
        ciri,
        cibs,
        cdi,
        cae,
        cff,
        affe,
        ccri
      }
    };
  }

  global.runIntegrity = runIntegrity;
})(window);
