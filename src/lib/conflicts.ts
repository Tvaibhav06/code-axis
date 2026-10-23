// PT409 is the explicit PostgREST HTTP-conflict code introduced by migration 007.
// Keep compatibility while an existing database is waiting for that migration.
export function isVersionConflict(code?: string) {
  return code === "PT409" || code === "40001";
}
