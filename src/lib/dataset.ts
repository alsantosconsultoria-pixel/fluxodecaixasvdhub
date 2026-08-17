import { supabase } from "@/integrations/supabase/client";
import type { Raw } from "@/lib/fluxo";

/** Quantidade de lançamentos por registro salvo (evita payloads gigantes). */
const TAMANHO_PARTE = 400;

export type DatasetSalvo = { rows: Raw[]; arquivo: string | null; atualizadoEm: string | null };

/** Lê a base de lançamentos gravada no banco (compartilhada entre usuários). */
export async function carregarDataset(): Promise<DatasetSalvo | null> {
  const { data, error } = await supabase
    .from("fluxo_dataset")
    .select("parte, linhas, arquivo, atualizado_em")
    .order("parte");
  if (error || !data?.length) return null;

  const rows = data.flatMap((p) => (Array.isArray(p.linhas) ? (p.linhas as Raw[]) : []));
  if (!rows.length) return null;

  return {
    rows,
    arquivo: data[0]?.arquivo || null,
    atualizadoEm: data[0]?.atualizado_em ?? null,
  };
}

/** Substitui a base gravada pelos lançamentos informados (somente admin). */
export async function gravarDataset(rows: Raw[], arquivo: string | null) {
  const { error: delErro } = await supabase.from("fluxo_dataset").delete().not("id", "is", null);
  if (delErro) throw new Error(delErro.message);
  if (!rows.length) return;

  const { data: auth } = await supabase.auth.getUser();
  const partes: { parte: number; linhas: Raw[]; arquivo: string; criado_por: string | null }[] = [];
  for (let i = 0; i < rows.length; i += TAMANHO_PARTE) {
    partes.push({
      parte: partes.length,
      linhas: rows.slice(i, i + TAMANHO_PARTE),
      arquivo: arquivo ?? "",
      criado_por: auth.user?.id ?? null,
    });
  }

  for (let i = 0; i < partes.length; i += 10) {
    const { error } = await supabase
      .from("fluxo_dataset")
      .insert(partes.slice(i, i + 10) as never);
    if (error) throw new Error(error.message);
  }
}

/** Remove toda a base gravada (somente admin). */
export async function limparDataset() {
  const { error } = await supabase.from("fluxo_dataset").delete().not("id", "is", null);
  if (error) throw new Error(error.message);
}
