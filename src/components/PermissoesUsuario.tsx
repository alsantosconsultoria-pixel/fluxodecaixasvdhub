import { useEffect, useState } from "react";
import { Loader2, ShieldHalf } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { listarPermissoes, salvarPermissoes } from "@/lib/permissoes.functions";
import { ABAS, ABAS_PADRAO, CHAVES_ABAS, ROTULO_GRUPO, type Grupo } from "@/lib/permissoes";

const GRUPOS: Grupo[] = ["financeiro", "administracao"];

export function PermissoesUsuario({
  userId,
  nome,
  ehAdmin,
}: {
  userId: string;
  nome: string;
  ehAdmin: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const [abas, setAbas] = useState<string[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    setCarregando(true);
    setErro(null);
    setOk(false);
    listarPermissoes({ data: { userId } })
      .then((r) => setAbas(r.definido ? r.abas : ABAS_PADRAO))
      .catch((e) =>
        setErro(e instanceof Error ? e.message : "Falha ao carregar as permissões."),
      )
      .finally(() => setCarregando(false));
  }, [aberto, userId]);

  function alternar(chave: string, valor: boolean) {
    setAbas((atual) =>
      valor ? [...new Set([...atual, chave])] : atual.filter((c) => c !== chave),
    );
  }

  async function salvar() {
    setSalvando(true);
    setErro(null);
    setOk(false);
    try {
      await salvarPermissoes({ data: { userId, abas } });
      setOk(true);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao salvar as permissões.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" title="Permissões de abas">
          <ShieldHalf className="size-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Permissões de {nome || "usuário"}</DialogTitle>
          <DialogDescription>
            Selecione as abas que este usuário pode acessar.
            {ehAdmin
              ? " Administradores têm acesso total independentemente destas marcações."
              : ""}
          </DialogDescription>
        </DialogHeader>

        {carregando ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAbas([...CHAVES_ABAS])}
              >
                Marcar todas
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setAbas([])}>
                Desmarcar todas
              </Button>
            </div>

            {GRUPOS.map((grupo) => {
              const itens = ABAS.filter((a) => a.grupo === grupo);
              const todas = itens.every((a) => abas.includes(a.chave));
              return (
                <div key={grupo} className="space-y-2 rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {ROTULO_GRUPO[grupo]}
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setAbas((atual) => {
                          const chaves = itens.map((a) => a.chave);
                          return todas
                            ? atual.filter((c) => !chaves.includes(c))
                            : [...new Set([...atual, ...chaves])];
                        })
                      }
                    >
                      {todas ? "Desmarcar grupo" : "Marcar grupo"}
                    </Button>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {itens.map((a) => (
                      <div key={a.chave} className="flex items-center gap-2">
                        <Checkbox
                          id={`perm-${userId}-${a.chave}`}
                          checked={abas.includes(a.chave)}
                          onCheckedChange={(v) => alternar(a.chave, v === true)}
                        />
                        <Label
                          htmlFor={`perm-${userId}-${a.chave}`}
                          className="text-sm font-normal"
                        >
                          {a.titulo}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            <div className="flex items-center gap-3">
              <Button onClick={salvar} disabled={salvando}>
                {salvando && <Loader2 className="size-4 animate-spin" />}
                Salvar permissões
              </Button>
              {ok && <span className="text-xs text-flow-saldo">Permissões salvas.</span>}
              {erro && <span className="text-xs text-destructive">{erro}</span>}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
