import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";
import { ABAS_PADRAO, abaPorRota } from "@/lib/permissoes";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });

    const aba = abaPorRota(location.pathname);
    if (aba) {
      const [{ data: papeis }, { data: perms }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", data.user.id),
        supabase.from("user_permissions").select("aba").eq("user_id", data.user.id),
      ]);
      const isAdmin = (papeis ?? []).some((r) => r.role === "admin");
      const permitidas = (perms ?? []).length
        ? (perms ?? []).map((p) => p.aba)
        : ABAS_PADRAO;
      if (!isAdmin && !permitidas.includes(aba.chave)) {
        if (aba.rota !== "/") throw redirect({ to: "/" });
      }
    }

    return { user: data.user };
  },
  component: () => <Outlet />,
});
