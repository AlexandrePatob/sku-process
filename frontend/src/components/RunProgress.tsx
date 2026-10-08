import type { Run } from "../types/run";
import { formatNumber } from "../utils/format";

export function RunProgress({ run }: { run: Run }) {
  return (
    <div className="row-progress">
      <span>
        {formatNumber(run.completed_count)} /{" "}
        {run.total === null ? "—" : formatNumber(run.total)} SKUs
      </span>
      {run.total !== null ? (
        <progress
          value={run.completed_count}
          max={run.total}
          aria-label={`Progresso do lote ${run.run_id}`}
        />
      ) : (
        <progress aria-label={`Progresso do lote ${run.run_id}`} />
      )}
    </div>
  );
}
