async function loadMap() {
  const res = await fetch("./map.json", { cache: "no-store" });
  if (!res.ok) throw new Error("Could not load map.json");
  return await res.json();
}

function renderPlain(map) {
  const headline =
    "ABE runs like an engine: modules fire in order, using the same uploaded data — and receipts prove it.";

  document.getElementById("headline").textContent = headline;

  const bullets = [
    "Upload files once (or use defaults).",
    "Each module reads inputs and produces outputs.",
    "Integration runs the firing order automatically.",
    "SHA-256 receipts prove integrity without tracking."
  ];

  const ul = document.getElementById("bullets");
  bullets.forEach(b => {
    const li = document.createElement("li");
    li.textContent = b;
    ul.appendChild(li);
  });

  const stepsDiv = document.getElementById("steps");
  const flow = map?.flow || map?.data_flow || map?.pipeline;

  if (Array.isArray(flow)) {
    const ol = document.createElement("ol");
    flow.forEach(s => {
      const li = document.createElement("li");
      li.textContent = String(s);
      ol.appendChild(li);
    });
    stepsDiv.appendChild(ol);
  } else {
    stepsDiv.innerHTML = "<small>No flow array found in map.json (that’s OK). Raw map is shown below.</small>";
  }

  document.getElementById("raw").textContent = JSON.stringify(map, null, 2);
}

(async () => {
  try {
    const map = await loadMap();
    renderPlain(map);
  } catch (e) {
    document.getElementById("raw").textContent = String(e);
  }
})();
