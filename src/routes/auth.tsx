import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { criarPrimeiroAdmin, precisaBootstrap } from "@/lib/admin.functions";
import { useEmpresa } from "@/lib/empresa";
import { registrarLog } from "@/lib/logs";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Acesso restrito | Painel Financeiro" },
      {
        name: "description",
        content: "Entre com e-mail e senha para acessar o painel de fluxo de caixa.",
      },
      { property: "og:title", content: "Acesso restrito | Painel Financeiro" },
      {
        property: "og:description",
        content: "Área protegida do painel financeiro de fluxo de caixa.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { empresa } = useEmpresa();
  const [bootstrap, setBootstrap] = useState<boolean | null>(null);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    void precisaBootstrap()
      .then((r) => setBootstrap(r.vazio))
      .catch(() => setBootstrap(false));
    void supabase.auth.getUser().then(({ data }) => {
      if (data.user) void navigate({ to: "/" });
    });
  }, [navigate]);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    setEnviando(false);
    if (error) {
      setErro(
        error.message.includes("Email not confirmed")
          ? "Confirme seu e-mail antes de entrar."
          : "E-mail ou senha inválidos.",
      );
      return;
    }
    await registrarLog("login", "Acesso ao painel");
    void navigate({ to: "/" });
  }

  async function criarAdmin(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await criarPrimeiroAdmin({ data: { nome, email, senha } });
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
      if (error) {
        setAviso("Administrador criado. Faça login com as credenciais definidas.");
        setBootstrap(false);
      } else {
        await registrarLog("login", "Acesso ao painel");
        void navigate({ to: "/" });
      }
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível criar o administrador.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-flow-grid bg-card p-6 shadow-elegant">
        <div className="mb-5 flex flex-col items-center gap-3 text-center">
          {empresa?.logo_url ? (
            <img
              src={empresa.logo_url}
              alt={`Logo ${empresa.nome}`}
              className="max-h-16 max-w-[180px] object-contain"
            />
          ) : (
            <span className="inline-flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Lock className="size-5" />
            </span>
          )}
          <div>
            <h1 className="text-base font-semibold tracking-tight">
              {empresa?.nome ?? "Painel Financeiro"}
            </h1>
            <p className="text-xs text-muted-foreground">
              {bootstrap ? "Crie o administrador inicial" : "Acesso restrito"}
            </p>
          </div>
        </div>


        <form onSubmit={bootstrap ? criarAdmin : entrar} className="space-y-3">
          {bootstrap && (
            <div className="space-y-1.5">
              <Label htmlFor="nome">Nome</Label>
              <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="senha">Senha</Label>
            <Input
              id="senha"
              type="password"
              autoComplete={bootstrap ? "new-password" : "current-password"}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
              minLength={8}
            />
          </div>

          {erro && <p className="text-xs text-destructive">{erro}</p>}
          {aviso && <p className="text-xs text-muted-foreground">{aviso}</p>}

          <Button type="submit" className="w-full" disabled={enviando}>
            {enviando && <Loader2 className="size-4 animate-spin" />}
            {bootstrap ? "Criar administrador" : "Entrar"}
          </Button>
        </form>

        {!bootstrap && (
          <p className="mt-4 text-center text-[11px] text-muted-foreground">
            Novas contas são criadas por um administrador na aba Usuários.
          </p>
        )}
      </div>
    </div>
  );
}
