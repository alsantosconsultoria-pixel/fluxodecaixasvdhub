import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

export type Empresa = { id: string; nome: string; logo_url: string | null };

export async function buscarEmpresa(): Promise<Empresa | null> {
  const { data } = await supabase
    .from("company_settings")
    .select("id, nome, logo_url")
    .order("criado_em", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

export async function salvarEmpresa(input: {
  id?: string;
  nome: string;
  logo_url: string | null;
}) {
  if (input.id) {
    const { error } = await supabase
      .from("company_settings")
      .update({ nome: input.nome, logo_url: input.logo_url })
      .eq("id", input.id);
    if (error) throw new Error(error.message);
    return;
  }
  const { error } = await supabase
    .from("company_settings")
    .insert({ nome: input.nome, logo_url: input.logo_url });
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
