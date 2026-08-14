import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CHAVES_ABAS } from "@/lib/permissoes";

const listarSchema = z.object({ userId: z.string().uuid() });
const salvarSchema = z.object({
  userId: z.string().uuid(),
  abas: z.array(z.enum(CHAVES_ABAS as [string, ...string[]])).max(50),
});

export const listarPermissoes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => listarSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: linhas, error } = await supabaseAdmin
      .from("user_permissions")
      .select("aba")
      .eq("user_id", data.userId);
    if (error) throw new Error(error.message);
    return {
      abas: (linhas ?? []).map((l) => l.aba),
      definido: (linhas ?? []).length > 0,
    };
  });

export const salvarPermissoes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => salvarSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { assertAdmin, registrarLogServidor } = await import("@/lib/admin.server");
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error: delErro } = await supabaseAdmin
      .from("user_permissions")
      .delete()
      .eq("user_id", data.userId);
    if (delErro) throw new Error(delErro.message);

    if (data.abas.length) {
      const { error } = await supabaseAdmin
        .from("user_permissions")
        .insert(data.abas.map((aba) => ({ user_id: data.userId, aba })));
      if (error) throw new Error(error.message);
    }

    await registrarLogServidor(
      context.userId,
      "",
      "permissoes_alteradas",
      `Permissões do usuário ${data.userId} definidas para: ${
        data.abas.length ? data.abas.join(", ") : "nenhuma aba"
      }`,
    );
    return { ok: true as const };
  });
