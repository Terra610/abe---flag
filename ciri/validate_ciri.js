// validate_ciri.js
// - Validates the built-in ./inputs.csv against ./schema.json
// - Drives the #data-health banner
// - Exposes helpers on window for validating uploaded CSVs using the same rules

(function () {
  const banner = document.getElementById('data-health');

  function setState(cls, msg) {
    if (!banner) return;
    banner.className = '';
    banner.classList.add(cls);
    banner.textContent = msg;
  }

  // Tiny CSV helper (handles quotes) — now also exposed globally for reuse.
  function csvToRows(text) {
    const rows = [];
    let i = 0,
      field = '',
      row = [],
      inQ = false;

    while (i < text.length) {
      const c = text[i++];

      if (inQ) {
        // Inside quotes
        if (c === '"' && text[i] === '"') {
          // Escaped quote ("")
          field += '"';
          i++;
        } else if (c === '"') {
          // End of quoted field
          inQ = false;
        } else {
          field += c;
        }
      } else {
        // Outside quotes
        if (c === '"') {
          inQ = true;
        } else if (c === ',') {
          row.push(field);
          field = '';
        } else if (c === '\n' || c === '\r') {
          if (field !== '' || row.length) {
            row.push(field);
            rows.push(row);
            field = '';
            row = [];
          }
        } else {
          field += c;
        }
      }
    }
    if (field !== '' || row.length) {
      row.push(field);
      rows.push(row);
    }
    return rows.filter((r) => r.length);
  }

  /**
   * Validate rows (already parsed) against a JSON schema-like object.
   * Returns a structured result that other scripts can use.
   *
   * @param {string[][]} rows - CSV rows (first row = headers, second row = data).
   * @param {object} schema - schema.json contents.
   * @returns {{
   *   ok: boolean,
   *   status: 'ok'|'warn'|'err',
   *   message: string,
   *   headers: string[],
   *   dataRow: string[],
   *   missing: string[],
   *   bad: string[]
   * }}
   */
  function validateRowsWithSchema(rows, schema) {
    if (!rows || rows.length < 2) {
      return {
        ok: false,
        status: 'err',
        message: 'inputs.csv has no data row',
        headers: [],
        dataRow: [],
        missing: [],
        bad: [],
      };
    }

    const headers = rows[0].map((h) => h.trim());
    const dataRow = rows[1];

    const required = schema.required || [];
    const missing = required.filter((k) => !headers.includes(k));

    if (missing.length) {
      return {
        ok: false,
        status: 'err',
        message: `inputs.csv is missing required columns: ${missing.join(', ')}`,
        headers,
        dataRow,
        missing,
        bad: [],
      };
    }

    // Spot numeric sanity based on schema minimums
    const idx = Object.fromEntries(headers.map((h, i) => [h, i]));
    const bad = [];

    for (const [k, spec] of Object.entries(schema.properties || {})) {
      if (idx[k] == null) continue;
      const raw = (dataRow[idx[k]] || '').replace(/[^0-9.\-]/g, '');
      const v = Number(raw);
      if (!isFinite(v) || (spec.minimum != null && v < spec.minimum)) {
        bad.push(k);
      }
    }

    if (bad.length) {
      return {
        ok: true,
        status: 'warn',
        message: `inputs.csv loaded with non-numeric or out-of-range values in: ${bad.join(
          ', '
        )}`,
        headers,
        dataRow,
        missing: [],
        bad,
      };
    }

    return {
      ok: true,
      status: 'ok',
      message: 'inputs.csv validated ✓',
      headers,
      dataRow,
      missing: [],
      bad: [],
    };
  }

  // Cache schema + CSV fetch so we can reuse for both banner + uploaded validation if desired.
  let schemaPromise = null;
  let builtinCsvPromise = null;

  async function loadSchema() {
    if (!schemaPromise) {
      schemaPromise = (async () => {
        const res = await fetch('./schema.json', { cache: 'no-store' });
        if (!res.ok) {
          throw new Error('schema.json missing or failed to load');
        }
        return res.json();
      })();
    }
    return schemaPromise;
  }

  async function loadBuiltinCsv() {
    if (!builtinCsvPromise) {
      builtinCsvPromise = (async () => {
        const res = await fetch('./inputs.csv', { cache: 'no-store' });
        if (!res.ok) {
          throw new Error('inputs.csv missing');
        }
        return res.text();
      })();
    }
    return builtinCsvPromise;
  }

  // Expose helpers for other scripts (e.g., upload handler on ciri/index.html)
  // so they can reuse the same CSV parsing + validation logic.
  if (typeof window !== 'undefined') {
    window.ciriCsvToRows = csvToRows;
    window.CIRIValidation = {
      // Parse CSV text into rows (same parser used for built-in file)
      csvToRows,
      // Validate arbitrary CSV text against the same schema.json
      // Returns the same shape as validateRowsWithSchema.
      validateText: async function (csvText) {
        const schema = await loadSchema();
        const rows = csvToRows((csvText || '').trim());
        return validateRowsWithSchema(rows, schema);
      },
      // Optionally let other scripts load/reuse the schema directly
      loadSchema,
    };
  }

  // Main: validate the built-in inputs.csv and drive the #data-health banner.
  (async function runBuiltinValidation() {
    if (!banner) {
      // If there's no banner element, quietly do nothing.
      return;
    }

    try {
      const [csvText, schema] = await Promise.all([
        loadBuiltinCsv(),
        loadSchema(),
      ]);

      const rows = csvToRows(csvText.trim());
      const result = validateRowsWithSchema(rows, schema);

      setState(result.status, result.message);
    } catch (e) {
      // Try to give a useful message
      if (e && e.message && e.message.includes('inputs.csv missing')) {
        setState('err', 'inputs.csv missing');
      } else if (e && e.message && e.message.includes('schema.json missing')) {
        setState('warn', 'schema.json missing (skipping strict checks)');
      } else {
        setState('err', 'Validation error');
      }
      console.error(e);
    }
  })();
})();    const missing = required.filter(k=>!headers.includes(k));

    if(missing.length){
      setState('err',`inputs.csv is missing required columns: ${missing.join(', ')}`);
      return;
    }

    // spot numeric sanity based on schema minimums
    const data = rows[1];
    const idx = Object.fromEntries(headers.map((h,i)=>[h,i]));
    const bad = [];
    for(const [k, spec] of Object.entries(schema.properties||{})){
      if(idx[k]==null) continue;
      const raw = (data[idx[k]]||'').replace(/[^0-9.\-]/g,'');
      const v = Number(raw);
      if(!isFinite(v) || (spec.minimum!=null && v<spec.minimum)) bad.push(k);
    }

    if(bad.length){
      setState('warn',`inputs.csv loaded with non-numeric or out-of-range values in: ${bad.join(', ')}`);
    }else{
      setState('ok','inputs.csv validated ✓');
    }
  }catch(e){
    setState('err','Validation error');
    console.error(e);
  }
})();
