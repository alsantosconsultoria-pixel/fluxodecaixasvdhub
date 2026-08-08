import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { History, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/logs")({
  head: () => ({
    meta: [
      { title: "Registros de Atividade | Fluxo de Caixa | Painel Financeiro" },
      {
        name: "description",
        content:
          "Histórico de acessos, importações da base e alterações de KPIs no painel financeiro.",
      },
      { property: "og:title", content: "Registros de Atividade | Fluxo de Caixa | Painel Financeiro" },
      {
        property: "og:description",
        content: "Histórico de acessos, importações da base e alterações de KPIs no painel financeiro.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LogsPage,
});

type Log = {
  id: string;
  email: string;
  tipo: string;
  descricao: string;
  criado_em: string;
};

const TODOS = "__todos__";

const rotulo: Record<string, string> = {
  login: "Acesso",
  logout: "Saída",
  importacao: "Importação da base",
  exportacao: "Exportação",
  kpi_alterado: "KPI alterado",
  usuario_criado: "Usuário criado",
  usuario_excluido: "Usuário excluído",
  papel_alterado: "Papel alterado",
};

function LogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [tipo, setTipo] = useState(TODOS);
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(true);

  async function carregar() {
    setCarregando(true);
    const { data } = await supabase
      .from("activity_logs")
      .select("id, email, tipo, descricao, criado_em")
      .order("criado_em", { ascending: false })
      .limit(500);
    setLogs((data ?? []) as Log[]);
    setCarregando(false);
  }

  useEffect(() => {
    void carregar();
  }, []);

  const tipos = useMemo(() => [...new Set(logs.map((l) => l.tipo))].sort(), [logs]);

  const filtrados = logs.filter(
    (l) =>
      (tipo === TODOS || l.tipo === tipo) &&
      (!busca ||
        `${l.email} ${l.descricao}`.toLowerCase().includes(busca.trim().toLowerCase())),
  );

  return (
    <div className="mx-auto max-w-[1100px] space-y-5">
      <header>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Auditoria
        </p>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <History className="size-5" /> Registros de atividade
        </h1>
        <p className="text-sm text-muted-foreground">
          Acessos, importações da base e alterações de configuração, com data e hora.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-flow-grid bg-card p-3 shadow-elegant">
        <Select value={tipo} onValueChange={setTipo}>
          <SelectTrigger className="h-9 w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todos os eventos</SelectItem>
            {tipos.map((t) => (
              <SelectItem key={t} value={t}>
                {rotulo[t] ?? t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          placeholder="Buscar por e-mail ou descrição"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="h-9 w-[280px]"
        />
        <Button variant="outline" size="sm" className="h-9" onClick={() => void carregar()}>
          <RefreshCw className="size-3.5" /> Atualizar
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-flow-grid bg-card shadow-elegant">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Data e hora</th>
              <th className="px-3 py-2 text-left">Usuário</th>
              <th className="px-3 py-2 text-left">Evento</th>
              <th className="px-3 py-2 text-left">Detalhe</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((l) => (
              <tr key={l.id} className="border-t border-flow-grid">
                <td className="whitespace-nowrap px-3 py-2 tabular-nums text-muted-foreground">
                  {new Date(l.criado_em).toLocaleString("pt-BR")}
                </td>
                <td className="px-3 py-2">{l.email || "—"}</td>
                <td className="px-3 py-2">{rotulo[l.tipo] ?? l.tipo}</td>
                <td className="px-3 py-2 text-muted-foreground">{l.descricao}</td>
              </tr>
            ))}
            {!filtrados.length && (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-sm text-muted-foreground">
                  {carregando ? "Carregando…" : "Nenhum registro encontrado."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
