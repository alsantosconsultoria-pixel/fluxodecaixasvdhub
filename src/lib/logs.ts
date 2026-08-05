import { supabase } from "@/integrations/supabase/client";

export type TipoLog =
  | "login"
  | "logout"
  | "importacao"
  | "exportacao"
  | "kpi_alterado"
  | "empresa_atualizada"
  | "banco_atualizado"
  | "backup";

/** Grava um registro de auditoria para o usuário logado (falha em silêncio). */
export async function registrarLog(tipo: TipoLog, descricao: string) {
  try {
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) return;
    await supabase.from("activity_logs").insert({
      user_id: user.id,
      email: user.email ?? "",
      tipo,
      descricao,
    });
  } catch {
    /* auditoria não deve quebrar a experiência do usuário */
  }
}
