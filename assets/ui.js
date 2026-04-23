export function showJSON(el, data){
  el.innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
}

export function showStatus(el, text, ok=true){
  el.textContent = text;
  el.style.color = ok ? "#4bd28f" : "#ff6b6b";
}
