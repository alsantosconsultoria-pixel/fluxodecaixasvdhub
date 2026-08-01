import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Presentation } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { mesLabel } from "@/lib/fluxo";
import { useFluxo } from "@/lib/fluxo-store";
import {
  calcularKpis,
  colunasDe,
  formatarKpi,
  mesesDe,
  type KpiConfig,
} from "@/lib/kpi-calc";

export const Route = createFileRoute("/_authenticated/apresentacao")({
  head: () => ({
    meta: [
      { title: "Apresentação de Resultados | Painel Financeiro" },
      {
        name: "description",
        content:
          "KPIs financeiros configuráveis por período, com comparação automática com o período anterior.",
      },
      { property: "og:title", content: "Apresentação de Resultados | Painel Financeiro" },
      {
        property: "og:description",
        content: "Indicadores financeiros por intervalo de datas para apresentação de resultados.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ApresentacaoPage,
});

const TODOS = "__todos__";

function ApresentacaoPage() {
  const { rows } = useFluxo();
  const [configs, setConfigs] = useState<KpiConfig[]>([]);
  const [colunaData, setColunaData] = useState("");
  const [de, setDe] = useState<string | null>(null);
  const [ate, setAte] = useState<string | null>(null);

  useEffect(() => {
    void supabase
      .from("kpi_configs")
      .select("*")
      .order("ordem", { ascending: true })
      .then(({ data }) => setConfigs((data ?? []) as KpiConfig[]));
  }, []);

  const colunasData = useMemo(
    () => colunasDe(rows).filter((c) => /data|venc|baixa|emiss/i.test(c)),
    [rows],
  );

  useEffect(() => {
    if (!colunaData && colunasData.length) setColunaData(colunasData[0]);
  }, [colunasData, colunaData]);

  const meses = useMemo(
    () => (colunaData ? mesesDe(rows, colunaData) : []),
    [rows, colunaData],
  );

  const resultados = useMemo(
    () =>
      colunaData ? calcularKpis(rows, configs, { colunaData, de, ate }, meses) : [],
    [rows, configs, colunaData, de, ate, meses],
  );

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <header>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Resultados
        </p>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Presentation className="size-5" /> Apresentação financeira
        </h1>
        <p className="text-sm text-muted-foreground">
          Indicadores calculados diretamente sobre a planilha base, no intervalo de datas
          escolhido.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-flow-grid bg-card p-3 shadow-elegant">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Referência
        </span>
        <Select value={colunaData} onValueChange={setColunaData}>
          <SelectTrigger className="h-9 w-[220px]">
            <SelectValue placeholder="Coluna de data" />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {(colunasData.length ? colunasData : colunasDe(rows)).map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={de ?? TODOS} onValueChange={(v) => setDe(v === TODOS ? null : v)}>
          <SelectTrigger className="h-9 w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            <SelectItem value={TODOS}>Desde o início</SelectItem>
            {meses.map((m) => (
              <SelectItem key={m} value={m}>
                {mesLabel(m)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">até</span>
        <Select value={ate ?? TODOS} onValueChange={(v) => setAte(v === TODOS ? null : v)}>
          <SelectTrigger className="h-9 w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            <SelectItem value={TODOS}>Até o fim</SelectItem>
            {meses.map((m) => (
              <SelectItem key={m} value={m}>
                {mesLabel(m)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!rows.length && (
        <p className="rounded-lg border border-flow-grid bg-card p-3 text-sm text-muted-foreground shadow-elegant">
          Importe a planilha base na aba Fluxo de Caixa para calcular os indicadores.
        </p>
      )}

      {!configs.length ? (
        <p className="rounded-lg border border-flow-grid bg-card p-3 text-sm text-muted-foreground shadow-elegant">
          Nenhum KPI configurado. Monte os indicadores na aba “Editar KPIs”.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {resultados.map((r) => {
            const positivo = (r.variacao ?? 0) >= 0;
            return (
              <article
                key={r.config.id}
                className="rounded-xl border border-flow-grid bg-card p-4 shadow-elegant"
              >
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {r.config.titulo}
                </p>
                <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">
                  {formatarKpi(r.valor, r.config.formato)}
                </p>
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{r.registros.toLocaleString("pt-BR")} registros</span>
                  {r.variacao != null && (
                    <span
                      className={`inline-flex items-center gap-1 font-medium ${
                        positivo ? "text-flow-entrada" : "text-flow-saida"
                      }`}
                      title="Comparação com o período anterior de mesma duração"
                    >
                      {positivo ? (
                        <ArrowUpRight className="size-3.5" />
                      ) : (
                        <ArrowDownRight className="size-3.5" />
                      )}
                      {Math.abs(r.variacao).toFixed(1)}%
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
