import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

export type Empresa = {
  id: string;
  nome: string;
  logo_url: string | null;
  cnpj: string;
  razao_social: string;
  email: string;
  telefone: string;
  endereco: string;
  principal: boolean;
};

export type EmpresaInput = Omit<Empresa, "id"> & { id?: string };

const CAMPOS = "id, nome, logo_url, cnpj, razao_social, email, telefone, endereco, principal";

/** Lista todas as empresas (multi CNPJ), com a principal no topo. */
export async function listarEmpresas(): Promise<Empresa[]> {
  const { data, error } = await supabase
    .from("company_settings")
    .select(CAMPOS)
    .order("principal", { ascending: false })
    .order("criado_em", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Empresa[];
}

/** Empresa principal (usada na tela de login e no menu lateral). */
export async function buscarEmpresa(): Promise<Empresa | null> {
  const empresas = await listarEmpresas().catch(() => []);
  return empresas.find((e) => e.principal) ?? empresas[0] ?? null;
}

export async function salvarEmpresa(input: EmpresaInput) {
  const payload = {
    nome: input.nome,
    logo_url: input.logo_url,
    cnpj: input.cnpj,
    razao_social: input.razao_social,
    email: input.email,
    telefone: input.telefone,
    endereco: input.endereco,
    principal: input.principal,
  };

  let id = input.id;
  if (id) {
    const { error } = await supabase.from("company_settings").update(payload).eq("id", id);
    if (error) throw new Error(error.message);
  } else {
    const { data, error } = await supabase
      .from("company_settings")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    id = data.id;
  }

  // Somente uma empresa pode ser a principal.
  if (input.principal && id) {
    const { error } = await supabase
      .from("company_settings")
      .update({ principal: false })
      .neq("id", id);
    if (error) throw new Error(error.message);
  }
}

export async function excluirEmpresa(id: string) {
  const { error } = await supabase.from("company_settings").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export function useEmpresa() {
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;
    void buscarEmpresa()
      .then((e) => {
        if (ativo) setEmpresa(e);
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, []);

  return { empresa, carregando, setEmpresa };
}

export function lerArquivoComoDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    reader.readAsDataURL(file);
  });
}

/** Formata CNPJ enquanto o usuário digita. */
export function formatarCnpj(valor: string) {
  const d = valor.replace(/\D/g, "").slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}
