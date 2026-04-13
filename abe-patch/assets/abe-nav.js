
(function(){
  try {
    var HOME_HREF = "/abe---flag/";
    var BAR_ID = "abe-utility-bar";
    if (document.getElementById(BAR_ID)) return;
    var bar = document.createElement("div");
    bar.className = "abe-utility-bar"; bar.id = BAR_ID;
    var left = document.createElement("div");
    var home = document.createElement("a"); home.href = HOME_HREF; home.textContent = "⟵ Return to Home";
    left.appendChild(home);
    var right = document.createElement("div"); right.innerHTML = '<span class="abe-badge">ABE Patch Active</span>';
    bar.appendChild(left); bar.appendChild(right);
    (document.body || document.documentElement).insertAdjacentElement("afterbegin", bar);
  } catch(e){ console.warn("ABE nav patch error:", e); }
})();
