import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import { ABAS_PADRAO, abaPorRota } from "@/lib/permissoes";

type Perfil = { id: string; nome: string; email: string };

type SessionCtx = {
  user: User | null;
  perfil: Perfil | null;
  isAdmin: boolean;
  carregando: boolean;
  abasPermitidas: string[];
  podeAcessar: (rota: string) => boolean;
  recarregar: () => Promise<void>;
};

const Ctx = createContext<SessionCtx>({
  user: null,
  perfil: null,
  isAdmin: false,
  carregando: true,
  abasPermitidas: [],
  podeAcessar: () => false,
  recarregar: async () => {},
});

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [abasPermitidas, setAbasPermitidas] = useState<string[]>([]);
  const [carregando, setCarregando] = useState(true);

  async function carregar(atual: User | null) {
    setUser(atual);
    if (!atual) {
      setPerfil(null);
      setIsAdmin(false);
      setAbasPermitidas([]);
      setCarregando(false);
      return;
    }
    const [{ data: p }, { data: papeis }, { data: perms }] = await Promise.all([
      supabase.from("profiles").select("id, nome, email").eq("id", atual.id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", atual.id),
      supabase.from("user_permissions").select("aba").eq("user_id", atual.id),
    ]);
    setPerfil(p ?? { id: atual.id, nome: atual.email ?? "", email: atual.email ?? "" });
    setIsAdmin((papeis ?? []).some((r) => r.role === "admin"));
    setAbasPermitidas(
      (perms ?? []).length ? (perms ?? []).map((r) => r.aba) : ABAS_PADRAO,
    );
    setCarregando(false);
  }


  useEffect(() => {
    let ativo = true;
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!ativo) return;
      if (event === "TOKEN_REFRESHED") return;
      void carregar(session?.user ?? null);
    });
    void supabase.auth.getUser().then(({ data }) => {
      if (ativo) void carregar(data.user ?? null);
    });
    return () => {
      ativo = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<SessionCtx>(
    () => ({
      user,
      perfil,
      isAdmin,
      carregando,
      recarregar: async () => {
        const { data } = await supabase.auth.getUser();
        await carregar(data.user ?? null);
      },
    }),
    [user, perfil, isAdmin, carregando],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession() {
  return useContext(Ctx);
}
