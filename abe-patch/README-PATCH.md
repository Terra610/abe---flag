
ABE Site Patch Kit (non-destructive)

1) Copy `abe-patch/` to your repo root.
2) In each page you want patched:

<head>:
<link rel="stylesheet" href="/abe---flag/abe-patch/assets/abe-patch.css">

Before </body>:
<script src="/abe---flag/abe-patch/assets/abe-nav.js"></script>
<script src="/abe---flag/abe-patch/assets/abe-definitions.js"></script>

Notes:
- Home link default: /abe---flag/ (edit in abe-nav.js if needed)
- CRRA → Citizens Rights Restoration Act (canonical); CIBS → Constitutional Integrity Baseline Schema
- CIRI left as Constitutional Integrity Risk Index unless you explicitly choose to rename globally.
