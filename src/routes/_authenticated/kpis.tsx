import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Trash2, Wand2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useFluxo } from "@/lib/fluxo-store";
import {
  colunasDe,
  colunasNumericas,
  valoresUnicos,
  type Formato,
  type KpiConfig,
  type Operacao,
} from "@/lib/kpi-calc";
import { registrarLog } from "@/lib/logs";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/kpis")({
  head: () => ({
    meta: [
      { title: "Edição de KPIs | Painel Financeiro" },
      {
        name: "description",
        content:
          "Monte os indicadores da apresentação escolhendo colunas, operações e filtros da planilha base.",
      },
      { property: "og:title", content: "Edição de KPIs | Painel Financeiro" },
      {
        property: "og:description",
        content: "Configure indicadores financeiros a partir das colunas da planilha base.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: KpisPage,
});

const SEM_FILTRO = "__sem_filtro__";

function KpisPage() {
  const { rows } = useFluxo();
  const { isAdmin, user } = useSession();
  const [configs, setConfigs] = useState<KpiConfig[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const colunas = useMemo(() => colunasDe(rows), [rows]);
  const numericas = useMemo(() => colunasNumericas(rows), [rows]);

  const [titulo, setTitulo] = useState("");
  const [coluna, setColuna] = useState("");
  const [operacao, setOperacao] = useState<Operacao>("soma");
  const [formato, setFormato] = useState<Formato>("moeda");
  const [filtroColuna, setFiltroColuna] = useState(SEM_FILTRO);
  const [filtroValor, setFiltroValor] = useState("");
  const [comparar, setComparar] = useState(true);

  async function carregar() {
    const { data } = await supabase
      .from("kpi_configs")
      .select("*")
      .order("ordem", { ascending: true });
    setConfigs((data ?? []) as KpiConfig[]);
  }

  useEffect(() => {
    void carregar();
  }, []);

  const valoresFiltro = useMemo(
    () => (filtroColuna === SEM_FILTRO ? [] : valoresUnicos(rows, filtroColuna)),
    [rows, filtroColuna],
  );

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setSalvando(true);
    const { error } = await supabase.from("kpi_configs").insert({
      titulo,
      coluna: operacao === "contagem" ? (coluna || colunas[0] || "—") : coluna,
      operacao,
      formato,
      filtro_coluna: filtroColuna === SEM_FILTRO ? null : filtroColuna,
      filtro_valor: filtroColuna === SEM_FILTRO ? null : filtroValor || null,
      comparar_periodo: comparar,
      ordem: configs.length,
      criado_por: user?.id ?? null,
    });
    setSalvando(false);
    if (error) {
      setErro(error.message);
      return;
    }
    void registrarLog("kpi_alterado", `KPI "${titulo}" criado`);
    setTitulo("");
    setFiltroValor("");
    await carregar();
  }

  async function remover(k: KpiConfig) {
    const { error } = await supabase.from("kpi_configs").delete().eq("id", k.id);
    if (error) {
      setErro(error.message);
      return;
    }
    void registrarLog("kpi_alterado", `KPI "${k.titulo}" removido`);
    await carregar();
  }

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <header>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Apresentação
        </p>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Wand2 className="size-5" /> Edição de KPIs
        </h1>
        <p className="text-sm text-muted-foreground">
          Escolha a coluna da planilha base, a operação e um filtro opcional. Cada KPI vira um
          card na aba de apresentação.
        </p>
      </header>

      {!rows.length && (
        <p className="rounded-lg border border-flow-grid bg-card p-3 text-sm text-muted-foreground shadow-elegant">
          Importe a planilha base na aba Fluxo de Caixa para listar as colunas disponíveis.
        </p>
      )}

      {isAdmin && (
        <form
          onSubmit={adicionar}
          className="grid gap-3 rounded-xl border border-flow-grid bg-card p-4 shadow-elegant md:grid-cols-3"
        >
          <div className="space-y-1.5">
            <Label htmlFor="k-titulo">Título do card</Label>
            <Input
              id="k-titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex.: Receita total"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label>Operação</Label>
            <Select value={operacao} onValueChange={(v) => setOperacao(v as Operacao)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="soma">Soma</SelectItem>
                <SelectItem value="media">Média</SelectItem>
                <SelectItem value="contagem">Contagem de registros</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Coluna do valor</Label>
            <Select
              value={coluna}
              onValueChange={setColuna}
              disabled={operacao === "contagem"}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a coluna" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {(numericas.length ? numericas : colunas).map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Filtrar por coluna (opcional)</Label>
            <Select
              value={filtroColuna}
              onValueChange={(v) => {
                setFiltroColuna(v);
                setFiltroValor("");
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value={SEM_FILTRO}>Sem filtro</SelectItem>
                {colunas.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Valor do filtro</Label>
            <Select
              value={filtroValor}
              onValueChange={setFiltroValor}
              disabled={filtroColuna === SEM_FILTRO}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {valoresFiltro.map((v) => (
                  <SelectItem key={v} value={v}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Formato</Label>
            <Select value={formato} onValueChange={(v) => setFormato(v as Formato)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="moeda">Moeda (R$)</SelectItem>
                <SelectItem value="numero">Número</SelectItem>
                <SelectItem value="inteiro">Inteiro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 md:col-span-2">
            <Switch id="comparar" checked={comparar} onCheckedChange={setComparar} />
            <Label htmlFor="comparar" className="text-sm font-normal">
              Comparar com o período anterior equivalente
            </Label>
          </div>

          <div className="flex items-center gap-3 md:col-span-3">
            <Button type="submit" disabled={salvando}>
              {salvando ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Adicionar KPI
            </Button>
            {erro && <span className="text-xs text-destructive">{erro}</span>}
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-xl border border-flow-grid bg-card shadow-elegant">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Título</th>
              <th className="px-3 py-2 text-left">Operação</th>
              <th className="px-3 py-2 text-left">Coluna</th>
              <th className="px-3 py-2 text-left">Filtro</th>
              <th className="px-3 py-2 text-left">Formato</th>
              {isAdmin && <th className="px-3 py-2" />}
            </tr>
          </thead>
          <tbody>
            {configs.map((k) => (
              <tr key={k.id} className="border-t border-flow-grid">
                <td className="px-3 py-2 font-medium">{k.titulo}</td>
                <td className="px-3 py-2 text-muted-foreground">{k.operacao}</td>
                <td className="px-3 py-2 text-muted-foreground">
                  {k.operacao === "contagem" ? "—" : k.coluna}
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {k.filtro_coluna ? `${k.filtro_coluna} = ${k.filtro_valor}` : "—"}
                </td>
                <td className="px-3 py-2 text-muted-foreground">{k.formato}</td>
                {isAdmin && (
                  <td className="px-3 py-2 text-right">
                    <Button variant="ghost" size="sm" onClick={() => void remover(k)}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </td>
                )}
              </tr>
            ))}
            {!configs.length && (
              <tr>
                <td
                  colSpan={isAdmin ? 6 : 5}
                  className="px-3 py-6 text-center text-sm text-muted-foreground"
                >
                  Nenhum KPI configurado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
