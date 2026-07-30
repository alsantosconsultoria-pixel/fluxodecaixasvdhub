import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Download, Upload, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import * as XLSX from "xlsx";

import { Button } from "@/components/ui/button";
import { FluxoCharts } from "@/components/FluxoCharts";
import baseData from "@/data/fluxo-caixa.json";
import {
  buildFluxo,
  computeTotais,
  formatValor,
  mesLabel,
  type FluxoData,
} from "@/lib/fluxo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fluxo de Caixa Mensal | Painel Financeiro" },
      {
        name: "description",
        content:
          "Fluxo de caixa mensal com entradas e saídas por categoria financeira, importação da planilha base e backup em Excel.",
      },
      { property: "og:title", content: "Fluxo de Caixa Mensal | Painel Financeiro" },
      {
        property: "og:description",
        content:
          "Entradas e saídas por categoria financeira, saldo operacional e saldo acumulado por mês.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FluxoDeCaixa,
});

const cellBase =
  "border-b border-flow-grid px-3 py-[5px] text-right tabular-nums whitespace-nowrap";
const labelBase =
  "sticky left-0 z-10 min-w-[260px] border-b border-r border-flow-grid px-3 py-[5px] text-left";

function FluxoDeCaixa() {
  const [data, setData] = useState<FluxoData>(baseData as FluxoData);
  const [fileName, setFileName] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { totalEntradas, totalSaidas, operacional, inicial, acumulado } =
    computeTotais(data);

  const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

  async function handleImport(file: File) {
    setErro(null);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { cellDates: true });
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
        wb.Sheets[wb.SheetNames[0]],
      );
      const next = buildFluxo(rows);
      if (!next.meses.length) {
        setErro("Nenhum lançamento válido encontrado nesta planilha.");
        return;
      }
      setData(next);
      setFileName(file.name);
    } catch {
      setErro("Não foi possível ler o arquivo. Envie um .xlsx válido.");
    }
  }

  function handleExport() {
    const header = ["Categoria", ...data.meses.map(mesLabel)];
    const rows: (string | number)[][] = [
      header,
      ["Saldo Inicial Caixa", ...inicial],
      ["Entradas", ...totalEntradas],
      ...data.entradas.map((r) => [r.categoria, ...r.valores]),
      ["Saídas", ...totalSaidas],
      ...data.saidas.map((r) => [r.categoria, ...r.valores]),
      ["Saldo Operacional", ...operacional],
      ["Saldo Acumulado", ...acumulado],
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = header.map((_, i) => ({ wch: i === 0 ? 42 : 14 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Fluxo de Caixa");
    const hoje = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `backup-fluxo-de-caixa-${hoje}.xlsx`);
  }

  return (
    <main className="min-h-screen bg-gradient-page px-4 py-8 md:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Painel financeiro
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              Fluxo de Caixa
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {fileName
                ? `Fonte: ${fileName}`
                : "Fonte: planilha base importada anteriormente"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleImport(f);
                e.target.value = "";
              }}
            />
            <Button variant="outline" onClick={() => inputRef.current?.click()}>
              <Upload className="size-4" />
              Importar planilha base
            </Button>
            <Button onClick={handleExport}>
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
            label="Total de entradas"
            value={sum(totalEntradas)}
            tone="in"
          />
          <SummaryCard
            icon={<TrendingDown className="size-4" />}
            label="Total de saídas"
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

        <FluxoCharts data={data} />

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
                  {data.meses.map((m) => (
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
                  label="Entradas"
                  values={totalEntradas}
                  rowClass="bg-flow-in-bg font-semibold text-flow-in"
                />
                {data.entradas.map((r) => (
                  <Row
                    key={r.categoria}
                    label={r.categoria}
                    values={r.valores}
                    rowClass="bg-card text-flow-in hover:bg-flow-in-bg/50"
                    indent
                  />
                ))}
                <Row
                  label="Saídas"
                  values={totalSaidas}
                  rowClass="bg-flow-out-bg font-semibold text-flow-out"
                />
                {data.saidas.map((r) => (
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
    </main>
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
