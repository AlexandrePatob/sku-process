import type { Run } from "../types/run";
import { formatDate } from "../utils/format";
import { StatusBadge } from "./StatusBadge";
import { RunProgress } from "./RunProgress";

interface RunRowProps {
  run: Run;
  number: number;
  onReport: (run: Run) => void;
}

export function RunRow({ run, number, onReport }: RunRowProps) {
  return (
    <tr>
      <td>
        <strong>Lote #{number}</strong>
        <code>{run.run_id}</code>
      </td>
      <td>{formatDate(run.created_at)}</td>
      <td>
        <RunProgress run={run} />
      </td>
      <td>
        <StatusBadge status={run.status} />
      </td>
      <td>
        <button
          className="text-link"
          disabled={run.status === "pending"}
          onClick={() => onReport(run)}
        >
          {run.status === "pending"
            ? "Aguardando conclusão"
            : "Ver relatório ↗"}
        </button>
      </td>
    </tr>
  );
}
