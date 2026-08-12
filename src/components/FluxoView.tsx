import { useMemo, useState } from "react";
import { Download, Upload, TrendingUp, TrendingDown, Wallet, Landmark } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ContasFiltro } from "@/components/ContasFiltro";

import { FluxoCharts } from "@/components/FluxoCharts";
import { FluxoFiltros } from "@/components/FluxoFiltros";
import { ProjecaoCards } from "@/components/ProjecaoCards";
import { useBancos } from "@/lib/bancos";
import { useFluxo } from "@/lib/fluxo-store";
import {
  FILTROS_VAZIOS,
  aplicarFiltros,
  categoriasDe,
  computeTotais,
  detalhesDe,
  fluxoVazio,
  formatValor,
  mergeFluxo,
  mesLabel,
  saldoBancarioSerie,
  valorEm,
  type FluxoData,
  type Filtros,
} from "@/lib/fluxo";

const cellBase =
  "border-b border-flow-grid px-3 py-[5px] text-right tabular-nums whitespace-nowrap";
const labelBase =
  "sticky left-0 z-10 min-w-[260px] border-b border-r border-flow-grid px-3 py-[5px] text-left";

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");


export function FluxoView({
  eyebrow,
  titulo,
  descricao,
  realizado,
  previsto,
  exportName,
  labelEntradas = "Entradas",
  labelSaidas = "Saídas",
  granularidade,
  onGranularidade,
  granularidadeDisponivel = true,
}: {
  eyebrow: string;
  titulo: string;
  descricao: string;
  realizado?: FluxoData;
  previsto?: FluxoData;
  exportName: string;
  labelEntradas?: string;
  labelSaidas?: string;
  granularidade?: "mes" | "dia";
  onGranularidade?: (g: "mes" | "dia") => void;
  granularidadeDisponivel?: boolean;
}) {
  const { bundle, fileName, erro, abrirSeletor, exportar, contas, contasSelecionadas, setContasSelecionadas, rows } =
    useFluxo();
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VAZIOS);
  const [detalhe, setDetalhe] = useState<string | null>(null);
  const { saldoTotal, bancos } = useBancos();

  const bancosAtivos = useMemo(() => {
    if (!contasSelecionadas.length) return bancos;
    const alvo = contasSelecionadas.map(norm);
    return bancos.filter((b) =>
      alvo.some(
        (a) =>
          (b.conta && a.includes(norm(b.conta))) ||
          (b.nome && a.includes(norm(b.nome))) ||
          norm(b.nome).includes(a),
      ),
    );
  }, [bancos, contasSelecionadas]);

  const saldoBancario = contasSelecionadas.length
    ? bancosAtivos.reduce((acc, b) => acc + b.saldo, 0)
    : saldoTotal;



  const eixo = realizado?.meses.length
    ? realizado.meses
    : previsto?.meses.length
      ? previsto.meses
      : bundle.meses;
  const baseR = realizado ?? fluxoVazio(eixo);
  const baseP = previsto ?? fluxoVazio(eixo);

  const [viewR, viewP] = useMemo(
    () => aplicarFiltros([baseR, baseP], filtros),
    [baseR, baseP, filtros],
  );
  const view = useMemo(() => mergeFluxo(viewR, viewP), [viewR, viewP]);

  const categorias = useMemo(() => categoriasDe(baseR, baseP), [baseR, baseP]);

  const { totalEntradas, totalSaidas, operacional, inicial, acumulado } = computeTotais(
    view,
    saldoBancario,
  );
  const previstoTotais = computeTotais(viewP);
  const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
  const temPrevisto = viewP.entradas.length + viewP.saidas.length > 0;
  const banco = useMemo(
    () => saldoBancarioSerie(viewR, viewP, saldoBancario),
    [viewR, viewP, saldoBancario],
  );

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
          {onGranularidade && (
            <div className="inline-flex rounded-md border border-flow-grid p-0.5">
              {(["dia", "mes"] as const).map((g) => (
                <Button
                  key={g}
                  size="sm"
                  variant={granularidade === g ? "default" : "ghost"}
                  className="h-8 px-3 text-xs"
                  disabled={g === "dia" && !granularidadeDisponivel}
                  onClick={() => onGranularidade(g)}
                >
                  {g === "dia" ? "Por dia" : "Por mês"}
                </Button>
              ))}
            </div>
          )}
          <Button variant="outline" onClick={abrirSeletor}>
            <Upload className="size-4" />
            Importar planilha base
          </Button>
          <Button onClick={() => exportar(view, exportName)}>
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

      {onGranularidade && !granularidadeDisponivel && (
        <p className="rounded-md border border-flow-grid bg-flow-total-bg px-3 py-2 text-xs text-muted-foreground">
          A visão diária exige a planilha base importada nesta sessão. Importe o arquivo para
          detalhar dia a dia.
        </p>
      )}

      <ContasFiltro
        contas={contas}
        selecionadas={contasSelecionadas}
        onChange={setContasSelecionadas}
      />


      <FluxoFiltros
        meses={baseR.meses.length ? baseR.meses : baseP.meses}
        categorias={categorias}
        filtros={filtros}
        onChange={setFiltros}
      />


      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={<TrendingUp className="size-4" />}
          label={`Total de ${labelEntradas.toLowerCase()}`}
          value={sum(totalEntradas)}
          hint={temPrevisto ? `Previsto: ${formatValor(sum(previstoTotais.totalEntradas))}` : undefined}
          tone="in"
        />
        <SummaryCard
          icon={<TrendingDown className="size-4" />}
          label={`Total de ${labelSaidas.toLowerCase()}`}
          value={sum(totalSaidas)}
          hint={temPrevisto ? `Previsto: ${formatValor(sum(previstoTotais.totalSaidas))}` : undefined}
          tone="out"
        />
        <SummaryCard
          icon={<Landmark className="size-4" />}
          label="Saldo bancário"
          value={banco.saldoAtual}
          hint={`Inicial: ${formatValor(banco.saldoInicial)} · Projetado: ${formatValor(
            banco.saldoFinal,
          )}`}
          tone="in"
        />
        <SummaryCard
          icon={<Wallet className="size-4" />}
          label={temPrevisto ? "Saldo acumulado projetado" : "Saldo acumulado"}
          value={acumulado[acumulado.length - 1] ?? 0}
          tone="saldo"
        />
      </section>

      {temPrevisto && <ProjecaoCards realizado={viewR} previsto={viewP} />}

      <FluxoCharts realizado={viewR} previsto={viewP} saldoBancario={saldoBancario} />


      <section className="overflow-hidden rounded-xl border border-flow-grid bg-card shadow-elegant">
        <div className="border-b border-flow-grid bg-flow-total-bg px-4 py-2 text-[11px] text-muted-foreground">
          Valores em <span className="font-medium text-foreground">negrito normal</span> são
          realizados (referência: <em>Data baixa</em>). Valores{" "}
          <span className="italic underline decoration-dashed underline-offset-2">
            sublinhados tracejados
          </span>{" "}
          contêm projeção (referência: <em>Data vencimento</em>). Passe o mouse sobre a célula
          para ver a composição.
        </div>
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
                title={
                  bancosAtivos.length
                    ? `Saldo bancário cadastrado: ${bancosAtivos
                        .map((b) => `${b.nome} ${formatValor(b.saldo)}`)

                        .join(" · ")}`
                    : "Cadastre os saldos bancários na aba Saldos Bancários"
                }
                values={inicial}
                rowClass="bg-flow-saldo-bg font-semibold text-flow-saldo"
              />
              <Row
                label={labelEntradas}
                values={totalEntradas}
                previstos={previstoTotais.totalEntradas}
                rowClass="bg-flow-in-bg font-semibold text-flow-in"
              />
              {view.entradas.map((r) => (
                <Row
                  key={r.categoria}
                  label={r.categoria}
                  values={r.valores}
                  previstos={view.meses.map((_, i) =>
                    valorEm(viewP, "entradas", r.categoria, i),
                  )}
                  rowClass="bg-card text-flow-in hover:bg-flow-in-bg/50"
                  indent
                />
              ))}
              <Row
                label={labelSaidas}
                values={totalSaidas}
                previstos={previstoTotais.totalSaidas}
                rowClass="bg-flow-out-bg font-semibold text-flow-out"
              />
              {view.saidas.map((r) => (
                <Row
                  key={r.categoria}
                  label={r.categoria}
                  values={r.valores}
                  previstos={view.meses.map((_, i) => valorEm(viewP, "saidas", r.categoria, i))}
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
                label={temPrevisto ? "Saldo Acumulado (projetado)" : "Saldo Acumulado"}
                values={acumulado}
                rowClass="bg-flow-total-bg font-semibold text-flow-saldo"
              />
              <Row
                label="Saldo Bancário"
                title="Saldo dos bancos + baixas realizadas; períodos futuros somam as projeções"
                values={banco.serie}
                rowClass="bg-flow-in-bg font-semibold text-flow-in"
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
  previstos,
  rowClass,
  indent,
  title: labelTitle,
}: {
  label: string;
  values: number[];
  previstos?: number[];
  rowClass: string;
  indent?: boolean;
  title?: string;
}) {
  const bg = rowClass.split(" ").find((c) => c.startsWith("bg-")) ?? "bg-card";
  return (
    <tr className={`${rowClass} transition-colors`}>
      <td className={`${labelBase} ${bg} ${indent ? "pl-6 font-normal" : ""}`} title={labelTitle}>
        {label}
      </td>
      {values.map((v, i) => {
        const prev = previstos?.[i] ?? 0;
        const real = v - prev;
        const temProj = prev !== 0;
        const title = previstos
          ? [
              `Realizado (coluna: Data baixa): ${formatValor(real)}`,
              `Previsto (coluna: Data vencimento): ${formatValor(prev)}`,
              `Total: ${formatValor(v)}`,
            ].join("\n")
          : undefined;
        return (
          <td
            key={i}
            title={title}
            className={`${cellBase} ${
              temProj ? "italic underline decoration-dashed underline-offset-2" : ""
            }`}
          >
            {formatValor(v)}
          </td>
        );
      })}
    </tr>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  hint?: string;
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
      {hint && <p className="mt-1 text-xs italic text-muted-foreground">{hint}</p>}
    </div>
  );
}
