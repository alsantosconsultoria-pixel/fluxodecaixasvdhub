import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Building2, ImageUp, Loader2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  buscarEmpresa,
  lerArquivoComoDataUrl,
  salvarEmpresa,
  type Empresa,
} from "@/lib/empresa";
import { registrarLog } from "@/lib/logs";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/empresa")({
  head: () => ({
    meta: [
      { title: "Identidade da Empresa | Painel Financeiro" },
      {
        name: "description",
        content: "Defina o nome e a logo da empresa exibidos na tela de login e no painel.",
      },
      { property: "og:title", content: "Identidade da Empresa | Painel Financeiro" },
      {
        property: "og:description",
        content: "Personalize a marca do painel financeiro: nome e logo da empresa.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EmpresaPage,
});

function EmpresaPage() {
  const { isAdmin, carregando } = useSession();
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [nome, setNome] = useState("");
  const [logo, setLogo] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const inputFile = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void buscarEmpresa().then((e) => {
      setEmpresa(e);
      setNome(e?.nome ?? "");
      setLogo(e?.logo_url ?? null);
    });
  }, []);

  async function escolherLogo(file: File) {
    setErro(null);
    if (file.size > 500 * 1024) {
      setErro("A imagem deve ter no máximo 500 KB.");
      return;
    }
    setLogo(await lerArquivoComoDataUrl(file));
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setOk(null);
    setSalvando(true);
    try {
      await salvarEmpresa({ id: empresa?.id, nome: nome.trim(), logo_url: logo });
      await registrarLog("empresa_atualizada", `Identidade da empresa atualizada: ${nome}`);
      setOk("Identidade da empresa atualizada.");
      setEmpresa(await buscarEmpresa());
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally {
      setSalvando(false);
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
        <p className="text-sm text-muted-foreground">
          Área restrita a administradores.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 p-4 md:p-6">
      <header className="flex items-center gap-3">
        <span className="inline-flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Building2 className="size-5" />
        </span>
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Identidade da empresa</h1>
          <p className="text-xs text-muted-foreground">
            Nome e logo exibidos na tela de login e no menu lateral.
          </p>
        </div>
      </header>

      <form
        onSubmit={salvar}
        className="space-y-5 rounded-2xl border border-flow-grid bg-card p-5 shadow-elegant"
      >
        <div className="space-y-1.5">
          <Label htmlFor="nome-empresa">Nome da empresa</Label>
          <Input
            id="nome-empresa"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
            maxLength={80}
          />
        </div>

        <div className="space-y-2">
          <Label>Logo</Label>
          <div className="flex items-center gap-4">
            <div className="flex size-20 items-center justify-center overflow-hidden rounded-xl border border-flow-grid bg-muted">
              {logo ? (
                <img src={logo} alt="Logo da empresa" className="max-h-full max-w-full object-contain" />
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
                }}
              />
              <Button type="button" variant="outline" onClick={() => inputFile.current?.click()}>
                <ImageUp className="size-4" /> Enviar imagem
              </Button>
              {logo && (
                <Button type="button" variant="ghost" onClick={() => setLogo(null)}>
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
          Salvar
        </Button>
      </form>
    </div>
  );
}
