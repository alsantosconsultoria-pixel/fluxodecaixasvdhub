import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Building2, ImageUp, Loader2, Plus, Save, Star, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  excluirEmpresa,
  formatarCnpj,
  lerArquivoComoDataUrl,
  listarEmpresas,
  salvarEmpresa,
  type Empresa,
} from "@/lib/empresa";
import { registrarLog } from "@/lib/logs";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/empresa")({
  head: () => ({
    meta: [
      { title: "Cadastro de Empresas | Fluxo de Caixa | Painel Financeiro" },
      {
        name: "description",
        content:
          "Cadastre múltiplos CNPJs, defina a empresa principal e a identidade visual exibida no painel financeiro.",
      },
      { property: "og:title", content: "Cadastro de Empresas | Fluxo de Caixa | Painel Financeiro" },
      {
        property: "og:description",
        content:
          "Cadastre múltiplos CNPJs, defina a empresa principal e a identidade visual exibida no painel financeiro.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EmpresaPage,
});

type Form = {
  id?: string;
  nome: string;
  razao_social: string;
  cnpj: string;
  email: string;
  telefone: string;
  endereco: string;
  principal: boolean;
  logo_url: string | null;
};

const VAZIO: Form = {
  nome: "",
  razao_social: "",
  cnpj: "",
  email: "",
  telefone: "",
  endereco: "",
  principal: false,
  logo_url: null,
};

function EmpresaPage() {
  const { isAdmin, carregando } = useSession();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [form, setForm] = useState<Form>(VAZIO);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const inputFile = useRef<HTMLInputElement>(null);

  async function recarregar() {
    const lista = await listarEmpresas().catch(() => []);
    setEmpresas(lista);
    return lista;
  }

  useEffect(() => {
    void recarregar().then((lista) => {
      const principal = lista.find((e) => e.principal) ?? lista[0];
      if (principal) setForm({ ...principal });
    });
  }, []);

  function editar(e: Empresa) {
    setErro(null);
    setOk(null);
    setForm({ ...e });
  }

  async function escolherLogo(file: File) {
    setErro(null);
    if (file.size > 500 * 1024) {
      setErro("A imagem deve ter no máximo 500 KB.");
      return;
    }
    setForm((f) => ({ ...f, logo_url: null }));
    const url = await lerArquivoComoDataUrl(file);
    setForm((f) => ({ ...f, logo_url: url }));
  }

  async function salvar(ev: React.FormEvent) {
    ev.preventDefault();
    setErro(null);
    setOk(null);
    setSalvando(true);
    try {
      await salvarEmpresa({ ...form, nome: form.nome.trim() });
      await registrarLog(
        "empresa_atualizada",
        `Empresa ${form.id ? "atualizada" : "cadastrada"}: ${form.nome} (${form.cnpj || "sem CNPJ"})`,
      );
      setOk("Empresa salva com sucesso.");
      const lista = await recarregar();
      const atual =
        lista.find((e) => e.id === form.id) ??
        lista.find((e) => e.cnpj === form.cnpj && e.nome === form.nome.trim());
      if (atual) setForm({ ...atual });
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  }

  async function remover(e: Empresa) {
    if (!window.confirm(`Excluir a empresa "${e.nome}"?`)) return;
    setErro(null);
    try {
      await excluirEmpresa(e.id);
      await registrarLog("empresa_atualizada", `Empresa excluída: ${e.nome}`);
      const lista = await recarregar();
      if (form.id === e.id) setForm(lista[0] ? { ...lista[0] } : VAZIO);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível excluir.");
    }
  }

  if (carregando) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Carregando…
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Área restrita a administradores.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 md:p-6">
      <header className="flex items-center gap-3">
        <span className="inline-flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Building2 className="size-5" />
        </span>
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Cadastro de empresas</h1>
          <p className="text-xs text-muted-foreground">
            Múltiplos CNPJs. A empresa marcada como principal define o nome e a logo do painel.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="ml-auto"
          onClick={() => {
            setForm(VAZIO);
            setOk(null);
            setErro(null);
          }}
        >
          <Plus className="size-4" /> Nova empresa
        </Button>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <form
          onSubmit={salvar}
          className="space-y-5 rounded-2xl border border-flow-grid bg-card p-5 shadow-elegant"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="nome-empresa">Nome fantasia</Label>
              <Input
                id="nome-empresa"
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                required
                maxLength={80}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="razao">Razão social</Label>
              <Input
                id="razao"
                value={form.razao_social}
                onChange={(e) => setForm((f) => ({ ...f, razao_social: e.target.value }))}
                maxLength={120}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input
                id="cnpj"
                value={form.cnpj}
                onChange={(e) => setForm((f) => ({ ...f, cnpj: formatarCnpj(e.target.value) }))}
                placeholder="00.000.000/0000-00"
                inputMode="numeric"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email-empresa">E-mail</Label>
              <Input
                id="email-empresa"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                value={form.telefone}
                onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endereco">Endereço</Label>
              <Input
                id="endereco"
                value={form.endereco}
                onChange={(e) => setForm((f) => ({ ...f, endereco: e.target.value }))}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={form.principal}
              onChange={(e) => setForm((f) => ({ ...f, principal: e.target.checked }))}
            />
            Empresa principal (exibida na tela de login e no menu)
          </label>

          <div className="space-y-2">
            <Label>Logo</Label>
            <div className="flex items-center gap-4">
              <div className="flex size-20 items-center justify-center overflow-hidden rounded-xl border border-flow-grid bg-muted">
                {form.logo_url ? (
                  <img
                    src={form.logo_url}
                    alt={`Logo de ${form.nome || "empresa"}`}
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <Building2 className="size-6 text-muted-foreground" />
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <input
                  ref={inputFile}
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void escolherLogo(f);
                    e.target.value = "";
                  }}
                />
                <Button type="button" variant="outline" onClick={() => inputFile.current?.click()}>
                  <ImageUp className="size-4" /> Enviar imagem
                </Button>
                {form.logo_url && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setForm((f) => ({ ...f, logo_url: null }))}
                  >
                    Remover
                  </Button>
                )}
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">PNG, JPG, SVG ou WebP até 500 KB.</p>
          </div>

          {erro && <p className="text-xs text-destructive">{erro}</p>}
          {ok && <p className="text-xs text-emerald-600">{ok}</p>}

          <Button type="submit" disabled={salvando}>
            {salvando ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {form.id ? "Salvar alterações" : "Cadastrar empresa"}
          </Button>
        </form>

        <aside className="space-y-2 rounded-2xl border border-flow-grid bg-card p-4 shadow-elegant">
          <h2 className="text-sm font-semibold">Empresas cadastradas</h2>
          {!empresas.length && (
            <p className="text-xs text-muted-foreground">Nenhuma empresa cadastrada ainda.</p>
          )}
          <ul className="space-y-2">
            {empresas.map((e) => (
              <li
                key={e.id}
                className={`flex items-center gap-2 rounded-xl border p-2 text-left ${
                  form.id === e.id ? "border-primary/60 bg-primary/5" : "border-flow-grid"
                }`}
              >
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-2"
                  onClick={() => editar(e)}
                >
                  <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
                    {e.logo_url ? (
                      <img
                        src={e.logo_url}
                        alt={`Logo de ${e.nome}`}
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <Building2 className="size-4 text-muted-foreground" />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-1 truncate text-sm font-medium">
                      {e.nome}
                      {e.principal && <Star className="size-3 fill-current text-primary" />}
                    </span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {e.cnpj || "sem CNPJ"}
                    </span>
                  </span>
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Excluir ${e.nome}`}
                  onClick={() => void remover(e)}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}
