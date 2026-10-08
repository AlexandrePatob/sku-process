import type { Run, RunFilter } from "../types/run";
import { formatDate } from "../utils/format";
import { filterRuns, runFilters } from "../utils/run";
import { RunRow } from "./RunRow";

interface RunHistoryProps {
  runs: Run[];
  filter: RunFilter;
  search: string;
  pendingCount: number;
  checking: boolean;
  lastCheck: string;
  onFilter: (filter: RunFilter) => void;
  onSearch: (search: string) => void;
  onCheck: () => void;
  onReport: (run: Run) => void;
}

export function RunHistory({
  runs,
  filter,
  search,
  pendingCount,
  checking,
  lastCheck,
  onFilter,
  onSearch,
  onCheck,
  onReport,
}: RunHistoryProps) {
  const completed = runs.filter((run) => run.status === "completed").length;
  const visible = filterRuns(runs, filter, search);
  return (
    <section className="history">
      <div className="history-heading">
        <div>
          <p className="eyebrow">HISTÓRICO</p>
          <h2>Seus processamentos</h2>
          <p className="muted">
            Todos os lotes de processamento, em um só lugar.
          </p>
        </div>
        <span className="history-count">
          {completed}{" "}
          {completed === 1 ? "relatório concluído" : "relatórios concluídos"}
        </span>
      </div>
      <div className="toolbar">
        <div className="filters" aria-label="Filtrar processamentos">
          {runFilters.map(({ value, label }) => (
            <button
              key={value}
              className={filter === value ? "selected" : ""}
              onClick={() => onFilter(value)}
              aria-pressed={filter === value}
            >
              {label}
            </button>
          ))}
        </div>
        <input
          type="search"
          aria-label="Buscar por run_id"
          placeholder="Buscar por run_id…"
          value={search}
          onChange={(event) => onSearch(event.target.value)}
        />
      </div>
      {pendingCount > 0 && (
        <div className="list-polling">
          <span>
            Atualização automática a cada 5 segundos
            {lastCheck ? ` · Última consulta: ${formatDate(lastCheck)}` : ""}
          </span>
          <button className="text-link" disabled={checking} onClick={onCheck}>
            {checking ? "Consultando…" : "Atualizar agora"}
          </button>
        </div>
      )}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Lote / run_id</th>
              <th>Iniciado em</th>
              <th>Progresso</th>
              <th>Status</th>
              <th>Relatório</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((run) => (
              <RunRow
                key={run.run_id}
                run={run}
                number={runs.length - runs.indexOf(run)}
                onReport={onReport}
              />
            ))}
          </tbody>
        </table>
      </div>
      {!visible.length && (
        <div className="empty">
          <span aria-hidden="true">▤</span>
          <h3>
            {runs.length
              ? "Nenhum lote encontrado"
              : "Seu primeiro lote começa aqui"}
          </h3>
          <p>
            {runs.length
              ? "Altere os filtros ou busque outro run_id."
              : "Ao iniciar um processamento, o lote e seu relatório aparecerão nesta lista."}
          </p>
        </div>
      )}
    </section>
  );
}
