import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, ShieldCheck, Trash2, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  criarUsuario,
  definirPapel,
  excluirUsuario,
  listarUsuarios,
} from "@/lib/admin.functions";
import { usuarioParaLogin } from "@/lib/admin.schemas";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/usuarios")({
  head: () => ({
    meta: [
      { title: "Cadastro de Usuários | Fluxo de Caixa | Painel Financeiro" },
      {
        name: "description",
        content: "Cadastre usuários, defina papéis e controle o acesso ao painel financeiro.",
      },
      { property: "og:title", content: "Cadastro de Usuários | Fluxo de Caixa | Painel Financeiro" },
      {
        property: "og:description",
        content: "Cadastre usuários, defina papéis e controle o acesso ao painel financeiro.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: UsuariosPage,
});

type Usuario = Awaited<ReturnType<typeof listarUsuarios>>[number];

function UsuariosPage() {
  const { isAdmin, carregando } = useSession();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [role, setRole] = useState<"admin" | "user" | "avaliador">("user");
  const [modo, setModo] = useState<"convite" | "senha" | "avaliador">("convite");
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function recarregar() {
    try {
      setUsuarios(await listarUsuarios());
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao carregar usuários.");
    }
  }

  useEffect(() => {
    if (isAdmin) void recarregar();
  }, [isAdmin]);

  if (carregando) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  if (!isAdmin)
    return (
      <p className="text-sm text-muted-foreground">
        Apenas administradores podem gerenciar usuários.
      </p>
    );

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setOk(null);
    setEnviando(true);
    try {
      await criarUsuario({
        data: {
          nome,
          email: modo === "avaliador" ? undefined : email,
          role: modo === "avaliador" ? "avaliador" : role,
          modo,
          senha: modo === "convite" ? undefined : senha,
        },
      });
      setOk(
        modo === "convite"
          ? `Convite enviado para ${email}.`
          : modo === "avaliador"
            ? `Avaliador criado. Login: ${usuarioParaLogin(nome)} (entrar com nome e senha).`
            : `Usuário ${email} criado. Ele deve confirmar o e-mail antes de entrar.`,
      );
      setNome("");
      setEmail("");
      setSenha("");
      await recarregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível criar o usuário.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <header>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Administração
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Cadastro de usuários</h1>
        <p className="text-sm text-muted-foreground">
          Somente administradores criam contas. O acesso é liberado após a confirmação do
          e-mail.
        </p>
      </header>

      <form
        onSubmit={salvar}
        className="grid gap-3 rounded-xl border border-flow-grid bg-card p-4 shadow-elegant md:grid-cols-5"
      >
        <div className="space-y-1.5 md:col-span-1">
          <Label htmlFor="u-nome">Nome</Label>
          <Input id="u-nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
        </div>
        <div className="space-y-1.5 md:col-span-1">
          <Label htmlFor="u-email">{modo === "avaliador" ? "Login" : "E-mail"}</Label>
          {modo === "avaliador" ? (
            <Input id="u-email" value={usuarioParaLogin(nome)} readOnly disabled />
          ) : (
            <Input
              id="u-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          )}
        </div>
        <div className="space-y-1.5">
          <Label>Papel</Label>
          <Select
            value={modo === "avaliador" ? "avaliador" : role}
            disabled={modo === "avaliador"}
            onValueChange={(v) => setRole(v as "admin" | "user" | "avaliador")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="user">Usuário</SelectItem>
              <SelectItem value="admin">Administrador</SelectItem>
              <SelectItem value="avaliador">Avaliador</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Forma de acesso</Label>
          <Select
            value={modo}
            onValueChange={(v) => setModo(v as "convite" | "senha" | "avaliador")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="convite">Convite por e-mail</SelectItem>
              <SelectItem value="senha">Senha temporária</SelectItem>
              <SelectItem value="avaliador">Avaliador (sem e-mail)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {modo !== "convite" ? (
          <div className="space-y-1.5">
            <Label htmlFor="u-senha">Senha</Label>
            <Input
              id="u-senha"
              type="text"
              minLength={8}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
            />
          </div>
        ) : (
          <div className="hidden md:block" />
        )}

        <div className="md:col-span-5 flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={enviando}>
            {enviando ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
            Cadastrar usuário
          </Button>
          {erro && <span className="text-xs text-destructive">{erro}</span>}
          {ok && <span className="text-xs text-flow-saldo">{ok}</span>}
        </div>
      </form>

      <div className="overflow-hidden rounded-xl border border-flow-grid bg-card shadow-elegant">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Nome</th>
              <th className="px-3 py-2 text-left">E-mail</th>
              <th className="px-3 py-2 text-left">Papel</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Último acesso</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id} className="border-t border-flow-grid">
                <td className="px-3 py-2">{u.nome || "—"}</td>
                <td className="px-3 py-2 text-muted-foreground">
                  {u.email.endsWith("@avaliador.local") ? u.email.split("@")[0] : u.email}
                </td>
                <td className="px-3 py-2">
                  <Select
                    value={u.role}
                    onValueChange={async (v) => {
                      await definirPapel({
                        data: { userId: u.id, role: v as "admin" | "user" | "avaliador" },
                      });
                      await recarregar();
                    }}
                  >
                    <SelectTrigger className="h-8 w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Usuário</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="avaliador">Avaliador</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-3 py-2">
                  {u.confirmado ? (
                    <span className="inline-flex items-center gap-1 text-xs text-flow-saldo">
                      <ShieldCheck className="size-3.5" /> Confirmado
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Aguardando confirmação</span>
                  )}
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {u.ultimo_acesso
                    ? new Date(u.ultimo_acesso).toLocaleString("pt-BR")
                    : "Nunca acessou"}
                </td>
                <td className="px-3 py-2 text-right">
                  <PermissoesUsuario
                    userId={u.id}
                    nome={u.nome || u.email}
                    ehAdmin={u.role === "admin"}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      if (!window.confirm(`Excluir ${u.email}?`)) return;
                      try {
                        await excluirUsuario({ data: { userId: u.id } });
                        await recarregar();
                      } catch (err) {
                        setErro(err instanceof Error ? err.message : "Falha ao excluir.");
                      }
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </td>

              </tr>
            ))}
            {!usuarios.length && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-sm text-muted-foreground">
                  Nenhum usuário cadastrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
