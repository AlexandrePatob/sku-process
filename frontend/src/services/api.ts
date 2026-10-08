import type {
  Run,
  RunResponse,
  StartProcessResponse,
  ReportsResponse,
} from "../types/run";

const baseUrl = (import.meta.env?.VITE_API_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
export const apiConfigured = Boolean(baseUrl);

async function request<T>(path: string, method = "GET"): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { "ngrok-skip-browser-warning": "true" },
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok)
    throw new Error(
      `O serviço retornou HTTP ${response.status}. Confira a URL e a disponibilidade do backend.`,
    );
  return response.json() as Promise<T>;
}

export async function startProcess(): Promise<StartProcessResponse> {
  const result = await request<StartProcessResponse>("/start-process", "POST");
  if (
    typeof result.run_id !== "string" ||
    !result.run_id ||
    !Number.isInteger(result.total) ||
    result.total < 1
  ) {
    throw new Error(
      "Resposta inválida: o início deve retornar run_id e total de SKUs.",
    );
  }
  return result;
}

export async function getReports(): Promise<Run[]> {
  const first = await request<ReportsResponse>("/reports?limit=100&page=1");
  const remaining = await Promise.all(
    Array.from(
      { length: Math.max(0, first.pagination.total_pages - 1) },
      (_, index) =>
        request<ReportsResponse>(`/reports?limit=100&page=${index + 2}`),
    ),
  );
  return [first, ...remaining]
    .flatMap((page) => page.data)
    .map((run) => ({
      ...run,
      status: run.status === "processing" ? "pending" : run.status,
    }));
}

export async function getRun(run: Run): Promise<Run> {
  const result = await request<RunResponse>(
    `/runs/${encodeURIComponent(run.run_id)}`,
  );
  if (
    result.run_id !== run.run_id ||
    !["pending", "processing", "completed", "failed"].includes(result.status) ||
    !Number.isInteger(result.completed_count) ||
    result.completed_count < 0 ||
    (result.total !== null && result.completed_count > result.total)
  ) {
    throw new Error(
      "Resposta de acompanhamento inválida. Confira o contrato do relatório no README.",
    );
  }
  return {
    ...run,
    completed_count: result.completed_count,
    status: result.status === "processing" ? "pending" : result.status,
    report: typeof result.report === "string" ? result.report : null,
    error: result.error,
  };
}
