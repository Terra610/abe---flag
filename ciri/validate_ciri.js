// ciri/validate_ciri.js
// Validates CIRI local model/schema/input files without breaking page execution.

(function(){
  const byId = id => document.getElementById(id);

  function setState(kind, message){
    const el =
      byId("ciri-validation-status") ||
      byId("validation-status") ||
      byId("ciri-status");

    if(!el){
      console.log("[CIRI validation]", kind, message);
      return;
    }

    el.textContent = message;
    el.dataset.status = kind;
    el.className = el.className || "";
    el.classList.remove("ok","warn","err","bad");
    el.classList.add(kind === "err" ? "bad" : kind);
  }

  async function fetchText(path){
    const res = await fetch(path, { cache:"no-store" });
    if(!res.ok) throw new Error(`${path} HTTP ${res.status}`);
    return res.text();
  }

  async function fetchJSON(path){
    const txt = await fetchText(path);
    return JSON.parse(txt);
  }

  function parseCSV(text){
    const rows = [];
    let row = [];
    let cell = "";
    let inQuotes = false;

    for(let i = 0; i < text.length; i++){
      const ch = text[i];
      const next = text[i + 1];

      if(ch === '"' && inQuotes && next === '"'){
        cell += '"';
        i++;
      }else if(ch === '"'){
        inQuotes = !inQuotes;
      }else if(ch === "," && !inQuotes){
        row.push(cell.trim());
        cell = "";
      }else if((ch === "\n" || ch === "\r") && !inQuotes){
        if(ch === "\r" && next === "\n") i++;
        row.push(cell.trim());
        if(row.some(v => v.length)) rows.push(row);
        row = [];
        cell = "";
      }else{
        cell += ch;
      }
    }

    row.push(cell.trim());
    if(row.some(v => v.length)) rows.push(row);

    return rows;
  }

  function normalizeHeader(h){
    return String(h || "").trim();
  }

  async function validate(){
    try{
      let schema = null;
      let model = null;
      let inputText = null;

      try{
        schema = await fetchJSON("ciri/schema.json");
      }catch(e){
        console.warn("[CIRI] schema.json unavailable; strict schema validation skipped.", e);
      }

      try{
        model = await fetchJSON("ciri/model.json");
      }catch(e){
        console.warn("[CIRI] model.json unavailable.", e);
      }

      try{
        inputText = await fetchText("ciri/inputs.csv");
      }catch(e){
        console.warn("[CIRI] inputs.csv unavailable.", e);
      }

      if(!inputText){
        setState("warn", "CIRI validator loaded; no inputs.csv found to validate.");
        return;
      }

      const rows = parseCSV(inputText);

      if(rows.length < 2){
        setState("warn", "inputs.csv loaded but does not contain data rows.");
        return;
      }

      const headers = rows[0].map(normalizeHeader);

      const required =
        Array.isArray(schema?.required)
          ? schema.required
          : [
              "case_count",
              "avg_cost_per_case",
              "fees_cancelled",
              "employment_uplift",
              "litigation_risk_avoided"
            ];

      const missing = required.filter(k => !headers.includes(k));

      if(missing.length){
        setState("err", `inputs.csv is missing required columns: ${missing.join(", ")}`);
        return;
      }

      const idx = Object.fromEntries(headers.map((h,i)=>[h,i]));
      const data = rows[1] || [];
      const bad = [];

      if(schema?.properties){
        for(const [k, spec] of Object.entries(schema.properties)){
          if(idx[k] == null) continue;

          const raw = String(data[idx[k]] || "").replace(/[^0-9.\-]/g, "");
          const v = Number(raw);

          if(raw && (!Number.isFinite(v) || (spec.minimum != null && v < spec.minimum))){
            bad.push(k);
          }
        }
      }

      if(bad.length){
        setState("warn", `inputs.csv loaded with non-numeric or out-of-range values in: ${bad.join(", ")}`);
      }else{
        setState("ok", "CIRI validator loaded ✓");
      }

      console.log("[CIRI validation]", {
        headers,
        rows: rows.length,
        schema_loaded: !!schema,
        model_loaded: !!model
      });

    }catch(e){
      setState("err", "CIRI validation error");
      console.error("[CIRI validation error]", e);
    }
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", validate);
  }else{
    validate();
  }
})();
