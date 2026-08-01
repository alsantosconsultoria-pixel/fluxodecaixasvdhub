// Server-only helpers for user administration.
import type { SupabaseClient } from "@supabase/supabase-js";

export async function assertAdmin(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Acesso restrito a administradores.");
}

export async function registrarLogServidor(
  userId: string | null,
  email: string,
  tipo: string,
  descricao: string,
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin
    .from("activity_logs")
    .insert({ user_id: userId, email, tipo, descricao });
}
