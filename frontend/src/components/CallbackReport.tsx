import type { ReportValue } from "../types/report";
import {
  reportLabels as labels,
  isReportObject as isObject,
} from "../utils/report";
import { ReportFields, ReportValueDisplay } from "./ReportFields";

export function CallbackReport({
  body,
  error,
}: {
  body?: string | null;
  error?: string | null;
}) {
  if (!body)
    return (
      <p className="report-message">
        {error || "Este lote não possui uma resposta de callback disponível."}
      </p>
    );
  let parsed: ReportValue;
  try {
    parsed = JSON.parse(body) as ReportValue;
  } catch {
    return <p className="report-message">{body}</p>;
  }
  if (!isObject(parsed))
    return (
      <p className="report-message">{String(parsed ?? "Resposta vazia")}</p>
    );
  const { ok, score, duration_ms, attempt, ...sections } = parsed;
  return (
    <div className="callback-report">
      <ReportFields
        data={{
          ...(ok != null ? { ok } : {}),
          ...(score != null ? { score } : {}),
          ...(duration_ms != null ? { duration_ms } : {}),
          ...(attempt != null ? { attempt } : {}),
        }}
      />
      {Object.entries(sections).map(([name, value]) => (
        <section className="report-section" key={name}>
          <h3>{labels[name] ?? name.replaceAll("_", " ")}</h3>
          {isObject(value) ? (
            <ReportFields data={value} />
          ) : (
            <ReportValueDisplay name={name} value={value} />
          )}
        </section>
      ))}
    </div>
  );
}
