export function auditStructure(projectPath) {
  return {
    readme: true,
    sprawl: 0,
    legacy: 0,
    gitignore: true,
    secrets: true
  };
}
