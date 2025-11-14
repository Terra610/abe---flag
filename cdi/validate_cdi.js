/* CDI Validator — dependency-free
   Validates /cdi/model.json against /cdi/schema.json with explicit checks.
   Renders a status badge + details into #cdi-validate (if present).
*/
(async function () {
  const mountId = "cdi-validate";
  const el = document.getElementById(mountId);
  if (!el) return; // page doesn’t have a mount point, bail quietly

  // ---- tiny UI helpers ----
  const css = `
    #${mountId}{background:#0f131a;border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:14px;margin:16px 0}
    #${mountId} .row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
    #${mountId} .badge{display:inline-flex;align-items:center;gap:8px;border-radius:999px;padding:6px 10px;font-weight:700}
    #${mountId} .ok{border:1px solid #2a593f;background:#123222;color:#9fe7ba}
    #${mountId} .warn{border:1px solid #5c3a1f;background:#2b1a10;color:#ffca8a}
    #${mountId} .err{border:1px solid #5b2b2b;background:#2a1212;color:#ff9c9c}
    #${mountId} ul{margin:.5rem 0 0 1.1rem;padding:0}
    #${mountId} code{background:rgba(255,255,255,.08);padding:.08rem .35rem;border-radius:6px}
    #${mountId} .meta{color:#9fb3c8;font-size:.9rem;margin-top:6px}
    #${mountId} .spacer{flex:1}
  `;
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  const $ = (html) => {
    const d = document.createElement("div");
    d.innerHTML = html.trim();
    return d.firstElementChild;
  };

  // ---- load files with nice errors ----
  async function fetchText(url) {
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
    return await r.text();
  }

  let model, schema, errors = [], warnings = [];

  try {
    const [schemaTxt, modelTxt] = await Promise.all([
      fetchText("./schema.json"),
      fetchText("./model.json")
    ]);
    schema = JSON.parse(schemaTxt);
    model = JSON.parse(modelTxt);
  } catch (e) {
    el.appendChild($(`<div class="badge err">❌ CDI validation: cannot load or parse <code>schema.json</code> / <code>model.json</code><br><span class="meta">${e.message}</span></div>`));
    return;
  }

  // ---- explicit validations (aligned with the schema you’re using) ----
  function isNum(x) { return typeof x === "number" && isFinite(x); }
  function inRange(x, a, b) { return isNum(x) && x >= a && x <= b; }
  function nonEmptyStr(s) { return typeof s === "string" && s.trim().length > 0; }

  // root required
  if (!nonEmptyStr(model.version)) errors.push(`Missing or empty root field <code>version</code>.`);
  if (!Array.isArray(model.categories) || model.categories.length === 0)
    errors.push(`Missing or empty <code>categories</code> array.`);

  // updated (optional but recommended)
  if (model.updated && Number.isNaN(Date.parse(model.updated))) {
    warnings.push(`Field <code>updated</code> is present but not a valid ISO date-time.`);
  }

  // categories checks
  const keySeen = new Set();
  if (Array.isArray(model.categories)) {
    model.categories.forEach((c, i) => {
      const path = `categories[${i}]`;
      if (!c || typeof c !== "object") { errors.push(`${path} must be an object.`); return; }

      if (!nonEmptyStr(c.key)) errors.push(`${path}.key is required and must be a non-empty string.`);
      else {
        if (!/^[a-z0-9_-]+$/.test(c.key))
          errors.push(`${path}.key "${c.key}" must match <code>^[a-z0-9_-]+$</code>.`);
        if (keySeen.has(c.key))
          errors.push(`${path}.key "${c.key}" is duplicated; keys must be unique.`);
        keySeen.add(c.key);
      }

      if (!nonEmptyStr(c.name)) errors.push(`${path}.name is required and must be a non-empty string.`);
      if (!inRange(c.divergence, 0, 1)) errors.push(`${path}.divergence must be a number in [0,1].`);
      if (!inRange(c.confidence, 0, 1)) errors.push(`${path}.confidence must be a number in [0,1].`);

      if (c.sources !== undefined) {
        if (!Array.isArray(c.sources)) errors.push(`${path}.sources must be an array of URIs if provided.`);
        else {
          c.sources.forEach((u, j) => {
            if (!nonEmptyStr(u) || !/^https?:\/\//i.test(u))
              warnings.push(`${path}.sources[${j}] should be an http(s) URI.`);
          });
        }
      }
    });
  }

  // jurisdictions (optional)
  if (model.jurisdictions !== undefined) {
    if (!Array.isArray(model.jurisdictions)) {
      errors.push(`<code>jurisdictions</code> must be an array when provided.`);
    } else {
      model.jurisdictions.forEach((j, i) => {
        const path = `jurisdictions[${i}]`;
        if (!j || typeof j !== "object") { errors.push(`${path} must be an object.`); return; }
        if (!nonEmptyStr(j.name)) errors.push(`${path}.name is required and must be a non-empty string.`);
        if (!inRange(j.modifier, -1, 1)) errors.push(`${path}.modifier must be a number in [-1,1].`);
      });
    }
  }

  // additionalProperties=false: warn for unknown root props
  const allowedRoot = new Set(["version","updated","categories","jurisdictions","notes"]);
  Object.keys(model).forEach(k=>{
    if (!allowedRoot.has(k)) warnings.push(`Unknown root field <code>${k}</code> (will be ignored).`);
  });

  // ---- render result ----
  if (errors.length === 0) {
    const badge = $(`<div class="row">
        <div class="badge ok" aria-live="polite">✅ CDI model.json is VALID</div>
        <div class="spacer"></div>
        <div class="meta">Version: <code>${model.version}</code>${model.updated?` · Updated: <code>${model.updated}</code>`:''}</div>
      </div>`);
    el.appendChild(badge);
  } else {
    const badge = $(`<div class="badge err" aria-live="polite">❌ CDI model.json is INVALID — ${errors.length} error(s)</div>`);
    el.appendChild(badge);
  }

  if (errors.length > 0) {
    const list = document.createElement("ul");
    list.innerHTML = errors.map(e=>`<li>${e}</li>`).join("");
    el.appendChild(list);
  }

  if (warnings.length > 0) {
    const warnBadge = $(`<div class="badge warn" style="margin-top:8px">⚠️ ${warnings.length} warning(s)</div>`);
    el.appendChild(warnBadge);
    const wlist = document.createElement("ul");
    wlist.innerHTML = warnings.map(w=>`<li>${w}</li>`).join("");
    el.appendChild(wlist);
  }
})();
