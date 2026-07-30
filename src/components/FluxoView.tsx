import { Download, Upload, TrendingUp, TrendingDown, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FluxoCharts } from "@/components/FluxoCharts";
import { useFluxo } from "@/lib/fluxo-store";
import {
  computeTotais,
  formatValor,
  mesLabel,
  trimMeses,
  type FluxoData,
} from "@/lib/fluxo";

const cellBase =
  "border-b border-flow-grid px-3 py-[5px] text-right tabular-nums whitespace-nowrap";
const labelBase =
  "sticky left-0 z-10 min-w-[260px] border-b border-r border-flow-grid px-3 py-[5px] text-left";

export function FluxoView({
  eyebrow,
  titulo,
  descricao,
  data,
  exportName,
  labelEntradas = "Entradas",
  labelSaidas = "Saídas",
}: {
  eyebrow: string;
  titulo: string;
  descricao: string;
  data: FluxoData;
  exportName: string;
  labelEntradas?: string;
  labelSaidas?: string;
}) {
  const { fileName, erro, abrirSeletor, exportar } = useFluxo();
  const view = trimMeses(data);
  const { totalEntradas, totalSaidas, operacional, inicial, acumulado } =
    computeTotais(view);
  const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-flow-saldo">
            {eyebrow}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            {titulo}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{descricao}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {fileName ? `Fonte: ${fileName}` : "Fonte: planilha base importada anteriormente"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={abrirSeletor}>
            <Upload className="size-4" />
            Importar planilha base
          </Button>
          <Button onClick={() => exportar(data, exportName)}>
            <Download className="size-4" />
            Baixar backup em Excel
          </Button>
        </div>
      </header>

      {erro && (
        <p className="rounded-md border border-flow-out/30 bg-flow-out-bg px-3 py-2 text-sm text-flow-out">
          {erro}
        </p>
      )}

      <section className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          icon={<TrendingUp className="size-4" />}
          label={`Total de ${labelEntradas.toLowerCase()}`}
          value={sum(totalEntradas)}
          tone="in"
        />
        <SummaryCard
          icon={<TrendingDown className="size-4" />}
          label={`Total de ${labelSaidas.toLowerCase()}`}
          value={sum(totalSaidas)}
          tone="out"
        />
        <SummaryCard
          icon={<Wallet className="size-4" />}
          label="Saldo acumulado"
          value={acumulado[acumulado.length - 1] ?? 0}
          tone="saldo"
        />
      </section>

      <FluxoCharts data={view} />

      <section className="overflow-hidden rounded-xl border border-flow-grid bg-card shadow-elegant">
        <div className="overflow-auto">
          <table className="w-full border-collapse text-[12px] leading-tight">
            <thead>
              <tr className="bg-flow-total-bg text-foreground">
                <th
                  className={`${labelBase} bg-flow-total-bg text-xs font-semibold uppercase tracking-wide`}
                >
                  Categoria financeira
                </th>
                {view.meses.map((m) => (
                  <th
                    key={m}
                    className={`${cellBase} text-center text-xs font-semibold uppercase tracking-wide`}
                  >
                    {mesLabel(m)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <Row
                label="Saldo Inicial Caixa"
                values={inicial}
                rowClass="bg-flow-saldo-bg font-semibold text-flow-saldo"
              />
              <Row
                label={labelEntradas}
                values={totalEntradas}
                rowClass="bg-flow-in-bg font-semibold text-flow-in"
              />
              {view.entradas.map((r) => (
                <Row
                  key={r.categoria}
                  label={r.categoria}
                  values={r.valores}
                  rowClass="bg-card text-flow-in hover:bg-flow-in-bg/50"
                  indent
                />
              ))}
              <Row
                label={labelSaidas}
                values={totalSaidas}
                rowClass="bg-flow-out-bg font-semibold text-flow-out"
              />
              {view.saidas.map((r) => (
                <Row
                  key={r.categoria}
                  label={r.categoria}
                  values={r.valores}
                  rowClass="bg-card text-flow-out hover:bg-flow-out-bg/50"
                  indent
                />
              ))}
              <Row
                label="Saldo Operacional"
                values={operacional}
                rowClass="bg-flow-total-bg font-semibold text-foreground"
              />
              <Row
                label="Saldo Acumulado"
                values={acumulado}
                rowClass="bg-flow-total-bg font-semibold text-flow-saldo"
              />
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Row({
  label,
  values,
  rowClass,
  indent,
}: {
  label: string;
  values: number[];
  rowClass: string;
  indent?: boolean;
}) {
  const bg = rowClass.split(" ").find((c) => c.startsWith("bg-")) ?? "bg-card";
  return (
    <tr className={`${rowClass} transition-colors`}>
      <td className={`${labelBase} ${bg} ${indent ? "pl-6 font-normal" : ""}`}>{label}</td>
      {values.map((v, i) => (
        <td key={i} className={cellBase}>
          {formatValor(v)}
        </td>
      ))}
    </tr>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: "in" | "out" | "saldo";
}) {
  const toneClass = {
    in: "text-flow-in bg-flow-in-bg",
    out: "text-flow-out bg-flow-out-bg",
    saldo: "text-flow-saldo bg-flow-saldo-bg",
  }[tone];

  return (
    <div className="rounded-xl border border-flow-grid bg-card p-4 shadow-elegant">
      <div className="flex items-center gap-2">
        <span className={`inline-flex rounded-md p-1.5 ${toneClass}`}>{icon}</span>
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold tabular-nums text-foreground">
        {formatValor(value)}
      </p>
    </div>
  );
}
