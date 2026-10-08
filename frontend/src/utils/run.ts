import type { Run, RunFilter, RunStatus } from "../types/run";

export const runLabels: Record<RunStatus, string> = {
  pending: "Em processamento",
  completed: "Concluído",
  failed: "Falhou",
};
export const runFilters: { value: RunFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "completed", label: "Concluídos" },
  { value: "pending", label: "Em processamento" },
  { value: "failed", label: "Falhas" },
];

export function filterRuns(
  runs: Run[],
  filter: RunFilter,
  search: string,
): Run[] {
  const term = search.toLowerCase();
  return runs.filter(
    (run) =>
      (filter === "all" || run.status === filter) &&
      run.run_id.toLowerCase().includes(term),
  );
}
