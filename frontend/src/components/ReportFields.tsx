import type { ReportValue, ReportData } from "../types/report";

import {
  reportLabels as labels,
  reportTimeFields as timeFields,
  isReportObject as isObject,
} from "../utils/report";

export function ReportValueDisplay({
  value,
  name,
}: {
  value: ReportValue;
  name: string;
}) {
  if (typeof value === "boolean")
    return (
      <span className={`badge ${value ? "completed" : "failed"}`}>
        {value ? "Aprovado" : "Reprovado"}
      </span>
    );
  if (Array.isArray(value))
    return (
      <span>
        {value.length
          ? `${value.length} ${value.length === 1 ? "item" : "itens"}`
          : "Nenhum"}
      </span>
    );
  if (isObject(value))
    return (
      <span className="report-inline">
        {Object.entries(value).map(([key, item]) => (
          <span key={key}>
            {labels[key] ?? key}: <ReportValueDisplay name={key} value={item} />
          </span>
        ))}
      </span>
    );
  if (typeof value === "number")
    return (
      <span>
        {value.toLocaleString("pt-BR")}
        {timeFields.has(name) ? " ms" : ""}
      </span>
    );
  return <span>{value ?? "Não informado"}</span>;
}

export function ReportFields({ data }: { data: ReportData }) {
  return (
    <dl className="report-fields">
      {Object.entries(data).map(([name, value]) => (
        <div key={name}>
          <dt>{labels[name] ?? name.replaceAll("_", " ")}</dt>
          <dd>
            <ReportValueDisplay name={name} value={value} />
          </dd>
        </div>
      ))}
    </dl>
  );
}
