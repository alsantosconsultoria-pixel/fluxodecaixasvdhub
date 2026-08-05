import { useCallback, useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

export type Banco = {
  id: string;
  nome: string;
  agencia: string;
  conta: string;
  saldo: number;
  observacao: string;
  data_saldo: string;
  atualizado_em: string;
};

export type BancoInput = {
  nome: string;
  agencia: string;
  conta: string;
  saldo: number;
  observacao: string;
  data_saldo: string;
};

export async function listarBancos(): Promise<Banco[]> {
  const { data, error } = await supabase
    .from("bank_accounts")
    .select("id, nome, agencia, conta, saldo, observacao, data_saldo, atualizado_em")
    .order("nome", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((b) => ({ ...b, saldo: Number(b.saldo) }));
}

export async function salvarBanco(input: BancoInput & { id?: string }) {
  const payload = {
    nome: input.nome,
    agencia: input.agencia,
    conta: input.conta,
    saldo: input.saldo,
    observacao: input.observacao,
    data_saldo: input.data_saldo,
  };
  if (input.id) {
    const { error } = await supabase.from("bank_accounts").update(payload).eq("id", input.id);
    if (error) throw new Error(error.message);
    return;
  }
  const { error } = await supabase.from("bank_accounts").insert(payload);
  if (error) throw new Error(error.message);
}

export async function excluirBanco(id: string) {
  const { error } = await supabase.from("bank_accounts").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export function somaSaldos(bancos: Banco[]) {
  return bancos.reduce((acc, b) => acc + b.saldo, 0);
}

/** Saldos bancários cadastrados — alimenta o "Saldo Inicial Caixa" do fluxo. */
export function useBancos() {
  const [bancos, setBancos] = useState<Banco[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const recarregar = useCallback(async () => {
    try {
      setErro(null);
      setBancos(await listarBancos());
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao carregar os saldos bancários.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void recarregar();
  }, [recarregar]);

  return { bancos, saldoTotal: somaSaldos(bancos), carregando, erro, recarregar };
}

export function dataHoje() {
  return new Date().toISOString().slice(0, 10);
}

export function formatarData(iso: string) {
  const [a, m, d] = iso.slice(0, 10).split("-");
  return d && m && a ? `${d}/${m}/${a}` : iso;
}
