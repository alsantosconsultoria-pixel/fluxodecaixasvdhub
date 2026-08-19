import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Boxes,
  Loader2,
  Percent,
  Save,
  Trash2,
  TrendingUp,
  Upload,
  Wallet,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  formatarData,
  formatarMoeda,
  formatarPct,
  normalizarVendas,
  rankingVendedores,
  resumir,
  type TipoVenda,
} from "@/lib/cmv";
import { useCmv } from "@/lib/cmv-store";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/cmv")({
  head: () => ({
    meta: [
      { title: "Análise de CMV | Painel Financeiro" },
      {
        name: "description",
        content:
          "Analise o CMV por placa, ranking de vendedores, margens, comissões apuradas e vendas com margem negativa.",
      },
      { property: "og:title", content: "Análise de CMV | Painel Financeiro" },
      {
        property: "og:description",
        content:
          "Analise o CMV por placa, ranking de vendedores, margens, comissões apuradas e vendas com margem negativa.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CmvPage,
});

type FiltroTipo = "todos" | TipoVenda;

function Kpi({
  titulo,
  valor,
  detalhe,
  icone: Icone,
  tom = "padrao",
}: {
  titulo: string;
  valor: string;
  detalhe?: string;
  icone: typeof Wallet;
  tom?: "padrao" | "positivo" | "negativo";
}) {
  const cor =
    tom === "positivo"
      ? "text-emerald-600"
      : tom === "negativo"
        ? "text-destructive"
        : "text-foreground";
  return (
    <div className="rounded-xl border border-flow-grid bg-card/80 p-4 shadow-sm backdrop-blur">
      <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
        <span>{titulo}</span>
        <Icone className="size-4" />
      </div>
      <p className={`mt-2 text-xl font-semibold tabular-nums ${cor}`}>{valor}</p>
      {detalhe && <p className="mt-1 text-xs text-muted-foreground">{detalhe}</p>}
    </div>
  );
}

function CmvPage() {
  const { isAdmin } = useSession();
  const { rows, arquivo, gravadoEm, erro, ocupado, abrirSeletor, gravar, zerar } = useCmv();
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [tipo, setTipo] = useState<FiltroTipo>("todos");

  const todas = useMemo(() => normalizarVendas(rows), [rows]);

  const vendas = useMemo(
    () =>
      todas.filter((v) => {
        if (de && (!v.data || v.data < de)) return false;
        if (ate && (!v.data || v.data > ate)) return false;
        if (tipo !== "todos" && v.tipo !== tipo) return false;
        return true;
      }),
    [todas, de, ate, tipo],
  );

  const resumo = useMemo(() => resumir(vendas), [vendas]);
  const ranking = useMemo(() => rankingVendedores(vendas), [vendas]);
  const negativas = useMemo(
    () => vendas.filter((v) => v.margem < 0).sort((a, b) => a.lucro - b.lucro),
    [vendas],
  );
  const proprio = useMemo(() => resumir(vendas.filter((v) => v.tipo === "Próprio")), [vendas]);
  const consignado = useMemo(
    () => resumir(vendas.filter((v) => v.tipo === "Consignado")),
    [vendas],
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Análise de CMV</h1>
          <p className="text-sm text-muted-foreground">
            {arquivo ? `Base: ${arquivo} · ` : ""}
            {todas.length} vendas
            {gravadoEm ? ` · gravado em ${new Date(gravadoEm).toLocaleString("pt-BR")}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={abrirSeletor}>
            <Upload className="size-4" /> Subir planilha
          </Button>
          {isAdmin && (
            <>
              <Button size="sm" variant="secondary" onClick={() => void gravar()} disabled={ocupado}>
                {ocupado ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                Gravar dados
              </Button>
              <Button size="sm" variant="outline" onClick={() => void zerar()} disabled={ocupado}>
                <Trash2 className="size-4" /> Zerar
              </Button>
            </>
          )}
        </div>
      </header>

      {erro && (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {erro}
        </p>
      )}

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-flow-grid bg-card/70 p-4 backdrop-blur">
        <div className="space-y-1">
          <Label htmlFor="cmv-de">De</Label>
          <Input id="cmv-de" type="date" value={de} onChange={(e) => setDe(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cmv-ate">Até</Label>
          <Input id="cmv-ate" type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Modalidade</Label>
          <div className="flex gap-1">
            {(["todos", "Próprio", "Consignado"] as FiltroTipo[]).map((t) => (
              <Button
                key={t}
                size="sm"
                variant={tipo === t ? "default" : "outline"}
                onClick={() => setTipo(t)}
              >
                {t === "todos" ? "Todos" : t}
              </Button>
            ))}
          </div>
        </div>
        {(de || ate || tipo !== "todos") && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setDe("");
              setAte("");
              setTipo("todos");
            }}
          >
            Limpar filtros
          </Button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          titulo="Faturamento total (Vendas)"
          valor={formatarMoeda(resumo.faturamento)}
          detalhe={`${resumo.quantidade} veículos`}
          icone={Wallet}
        />
        <Kpi
          titulo="Lucro líquido"
          valor={formatarMoeda(resumo.lucro)}
          detalhe={`${formatarPct(resumo.margem)} do faturamento`}
          icone={TrendingUp}
          tom={resumo.lucro >= 0 ? "positivo" : "negativo"}
        />
        <Kpi
          titulo="Margem de vendas geral"
          valor={formatarPct(resumo.margem)}
          detalhe={`Próprio ${formatarPct(proprio.margem)} · Consignado ${formatarPct(consignado.margem)}`}
          icone={Percent}
          tom={resumo.margem >= 0 ? "positivo" : "negativo"}
        />
        <Kpi
          titulo="Provisão de comissões"
          valor={formatarMoeda(resumo.comissoes)}
          detalhe={`CMV total ${formatarMoeda(resumo.cmv)}`}
          icone={Boxes}
        />
      </div>

      <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-destructive">
          <AlertTriangle className="size-4" />
          Margens negativas ({negativas.length}) ·{" "}
          {formatarMoeda(negativas.reduce((a, v) => a + v.lucro, 0))}
        </div>
        {negativas.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Nenhuma venda com margem negativa.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {negativas.map((v) => (
              <li
                key={`${v.placa}-${v.data}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-card/70 px-3 py-2 text-sm"
              >
                <span className="font-medium">
                  {v.placa} · {v.modelo}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatarData(v.data)} · {v.vendedor} · {v.tipo}
                </span>
                <span className="tabular-nums">Venda {formatarMoeda(v.venda)}</span>
                <span className="tabular-nums">CMV {formatarMoeda(v.custoTotal)}</span>
                <Badge variant="destructive" className="tabular-nums">
                  {formatarMoeda(v.lucro)} ({formatarPct(v.margem)})
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Tabs defaultValue="linhas">
        <TabsList>
          <TabsTrigger value="linhas">Análise por linha</TabsTrigger>
          <TabsTrigger value="ranking">Ranking de vendedores</TabsTrigger>
        </TabsList>

        <TabsContent value="linhas" className="mt-4">
          <div className="overflow-x-auto rounded-xl border border-flow-grid bg-card/80 backdrop-blur">
            <table className="w-full min-w-[1100px] text-sm">
              <thead className="sticky top-0 bg-muted/60 text-xs uppercase text-muted-foreground">
                <tr>
                  {[
                    "Dt. venda",
                    "Placa",
                    "Modelo",
                    "Tipo",
                    "Dias",
                    "Compra",
                    "Impostos",
                    "Pátio/Lanç.",
                    "Comissão",
                    "CMV",
                    "Venda",
                    "Lucro líquido",
                    "Margem",
                    "Vendedor",
                  ].map((h, i) => (
                    <th key={h} className={`px-3 py-2 ${i > 3 ? "text-right" : "text-left"}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vendas.map((v) => {
                  const impostos = v.pis + v.cofins + v.icms + v.ibs + v.cbs;
                  return (
                    <tr
                      key={`${v.placa}-${v.data}-${v.venda}`}
                      className="border-t border-flow-grid/60 hover:bg-muted/30"
                    >
                      <td className="px-3 py-2">{formatarData(v.data)}</td>
                      <td className="px-3 py-2 font-medium">{v.placa}</td>
                      <td className="px-3 py-2">{v.modelo}</td>
                      <td className="px-3 py-2">
                        <Badge variant={v.tipo === "Próprio" ? "secondary" : "outline"}>
                          {v.tipo}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{v.dias}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatarMoeda(v.compra)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatarMoeda(impostos)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatarMoeda(v.patio + v.lancamentos)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatarMoeda(v.comissao)}
                      </td>
                      <td className="px-3 py-2 text-right font-medium tabular-nums">
                        {formatarMoeda(v.custoTotal)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatarMoeda(v.venda)}</td>
                      <td
                        className={`px-3 py-2 text-right tabular-nums ${v.lucro < 0 ? "text-destructive" : "text-emerald-600"}`}
                      >
                        {formatarMoeda(v.lucro)}
                      </td>
                      <td
                        className={`px-3 py-2 text-right tabular-nums ${v.margem < 0 ? "font-semibold text-destructive" : ""}`}
                      >
                        {formatarPct(v.margem)}
                      </td>
                      <td className="px-3 py-2">{v.vendedor}</td>
                    </tr>
                  );
                })}
                {vendas.length === 0 && (
                  <tr>
                    <td colSpan={14} className="px-3 py-8 text-center text-muted-foreground">
                      Nenhuma venda no período. Suba a planilha de veículos vendidos.
                    </td>
                  </tr>
                )}
              </tbody>
              {vendas.length > 0 && (
                <tfoot className="border-t-2 border-flow-grid bg-muted/40 font-semibold">
                  <tr>
                    <td className="px-3 py-2" colSpan={9}>
                      Total ({resumo.quantidade} veículos)
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatarMoeda(resumo.cmv)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatarMoeda(resumo.faturamento)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatarMoeda(resumo.lucro)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatarPct(resumo.margem)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </TabsContent>

        <TabsContent value="ranking" className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Kpi
              titulo="Margem Próprio"
              valor={formatarPct(proprio.margem)}
              detalhe={`${proprio.quantidade} vendas · ${formatarMoeda(proprio.faturamento)}`}
              icone={Percent}
            />
            <Kpi
              titulo="Margem Consignado"
              valor={formatarPct(consignado.margem)}
              detalhe={`${consignado.quantidade} vendas · ${formatarMoeda(consignado.faturamento)}`}
              icone={Percent}
            />
            <Kpi
              titulo="Comissões apuradas"
              valor={formatarMoeda(resumo.comissoes)}
              detalhe={`Próprio ${formatarMoeda(proprio.comissoes)} · Consignado ${formatarMoeda(consignado.comissoes)}`}
              icone={Boxes}
            />
          </div>

          <div className="overflow-x-auto rounded-xl border border-flow-grid bg-card/80 backdrop-blur">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">#</th>
                  <th className="px-3 py-2 text-left">Vendedor</th>
                  <th className="px-3 py-2 text-right">Vendas</th>
                  <th className="px-3 py-2 text-right">Faturamento</th>
                  <th className="px-3 py-2 text-right">CMV</th>
                  <th className="px-3 py-2 text-right">Lucro líquido</th>
                  <th className="px-3 py-2 text-right">Margem</th>
                  <th className="px-3 py-2 text-right">Comissão</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((r, i) => (
                  <tr key={r.vendedor} className="border-t border-flow-grid/60 hover:bg-muted/30">
                    <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                    <td className="px-3 py-2 font-medium">{r.vendedor}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{r.quantidade}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatarMoeda(r.faturamento)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatarMoeda(r.cmv)}</td>
                    <td
                      className={`px-3 py-2 text-right tabular-nums ${r.lucro < 0 ? "text-destructive" : "text-emerald-600"}`}
                    >
                      {formatarMoeda(r.lucro)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatarPct(r.margem)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatarMoeda(r.comissoes)}
                    </td>
                  </tr>
                ))}
                {ranking.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">
                      Sem dados para o período selecionado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
