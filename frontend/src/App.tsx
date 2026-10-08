import { useState } from "react";
import type { Run, RunFilter } from "./types/run";
import { apiConfigured } from "./services/api";
import { useRuns } from "./hooks/useRuns";
import { Header } from "./components/Header";
import { SetupGuide } from "./components/SetupGuide";
import { ProcessAction } from "./components/ProcessAction";
import { RunHistory } from "./components/RunHistory";
import { ReportDialog } from "./components/ReportDialog";
import "./App.css";

function App() {
  const {
    runs,
    starting,
    checking,
    error,
    lastCheck,
    pendingCount,
    start,
    check,
  } = useRuns();
  const [filter, setFilter] = useState<RunFilter>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Run | null>(null);

  async function handleStart(): Promise<void> {
    if (await start()) {
      setFilter("all");
      setSearch("");
    }
  }

  return (
    <>
      <Header />
      <main>
        <div className="page-heading">
          <div>
            <p className="eyebrow">OPERAÇÃO DE DADOS</p>
            <h1>Seu catálogo, em movimento.</h1>
            <p className="muted">
              Inicie o processamento de SKUs e acompanhe cada lote até o
              relatório final.
            </p>
          </div>
          {!apiConfigured && (
            <a className="text-link" href="#setup">
              Como configurar ↗
            </a>
          )}
        </div>
        {!apiConfigured && <SetupGuide />}
        {error && (
          <div className="alert" role="alert">
            {error}
          </div>
        )}
        <ProcessAction
          configured={apiConfigured}
          starting={starting}
          pendingCount={pendingCount}
          onStart={() => void handleStart()}
        />
        <RunHistory
          runs={runs}
          filter={filter}
          search={search}
          pendingCount={pendingCount}
          checking={checking}
          lastCheck={lastCheck}
          onFilter={setFilter}
          onSearch={setSearch}
          onCheck={() => void check()}
          onReport={setSelected}
        />
        <footer>
          <span>weduu • Inteligência em cada SKU.</span>
        </footer>
      </main>
      {selected && (
        <ReportDialog
          key={selected.run_id}
          run={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}

export default App;
