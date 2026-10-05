export function runAll(projects){
  return Object.fromEntries(projects.map(p=>[p,{scores:{}}]));
}
