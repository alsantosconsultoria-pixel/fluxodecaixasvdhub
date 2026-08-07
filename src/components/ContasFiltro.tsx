import { useState } from "react";
import { ChevronDown, Landmark } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

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
  const [aberto, setAberto] = useState(false);

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
    <Collapsible
      open={aberto}
      onOpenChange={setAberto}
      className="rounded-xl border border-flow-grid bg-card px-4 py-2.5 shadow-elegant"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <CollapsibleTrigger className="flex flex-1 items-center gap-2 text-left">
          <span className="inline-flex rounded-md bg-flow-saldo-bg p-1.5 text-flow-saldo">
            <Landmark className="size-3.5" />
          </span>
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Contas (realizado)
          </span>
          <span className="text-xs text-muted-foreground">
            {todos
              ? `Todas (${contas.length})`
              : `${selecionadas.length} de ${contas.length}`}
          </span>
          <ChevronDown
            className={cn(
              "size-4 text-muted-foreground transition-transform",
              aberto && "rotate-180",
            )}
          />
        </CollapsibleTrigger>

        {aberto && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => onChange([])}>
              Marcar todas
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
        )}
      </div>

      <CollapsibleContent>
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
      </CollapsibleContent>
    </Collapsible>
  );
}
