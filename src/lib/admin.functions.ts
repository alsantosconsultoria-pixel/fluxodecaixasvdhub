import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  criarUsuarioSchema,
  definirPapelSchema,
  excluirUsuarioSchema,
  primeiroAdminSchema,
} from "@/lib/admin.schemas";

export const precisaBootstrap = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { count, error } = await supabaseAdmin
    .from("profiles")
    .select("id", { count: "exact", head: true });
  if (error) throw new Error(error.message);
  return { vazio: (count ?? 0) === 0 };
});

export const criarPrimeiroAdmin = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => primeiroAdminSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin
      .from("profiles")
      .select("id", { count: "exact", head: true });
    if ((count ?? 0) > 0) throw new Error("Já existe um administrador cadastrado.");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.senha,
      email_confirm: true,
      user_metadata: { nome: data.nome },
    });
    if (error || !created.user) throw new Error(error?.message ?? "Falha ao criar usuário.");

    await supabaseAdmin
      .from("profiles")
      .insert({ id: created.user.id, nome: data.nome, email: data.email });
    await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: created.user.id, role: "admin" });
    const { registrarLogServidor } = await import("@/lib/admin.server");
    await registrarLogServidor(
      created.user.id,
      data.email,
      "usuario_criado",
      "Administrador inicial criado",
    );
    return { ok: true as const };
  });

export const listarUsuarios = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: perfis }, { data: papeis }, { data: authUsers }] = await Promise.all([
      supabaseAdmin.from("profiles").select("*").order("criado_em", { ascending: true }),
      supabaseAdmin.from("user_roles").select("user_id, role"),
      supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 }),
    ]);
    const confirmados = new Map(
      (authUsers?.users ?? []).map((u) => [u.id, Boolean(u.email_confirmed_at)]),
    );
    const ultimoAcesso = new Map(
      (authUsers?.users ?? []).map((u) => [u.id, u.last_sign_in_at ?? null]),
    );
    return (perfis ?? []).map((p) => ({
      id: p.id,
      nome: p.nome,
      email: p.email,
      criado_em: p.criado_em,
      role: (papeis ?? []).find((r) => r.user_id === p.id)?.role ?? "user",
      confirmado: confirmados.get(p.id) ?? false,
      ultimo_acesso: ultimoAcesso.get(p.id) ?? null,
    }));
  });

export const criarUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => criarUsuarioSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { assertAdmin, registrarLogServidor } = await import("@/lib/admin.server");
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let userId: string;
    if (data.modo === "convite") {
      const { data: invited, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        data.email,
        { data: { nome: data.nome } },
      );
      if (error || !invited.user)
        throw new Error(error?.message ?? "Falha ao enviar o convite.");
      userId = invited.user.id;
    } else {
      if (!data.senha) throw new Error("Informe uma senha temporária.");
      const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: data.senha,
        email_confirm: false,
        user_metadata: { nome: data.nome },
      });
      if (error || !created.user)
        throw new Error(error?.message ?? "Falha ao criar o usuário.");
      userId = created.user.id;
    }

    await supabaseAdmin
      .from("profiles")
      .upsert({ id: userId, nome: data.nome, email: data.email });
    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: userId, role: data.role }, { onConflict: "user_id,role" });
    await registrarLogServidor(
      context.userId,
      data.email,
      "usuario_criado",
      `Usuário ${data.email} criado como ${data.role}`,
    );
    return { ok: true as const, userId };
  });

export const definirPapel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => definirPapelSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { assertAdmin, registrarLogServidor } = await import("@/lib/admin.server");
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.userId, role: data.role });
    if (error) throw new Error(error.message);
    await registrarLogServidor(
      context.userId,
      "",
      "papel_alterado",
      `Papel do usuário ${data.userId} alterado para ${data.role}`,
    );
    return { ok: true as const };
  });

export const excluirUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => excluirUsuarioSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { assertAdmin, registrarLogServidor } = await import("@/lib/admin.server");
    await assertAdmin(context.supabase, context.userId);
    if (data.userId === context.userId)
      throw new Error("Você não pode excluir a própria conta.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    await supabaseAdmin.from("profiles").delete().eq("id", data.userId);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    await registrarLogServidor(
      context.userId,
      "",
      "usuario_excluido",
      `Usuário ${data.userId} excluído`,
    );
    return { ok: true as const };
  });
