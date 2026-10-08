export type RunStatus = "pending" | "completed" | "failed";
export type RunFilter = RunStatus | "all";

export interface Run {
  run_id: string;
  total: number | null;
  completed_count: number;
  status: RunStatus;
  created_at: string;
  report?: string | null;
  error?: string | null;
}

export type RunResponse = Omit<Run, "status"> & {
  status: RunStatus | "processing";
};
export interface StartProcessResponse {
  run_id: string;
  total: number;
}

export interface ReportsResponse {
  data: RunResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}
