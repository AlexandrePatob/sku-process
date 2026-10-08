import type { RunStatus } from "../types/run";
import { runLabels } from "../utils/run";

export function StatusBadge({ status }: { status: RunStatus }) {
  return <span className={`badge ${status}`}>{runLabels[status]}</span>;
}
