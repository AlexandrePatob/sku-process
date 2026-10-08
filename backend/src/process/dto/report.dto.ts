export type RunStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type CallbackStatus = RunStatus | 'not_applicable';
export interface RunSummary {
  run_id: string;
  status: RunStatus;
  total: number | null;
  received_count: number;
  completed_count: number;
  success_count: number;
  invalid_count: number;
  failed_count: number;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  updated_at: string;
  callback_status: CallbackStatus;
  error: string | null;
}
export interface RunReport extends RunSummary {
  report: string | null;
}
export interface ReportsResponse {
  data: RunSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}
