# ⚖️ CFF — Constitutional Funding Forensics  
**Follow the money. Restore the law.**

CFF is the A.B.E. Engine’s **appropriations auditor** — a fully local, browser-run model that checks whether government spending actually follows the statutes and conditions that authorized the money in the first place.

Every dollar Congress appropriates carries **purpose limits**.  
Every grant has **allowable uses**.  
Every agency has **statutory authority boundaries**.

When states or agencies drift “off-mission,” they’re not just sloppy — they’re in violation of the **Appropriations Clause**, **Administrative Procedure Act**, **OMB A-87**, and every controlling statute listed inside your CSV.

CFF quantifies that drift in hard numbers.

---

## 🧠 What CFF Does
You give it a CSV.  
It gives you a forensic map of:

- **ON_MISSION** spending (lawful, aligned with statutory purpose)  
- **OFF_MISSION** spending (unlawful, constitutionally invalid, recoverable)  
- **UNCLEAR** spending (mixed-purpose items needing deeper audit split)

CFF then totals:

- ON_MISSION  
- OFF_MISSION  
- UNCLEAR  
- OFF_MISSION share  
- Program × State × Fiscal Year breakdown  
- GAO/OIG citations if included in your notes column  

And with one click, you can send your **OFF_MISSION total** directly into the **CIRI** model as additional recovery potential.

No uploading. No tracking. No storage.  
Everything runs inside *your* browser — never on a server.

---

## 🗂 Required CSV Columns
Your CSV must include:

program_name,  
federal_authority_citation,  
fiscal_year,  
state_or_jurisdiction,  
agency,  
line_item_description,  
spend_category_code,  
amount_usd,  
notes (optional)

See `inputs.csv` for an example spanning MCSAP, Medicaid, TANF, Highway Grants, CDBG, Title I, and SLFRF.
