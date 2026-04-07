// AFFE parser – tiny helper that turns CSV / XLSX / PDF into
// { sourceType, columns: string[], rows: Array<object> }.
// Runs entirely in the browser.

window.AFFEParser = (function(){
  // Ensure pdf.js worker is configured (no remote workers pulling your data)
  if(window.pdfjsLib && window.pdfjsLib.GlobalWorkerOptions){
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";
  }

  // ---- CSV parsing ----
  function parseCsvText(text){
    const lines = text.split(/\\r?\\n/).filter(l=>l.trim().length>0);
    if(!lines.length) return {columns:[],rows:[]};

    const parseLine = (line)=>{
      const out = [];
      let cur = '';
      let inQuotes = false;
      for(let i=0;i<line.length;i++){
        const ch = line[i];
        if(ch === '"'){
          if(inQuotes && line[i+1] === '"'){ // escaped quote
            cur += '"';
            i++;
          }else{
            inQuotes = !inQuotes;
          }
        }else if(ch === ',' && !inQuotes){
          out.push(cur);
          cur = '';
        }else{
          cur += ch;
        }
      }
      out.push(cur);
      return out;
    };

    const header = parseLine(lines[0]).map(s=>s.trim());
    const rows = [];
    for(let i=1;i<lines.length;i++){
      const parts = parseLine(lines[i]);
      if(parts.every(v=>v.trim()==='')) continue;
      const obj = {};
      header.forEach((h,idx)=>{
        obj[h] = parts[idx] !== undefined ? parts[idx] : '';
      });
      rows.push(obj);
    }
    return {columns:header, rows};
  }

  function parseCsvFile(file){
    return new Promise((resolve,reject)=>{
      const reader = new FileReader();
      reader.onerror = ()=>reject(new Error("Failed to read CSV file"));
      reader.onload = e=>{
        try{
          const text = e.target.result;
          const {columns,rows} = parseCsvText(text);
          resolve({sourceType:'csv',columns,rows});
        }catch(err){
          reject(err);
        }
      };
      reader.readAsText(file);
    });
  }

  // ---- Excel parsing (XLSX/XLS) ----
  function parseXlsxFile(file){
    if(typeof XLSX === "undefined"){
      return Promise.reject(new Error("XLSX library not loaded"));
    }
    return new Promise((resolve,reject)=>{
      const reader = new FileReader();
      reader.onerror = ()=>reject(new Error("Failed to read Excel file"));
      reader.onload = e=>{
        try{
          const data = new Uint8Array(e.target.result);
          const wb = XLSX.read(data,{type:"array"});
          const sheetName = wb.SheetNames[0];
          const sheet = wb.Sheets[sheetName];
          const rowsArr = XLSX.utils.sheet_to_json(sheet,{header:1,defval:""});
          if(!rowsArr.length){
            resolve({sourceType:"xlsx",columns:[],rows:[]});
            return;
          }
          const header = rowsArr[0].map(s=>String(s).trim());
          const rows = [];
          for(let i=1;i<rowsArr.length;i++){
            const rowArr = rowsArr[i];
            if(rowArr.every(v=>String(v).trim()==="")) continue;
            const obj = {};
            header.forEach((h,idx)=>{
              obj[h] = rowArr[idx];
            });
            rows.push(obj);
          }
          resolve({sourceType:"xlsx",columns:header,rows});
        }catch(err){
          reject(err);
        }
      };
      reader.readAsArrayBuffer(file);
    });
  }

  // ---- PDF parsing ----
  async function parsePdfFile(file){
    if(typeof pdfjsLib === "undefined"){
      throw new Error("pdf.js library not loaded");
    }
    const arrayBuf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({data:arrayBuf}).promise;
    let fullText = "";
    const numPages = pdf.numPages || 0;
    for(let pageNum=1; pageNum<=numPages; pageNum++){
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();
      const strings = content.items.map(it=>it.str || "");
      fullText += strings.join(" ") + "\\n";
    }
    const lines = fullText.split(/\\r?\\n/).map(l=>l.trim()).filter(Boolean);
    const rows = [];
    const moneyRegex = /([$€£]?\\s*\\d[\\d,]*(?:\\.\\d+)?)/;

    lines.forEach(line=>{
      const m = line.match(moneyRegex);
      if(!m) return;
      const num = parseFloat(m[0].replace(/[^0-9.\\-]/g,""));
      if(!Number.isFinite(num)) return;
      rows.push({
        description: line,
        amount: num
      });
    });

    const columns = ["description","amount"];
    return {sourceType:"pdf",columns,rows};
  }

  // ---- Public API ----
  function parseFile(file){
    const name = (file.name || "").toLowerCase();
    if(name.endsWith(".csv") || name.endsWith(".txt")){
      return parseCsvFile(file);
    }
    if(name.endsWith(".xlsx") || name.endsWith(".xls")){
      return parseXlsxFile(file);
    }
    if(name.endsWith(".pdf")){
      return parsePdfFile(file);
    }
    // Fallback: try text as CSV
    return parseCsvFile(file);
  }

  return { parseFile };
})();
