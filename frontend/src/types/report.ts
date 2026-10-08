export type ReportValue =
  | string
  | number
  | boolean
  | null
  | ReportValue[]
  | { [key: string]: ReportValue };
export type ReportData = { [key: string]: ReportValue };
