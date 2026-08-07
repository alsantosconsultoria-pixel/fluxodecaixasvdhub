import { Landmark } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

/**
 * Contas bancárias identificadas na coluna "Conta" dos lançamentos realizados.
 * A seleção filtra apenas os valores realizados; as provisões seguem integrais.
 */
export function ContasFiltro({
  contas,
  selecionadas,
  onChange,
}: {
  contas: string[];
  selecionadas: string[];
  onChange: (contas: string[]) => void;
}) {
  if (!contas.length) return null;

  const todos = selecionadas.length === 0;

  const toggle = (conta: string) => {
    const base = todos ? contas : selecionadas;
    const next = base.includes(conta)
      ? base.filter((c) => c !== conta)
      : [...base, conta];
    onChange(next.length === contas.length ? [] : next);
  };

  return (
    <section className="rounded-xl border border-flow-grid bg-card p-4 shadow-elegant">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex rounded-md bg-flow-saldo-bg p-1.5 text-flow-saldo">
            <Landmark className="size-4" />
          </span>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Contas (realizado)
            </p>
            <p className="text-xs text-muted-foreground">
              {todos
                ? `Todas as ${contas.length} contas identificadas na planilha`
                : `${selecionadas.length} de ${contas.length} contas selecionadas`}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => onChange([])}>
            Selecionar todas
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onChange(contas.slice(0, 1))}
            disabled={contas.length < 2}
          >
            Limpar seleção
          </Button>
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {contas.map((conta) => {
          const marcada = todos || selecionadas.includes(conta);
          return (
            <label
              key={conta}
              className="flex cursor-pointer items-center gap-2 rounded-md border border-flow-grid px-3 py-2 text-xs transition-colors hover:bg-flow-total-bg"
            >
              <Checkbox checked={marcada} onCheckedChange={() => toggle(conta)} />
              <span className="truncate text-foreground" title={conta}>
                {conta}
              </span>
            </label>
          );
        })}
      </div>
    </section>
  );
}
