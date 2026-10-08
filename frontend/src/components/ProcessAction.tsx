interface ProcessActionProps {
  configured: boolean;
  starting: boolean;
  pendingCount: number;
  onStart: () => void;
}

export function ProcessAction({
  configured,
  starting,
  pendingCount,
  onStart,
}: ProcessActionProps) {
  return (
    <section className="workspace">
      <div className="process-card">
        <div>
          <h2>Processamento de SKUs</h2>
          <p>
            {pendingCount
              ? `${pendingCount} ${pendingCount === 1 ? "lote em andamento" : "lotes em andamento"}. Acompanhe na lista abaixo.`
              : "Inicie novos lotes e acompanhe na lista abaixo."}
          </p>
        </div>
        <button
          className="primary"
          disabled={!configured || starting}
          onClick={onStart}
        >
          {starting ? "Iniciando…" : "Iniciar processamento"}
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </section>
  );
}
