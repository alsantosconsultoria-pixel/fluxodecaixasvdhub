import { useMemo, useState } from "react";
import { Download, TrendingDown, TrendingUp, Percent } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FluxoFiltros } from "@/components/FluxoFiltros";
import { useFluxo } from "@/lib/fluxo-store";
import {
  FILTROS_VAZIOS,
  aplicarFiltros,
  categoriasDe,
  formatValor,
  mergeFluxo,
  periodoLabel,
  type FluxoData,
  type Filtros,
  type Linha,
} from "@/lib/fluxo";

type GrupoId =
  | "receita"
  | "deducoes"
  | "custos"
  | "pessoal"
  | "administrativas"
  | "financeiras"
  | "socios";

const REGRAS: { id: GrupoId; termos: string[] }[] = [
  { id: "deducoes", termos: ["imposto", "tribut", "das ", "simples", "icms", "iss", "pis", "cofins", "irpj", "csll"] },
  { id: "custos", termos: ["fornecedor", "mercadoria", "compra", "materia", "insumo", "frete", "custo", "producao"] },
  { id: "pessoal", termos: ["folha", "salario", "pessoal", "pro-labore", "prolabore", "beneficio", "encargo", "ferias", "rescis", "vale ", "13"] },
  { id: "financeiras", termos: ["banco", "banc", "juros", "tarifa", "emprest", "financiamento", "financeir"] },
  { id: "socios", termos: ["socio", "lucro", "distribui", "dividendo", "retirada"] },
];

