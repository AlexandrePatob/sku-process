export const formatDate = (value: string): string =>
  new Date(value).toLocaleString("pt-BR");
export const formatNumber = (value: number): string =>
  value.toLocaleString("pt-BR");
export const errorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;
