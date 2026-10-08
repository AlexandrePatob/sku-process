import { useCallback, useEffect, useRef, useState } from "react";
import type { Run } from "../types/run";
import { apiConfigured, getReports, startProcess } from "../services/api";
import { errorMessage } from "../utils/format";

export function useRuns() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [starting, setStarting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [lastCheck, setLastCheck] = useState("");
  const startBusy = useRef(false);
  const requestId = useRef(0);

  const check = useCallback(async (): Promise<void> => {
    if (!apiConfigured) return;
    const id = ++requestId.current;
    setChecking(true);
    setError("");
    try {
      const reports = await getReports();
      if (id !== requestId.current) return;
      setRuns(reports);
      setLastCheck(new Date().toISOString());
    } catch (error) {
      if (id === requestId.current)
        setError(errorMessage(error, "Não foi possível carregar os lotes."));
    } finally {
      if (id === requestId.current) setChecking(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void check();
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      requestId.current++;
    };
  }, [check]);

  async function start(): Promise<boolean> {
    if (startBusy.current || !apiConfigured) return false;
    startBusy.current = true;
    setStarting(true);
    setError("");
    try {
      await startProcess();
      await check();
      return true;
    } catch (error) {
      setError(
        errorMessage(error, "Não foi possível iniciar o processamento."),
      );
      return false;
    } finally {
      startBusy.current = false;
      setStarting(false);
    }
  }

  const pendingCount = runs.filter((run) => run.status === "pending").length;
  const hasPending = pendingCount > 0;
  useEffect(() => {
    if (!apiConfigured || !hasPending) return;
    const timer = window.setInterval(() => {
      void check();
    }, 5000);
    return () => window.clearInterval(timer);
  }, [hasPending, check]);

  return {
    runs,
    starting,
    checking,
    error,
    lastCheck,
    pendingCount,
    start,
    check,
  };
}