function normalizar(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function classificar(categoria: string): GrupoId {
  const c = normalizar(categoria);
  for (const r of REGRAS) if (r.termos.some((t) => c.includes(t))) return r.id;
  return "administrativas";
}

const soma = (linhas: Linha[], i: number) => linhas.reduce((a, r) => a + (r.valores[i] ?? 0), 0);

type Bloco = { id: GrupoId; titulo: string; linhas: Linha[] };

const TITULOS: Record<GrupoId, string> = {
  receita: "Receitas operacionais",
  deducoes: "Deduções e impostos",
  custos: "Custos das operações",
  pessoal: "Despesas com pessoal",
  administrativas: "Despesas administrativas",
  financeiras: "Despesas financeiras",
  socios: "Sócios e distribuição de lucros",
};

export function DreView() {
  const { bundle, fileName, abrirSeletor } = useFluxo();
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VAZIOS);
  const [modo, setModo] = useState<"realizado" | "total">("realizado");

  const baseR = bundle.realizado;
  const baseP = modo === "total" ? bundle.previsto : { meses: bundle.meses, entradas: [], saidas: [] };

  const [viewR, viewP] = useMemo(
    () => aplicarFiltros([baseR, baseP], filtros),
    [baseR, baseP, filtros],
  );
  const view: FluxoData = useMemo(() => mergeFluxo(viewR, viewP), [viewR, viewP]);
  const categorias = useMemo(() => categoriasDe(baseR, baseP), [baseR, baseP]);

  const blocos: Bloco[] = useMemo(() => {
    const mapa = new Map<GrupoId, Linha[]>();
    mapa.set("receita", view.entradas);
    for (const linha of view.saidas) {
      const g = classificar(linha.categoria);
      mapa.set(g, [...(mapa.get(g) ?? []), linha]);
    }
    return (Object.keys(TITULOS) as GrupoId[])
      .map((id) => ({ id, titulo: TITULOS[id], linhas: mapa.get(id) ?? [] }))
      .filter((b) => b.linhas.length > 0);
  }, [view]);

  const periodos = view.meses;
  const total = (id: GrupoId, i: number) =>
    soma(blocos.find((b) => b.id === id)?.linhas ?? [], i);

  const receita = periodos.map((_, i) => total("receita", i));
  const deducoes = periodos.map((_, i) => total("deducoes", i));
  const receitaLiquida = periodos.map((_, i) => receita[i] + deducoes[i]);
  const custos = periodos.map((_, i) => total("custos", i));
  const lucroBruto = periodos.map((_, i) => receitaLiquida[i] + custos[i]);
  const pessoal = periodos.map((_, i) => total("pessoal", i));
  const administrativas = periodos.map((_, i) => total("administrativas", i));
  const ebitda = periodos.map((_, i) => lucroBruto[i] + pessoal[i] + administrativas[i]);
  const financeiras = periodos.map((_, i) => total("financeiras", i));
  const resultado = periodos.map((_, i) => ebitda[i] + financeiras[i]);
  const socios = periodos.map((_, i) => total("socios", i));
  const resultadoFinal = periodos.map((_, i) => resultado[i] + socios[i]);

  const somaTudo = (a: number[]) => a.reduce((x, y) => x + y, 0);
  const receitaTotal = somaTudo(receita);
  const margem = receitaTotal ? (somaTudo(resultadoFinal) / receitaTotal) * 100 : 0;

  const exportarCsv = () => {
    const linhas: string[][] = [
      ["Linha", ...periodos.map(periodoLabel)],
      ["Receita bruta", ...receita.map(String)],
      ["Deduções e impostos", ...deducoes.map(String)],
      ["Receita líquida", ...receitaLiquida.map(String)],
      ["Custos", ...custos.map(String)],
      ["Lucro bruto", ...lucroBruto.map(String)],
      ["Pessoal", ...pessoal.map(String)],
      ["Administrativas", ...administrativas.map(String)],
      ["EBITDA", ...ebitda.map(String)],
      ["Financeiras", ...financeiras.map(String)],
      ["Resultado do período", ...resultado.map(String)],
      ["Sócios", ...socios.map(String)],
      ["Resultado após sócios", ...resultadoFinal.map(String)],
    ];
    const csv = linhas.map((l) => l.join(";")).join("\n");
    const url = URL.createObjectURL(new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `dre-gerencial-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-flow-saldo">
            Resultado gerencial
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            DRE Gerencial
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Estrutura de resultado montada a partir das categorias financeiras do fluxo de caixa
            (realizado por data da baixa, provisão por data de vencimento).
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {fileName ? `Fonte: ${fileName}` : "Fonte: planilha base importada anteriormente"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-md border border-flow-grid p-0.5">
            {(["realizado", "total"] as const).map((m) => (
              <Button
                key={m}
                size="sm"
                variant={modo === m ? "default" : "ghost"}
                className="h-8 px-3 text-xs"
                onClick={() => setModo(m)}
              >
                {m === "realizado" ? "Realizado" : "Com provisão"}
              </Button>
            ))}
          </div>
          <Button variant="outline" onClick={abrirSeletor}>
            Importar planilha base
          </Button>
          <Button onClick={exportarCsv}>
            <Download className="size-4" />
            Exportar DRE
          </Button>
        </div>
      </header>

      <FluxoFiltros
        meses={bundle.meses}
        categorias={categorias}
        filtros={filtros}
        onChange={setFiltros}
      />

      <section className="grid gap-4 sm:grid-cols-3">
        <Card
          icon={<TrendingUp className="size-4" />}
          label="Receita líquida"
          value={somaTudo(receitaLiquida)}
          tone="in"
        />
        <Card
          icon={<TrendingDown className="size-4" />}
          label="Custos e despesas"
          value={somaTudo(custos) + somaTudo(pessoal) + somaTudo(administrativas) + somaTudo(financeiras)}
          tone="out"
        />
        <Card
          icon={<Percent className="size-4" />}
          label="Margem líquida"
          value={somaTudo(resultadoFinal)}
          hint={`${margem.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% da receita bruta`}
          tone="saldo"
        />
      </section>

      <section className="overflow-hidden rounded-xl border border-flow-grid bg-card shadow-elegant">
        <div className="overflow-auto">
          <table className="w-full border-collapse text-[12px] leading-tight">
            <thead>
              <tr className="bg-flow-total-bg text-foreground">
                <th className="sticky left-0 z-10 min-w-[280px] border-b border-r border-flow-grid bg-flow-total-bg px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide">
                  Demonstrativo
                </th>
                {periodos.map((m) => (
                  <th
                    key={m}
                    className="border-b border-flow-grid px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide whitespace-nowrap"
                  >
                    {periodoLabel(m)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <Linhas titulo="Receita bruta" valores={receita} tone="in" forte />
              <Detalhe bloco={blocos.find((b) => b.id === "receita")} />
              <Linhas titulo="(-) Deduções e impostos" valores={deducoes} tone="out" forte />
              <Detalhe bloco={blocos.find((b) => b.id === "deducoes")} />
              <Linhas titulo="(=) Receita líquida" valores={receitaLiquida} tone="saldo" forte />
              <Linhas titulo="(-) Custos das operações" valores={custos} tone="out" forte />
              <Detalhe bloco={blocos.find((b) => b.id === "custos")} />
              <Linhas titulo="(=) Lucro bruto" valores={lucroBruto} tone="saldo" forte />
              <Linhas titulo="(-) Despesas com pessoal" valores={pessoal} tone="out" forte />
              <Detalhe bloco={blocos.find((b) => b.id === "pessoal")} />
              <Linhas
                titulo="(-) Despesas administrativas"
                valores={administrativas}
                tone="out"
                forte
              />
              <Detalhe bloco={blocos.find((b) => b.id === "administrativas")} />
              <Linhas titulo="(=) EBITDA gerencial" valores={ebitda} tone="saldo" forte />
              <Linhas titulo="(-) Despesas financeiras" valores={financeiras} tone="out" forte />
              <Detalhe bloco={blocos.find((b) => b.id === "financeiras")} />
              <Linhas titulo="(=) Resultado do período" valores={resultado} tone="saldo" forte />
              <Linhas titulo="(-) Sócios / distribuição" valores={socios} tone="out" forte />
              <Detalhe bloco={blocos.find((b) => b.id === "socios")} />
              <Linhas titulo="(=) Resultado após sócios" valores={resultadoFinal} tone="saldo" forte />
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

const cell =
  "border-b border-flow-grid px-3 py-[5px] text-right tabular-nums whitespace-nowrap";
const first = "sticky left-0 z-10 min-w-[280px] border-b border-r border-flow-grid px-3 py-[5px] text-left";

function Linhas({
  titulo,
  valores,
  tone,
  forte,
}: {
  titulo: string;
  valores: number[];
  tone: "in" | "out" | "saldo";
  forte?: boolean;
}) {
  const cls = {
    in: "bg-flow-in-bg text-flow-in",
    out: "bg-flow-out-bg text-flow-out",
    saldo: "bg-flow-saldo-bg text-flow-saldo",
  }[tone];
  const bg = cls.split(" ")[0];
  return (
    <tr className={`${cls} ${forte ? "font-semibold" : ""}`}>
      <td className={`${first} ${bg}`}>{titulo}</td>
      {valores.map((v, i) => (
        <td key={i} className={cell}>
          {formatValor(v)}
        </td>
      ))}
    </tr>
  );
}

function Detalhe({ bloco }: { bloco?: Bloco }) {
  if (!bloco) return null;
  return (
    <>
      {bloco.linhas.map((l) => (
        <tr key={`${bloco.id}-${l.categoria}`} className="bg-card text-muted-foreground">
          <td className={`${first} bg-card pl-7`}>{l.categoria}</td>
          {l.valores.map((v, i) => (
            <td key={i} className={cell}>
              {formatValor(v)}
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function Card({
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
