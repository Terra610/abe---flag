export async function loadJSON(path){
  const res = await fetch(path + '?t=' + Date.now());
  if(!res.ok) throw new Error(`Failed to load ${path}`);
  return res.json();
}

export async function runModule(modulePath, input){
  const mod = await import(modulePath);
  if(!mod.run) throw new Error(`No run() in ${modulePath}`);
  return mod.run(input);
}

export function logStep(step, data){
  console.log(`[ABE] ${step}`, data);
}
