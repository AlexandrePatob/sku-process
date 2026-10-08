import { useEffect, useRef, useState } from "react";
import type { Run } from "../types/run";
import { getRun } from "../services/api";
import { errorMessage } from "../utils/format";
import { CallbackReport } from "./CallbackReport";

interface ReportDialogProps {
  run: Run;
  onClose: () => void;
}

export function ReportDialog({ run, onClose }: ReportDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [report, setReport] = useState<Run>({
    ...run,
    report: null,
    error: "Carregando resposta do callback…",
  });

  useEffect(() => {
    dialog.current?.showModal();
    let cancelled = false;
    void getRun(run)
      .then((updated) => {
        if (cancelled) return;
        setReport(updated);
      })
      .catch((error) => {
        if (!cancelled)
          setReport({
            ...run,
            report: null,
            error: errorMessage(
              error,
              "Não foi possível carregar o relatório.",
            ),
          });
      });
    return () => {
      cancelled = true;
    };
  }, [run]);

  return (
    <dialog ref={dialog} aria-labelledby="report-title" onClose={onClose}>
      <div className="section-title">
        <h2 id="report-title">Relatório do lote</h2>
        <button
          className="close"
          aria-label="Fechar relatório"
          onClick={() => dialog.current?.close()}
        >
          ×
        </button>
      </div>
      <p className="report-id">{run.run_id}</p>
      <CallbackReport body={report.report} error={report.error} />
    </dialog>
  );
}
