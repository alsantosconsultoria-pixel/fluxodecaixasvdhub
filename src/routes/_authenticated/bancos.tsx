import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Landmark, Loader2, Plus, Save, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatValor, saldoBancarioSerie } from "@/lib/fluxo";
import { useFluxo } from "@/lib/fluxo-store";
import {
  dataHoje,
  excluirBanco,
  formatarData,
  salvarBanco,
  useBancos,
  type Banco,
  type BancoInput,
} from "@/lib/bancos";
import { registrarLog } from "@/lib/logs";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/bancos")({
  head: () => ({
    meta: [
      { title: "Saldos Bancários | Fluxo de Caixa | Painel Financeiro" },
      {
        name: "description",
        content:
          "Cadastre bancos, saldos e datas de atualização que alimentam o fluxo de caixa do painel financeiro.",
      },
      { property: "og:title", content: "Saldos Bancários | Fluxo de Caixa | Painel Financeiro" },
      {
        property: "og:description",
        content: "Cadastre bancos, saldos e datas de atualização que alimentam o fluxo de caixa do painel financeiro.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BancosPage,
});

const VAZIO: BancoInput = {
  nome: "",
  agencia: "",
  conta: "",
  saldo: 0,
  observacao: "",
  data_saldo: dataHoje(),
};

function BancosPage() {
  const { isAdmin } = useSession();
  const { bancos, saldoTotal, carregando, erro, recarregar } = useBancos();
  const [form, setForm] = useState<BancoInput & { id?: string }>(VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const { bundle } = useFluxo();
  const { saldoFinal: saldoFinalProjetado } = useMemo(
    () => saldoBancarioSerie(bundle.realizado, bundle.previsto, saldoTotal),
    [bundle, saldoTotal],
  );
  const projecaoMovimento = saldoFinalProjetado - saldoTotal;

  const ultimaAtualizacao = useMemo(() => {
    const datas = bancos.map((b) => b.data_saldo).sort();
    return datas.length ? formatarData(datas[datas.length - 1]) : "—";
  }, [bancos]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome.trim()) return;
    setSalvando(true);
    setMsg(null);
    try {
      await salvarBanco(form);
      void registrarLog(
        "banco_atualizado",
        `${form.id ? "Saldo atualizado" : "Banco cadastrado"}: ${form.nome} — ${formatValor(
          form.saldo,
        )} em ${formatarData(form.data_saldo)}`,
      );
      setForm({ ...VAZIO, data_saldo: dataHoje() });
      await recarregar();
      setMsg("Saldo bancário salvo.");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  }

  async function remover(b: Banco) {
    await excluirBanco(b.id);
    void registrarLog("banco_atualizado", `Banco removido: ${b.nome}`);
    await recarregar();
  }

  function editar(b: Banco) {
    setForm({
      id: b.id,
      nome: b.nome,
      agencia: b.agencia,
      conta: b.conta,
      saldo: b.saldo,
      observacao: b.observacao,
      data_saldo: b.data_saldo.slice(0, 10),
    });
  }

  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-flow-saldo">
          Tesouraria
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">
          Saldos Bancários
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Os saldos cadastrados aqui alimentam o Saldo Inicial de Caixa do Fluxo de Caixa e das
          projeções.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <Card label="Saldo bancário total" value={formatValor(saldoTotal)} destaque />
        <Card label="Contas cadastradas" value={String(bancos.length)} />
        <Card label="Última data de saldo" value={ultimaAtualizacao} />
      </section>

      {isAdmin && (
        <form
          onSubmit={submit}
          className="grid gap-4 rounded-xl border border-flow-grid bg-card p-4 shadow-elegant md:grid-cols-6"
        >
          <div className="md:col-span-2">
            <Label htmlFor="nome">Banco</Label>
            <Input
              id="nome"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Ex.: Itaú — Conta Movimento"
              required
            />
          </div>
          <div>
            <Label htmlFor="agencia">Agência</Label>
            <Input
              id="agencia"
              value={form.agencia}
              onChange={(e) => setForm({ ...form, agencia: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="conta">Conta</Label>
            <Input
              id="conta"
              value={form.conta}
              onChange={(e) => setForm({ ...form, conta: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="saldo">Saldo (R$)</Label>
            <Input
              id="saldo"
              type="number"
              step="0.01"
              value={form.saldo}
              onChange={(e) => setForm({ ...form, saldo: Number(e.target.value) })}
            />
          </div>
          <div>
            <Label htmlFor="data">Data do saldo</Label>
            <Input
              id="data"
              type="date"
              value={form.data_saldo}
              onChange={(e) => setForm({ ...form, data_saldo: e.target.value })}
            />
          </div>
          <div className="md:col-span-4">
            <Label htmlFor="obs">Observação</Label>
            <Input
              id="obs"
              value={form.observacao}
              onChange={(e) => setForm({ ...form, observacao: e.target.value })}
              placeholder="Opcional"
            />
          </div>
          <div className="flex items-end gap-2 md:col-span-2">
            <Button type="submit" disabled={salvando} className="flex-1">
              {salvando ? (
                <Loader2 className="size-4 animate-spin" />
              ) : form.id ? (
                <Save className="size-4" />
              ) : (
                <Plus className="size-4" />
              )}
              {form.id ? "Salvar alterações" : "Cadastrar banco"}
            </Button>
            {form.id && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setForm({ ...VAZIO, data_saldo: dataHoje() })}
              >
                <X className="size-4" />
              </Button>
            )}
          </div>
          {msg && <p className="text-xs text-muted-foreground md:col-span-6">{msg}</p>}
        </form>
      )}

      <section className="rounded-xl border border-flow-grid bg-card p-4 shadow-elegant">
        <h2 className="text-sm font-semibold tracking-tight">Resumo final por banco</h2>
        <p className="text-xs text-muted-foreground">
          Saldo atual cadastrado e saldo final projetado (rateio da projeção do fluxo de caixa
          pela participação de cada conta).
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {bancos.map((b) => {
            const part = saldoTotal ? b.saldo / saldoTotal : 0;
            return (
              <div key={b.id} className="rounded-lg border border-flow-grid bg-flow-total-bg p-3">
                <p className="text-xs font-medium text-muted-foreground">{b.nome}</p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-flow-saldo">
                  {formatValor(b.saldo)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Participação: {(part * 100).toLocaleString("pt-BR", {
                    maximumFractionDigits: 1,
                  })}
                  % · Final projetado:{" "}
                  <span className="font-medium text-foreground">
                    {formatValor(b.saldo + part * projecaoMovimento)}
                  </span>
                </p>
              </div>
            );
          })}
          {!bancos.length && (
            <p className="text-xs text-muted-foreground">Nenhum banco cadastrado ainda.</p>
          )}
        </div>
        <p className="mt-3 border-t border-flow-grid pt-3 text-sm">
          Saldo final projetado consolidado:{" "}
          <span className="font-semibold tabular-nums text-flow-saldo">
            {formatValor(saldoFinalProjetado)}
          </span>
        </p>
      </section>

      <section className="overflow-hidden rounded-xl border border-flow-grid bg-card shadow-elegant">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-flow-total-bg text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-2 text-left">Banco</th>
              <th className="px-4 py-2 text-left">Agência / Conta</th>
              <th className="px-4 py-2 text-left">Data do saldo</th>
              <th className="px-4 py-2 text-right">Saldo</th>
              {isAdmin && <th className="px-4 py-2" />}
            </tr>
          </thead>
          <tbody>
            {carregando && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                  Carregando…
                </td>
              </tr>
            )}
            {!carregando && bancos.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  <Landmark className="mx-auto mb-2 size-5" />
                  Nenhum banco cadastrado ainda.
                </td>
              </tr>
            )}
            {bancos.map((b) => (
              <tr key={b.id} className="border-t border-flow-grid">
                <td className="px-4 py-2">
                  <span className="font-medium">{b.nome}</span>
                  {b.observacao && (
                    <span className="block text-xs text-muted-foreground">{b.observacao}</span>
                  )}
                </td>
                <td className="px-4 py-2 text-muted-foreground">
                  {[b.agencia, b.conta].filter(Boolean).join(" / ") || "—"}
                </td>
                <td className="px-4 py-2 text-muted-foreground">
                  {formatarData(b.data_saldo)}
                </td>
                <td
                  className={`px-4 py-2 text-right font-semibold tabular-nums ${
                    b.saldo < 0 ? "text-flow-out" : "text-flow-saldo"
                  }`}
                >
                  {formatValor(b.saldo)}
                </td>
                {isAdmin && (
                  <td className="px-4 py-2 text-right">
                    <Button size="sm" variant="ghost" onClick={() => editar(b)}>
                      Editar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => void remover(b)}>
                      <Trash2 className="size-4 text-flow-out" />
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
          {bancos.length > 0 && (
            <tfoot>
              <tr className="border-t border-flow-grid bg-flow-saldo-bg font-semibold">
                <td className="px-4 py-2" colSpan={3}>
                  Saldo bancário total
                </td>
                <td className="px-4 py-2 text-right tabular-nums text-flow-saldo">
                  {formatValor(saldoTotal)}
                </td>
                {isAdmin && <td />}
              </tr>
            </tfoot>
          )}
        </table>
      </section>

      {erro && <p className="text-sm text-flow-out">{erro}</p>}
      {!isAdmin && (
        <p className="text-xs text-muted-foreground">
          Somente administradores podem cadastrar ou alterar saldos bancários.
        </p>
      )}
    </div>
  );
}

function Card({
  label,
  value,
  destaque,
}: {
  label: string;
  value: string;
  destaque?: boolean;
}) {
  return (
    <div className="rounded-xl border border-flow-grid bg-card p-4 shadow-elegant">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={`mt-1 text-xl font-semibold tabular-nums ${
          destaque ? "text-flow-saldo" : "text-foreground"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
