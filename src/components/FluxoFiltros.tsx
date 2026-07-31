import { Check, Filter, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { mesLabel, type Filtros } from "@/lib/fluxo";

const TODOS = "__todos__";

export function FluxoFiltros({
  meses,
  categorias,
  filtros,
  onChange,
}: {
  meses: string[];
  categorias: string[];
  filtros: Filtros;
  onChange: (f: Filtros) => void;
}) {
  const selecionadas = filtros.categorias;

  const toggle = (c: string) =>
    onChange({
      ...filtros,
      categorias: selecionadas.includes(c)
        ? selecionadas.filter((x) => x !== c)
        : [...selecionadas, c],
    });

  const limpo = !filtros.de && !filtros.ate && !selecionadas.length;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-flow-grid bg-card p-3 shadow-elegant">
      <span className="mr-1 inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Filter className="size-3.5" />
        Filtros
      </span>

      <Select
        value={filtros.de ?? TODOS}
        onValueChange={(v) => onChange({ ...filtros, de: v === TODOS ? null : v })}
      >
        <SelectTrigger className="h-9 w-[150px]">
          <SelectValue placeholder="Mês inicial" />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          <SelectItem value={TODOS}>Desde o início</SelectItem>
          {meses.map((m) => (
            <SelectItem key={m} value={m}>
              {mesLabel(m)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <span className="text-xs text-muted-foreground">até</span>

      <Select
        value={filtros.ate ?? TODOS}
        onValueChange={(v) => onChange({ ...filtros, ate: v === TODOS ? null : v })}
      >
        <SelectTrigger className="h-9 w-[150px]">
          <SelectValue placeholder="Mês final" />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          <SelectItem value={TODOS}>Até o fim</SelectItem>
          {meses.map((m) => (
            <SelectItem key={m} value={m}>
              {mesLabel(m)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-9">
            {selecionadas.length
              ? `${selecionadas.length} categoria(s)`
              : "Todas as categorias"}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[320px] p-0">
          <div className="max-h-72 overflow-auto p-2">
            {categorias.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => toggle(c)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-accent"
              >
                <Checkbox checked={selecionadas.includes(c)} className="pointer-events-none" />
                <span className="flex-1 truncate">{c}</span>
                {selecionadas.includes(c) && <Check className="size-3.5 text-flow-saldo" />}
              </button>
            ))}
          </div>
          <div className="border-t border-flow-grid p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => onChange({ ...filtros, categorias: [] })}
            >
              Limpar categorias
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {!limpo && (
        <Button
          variant="ghost"
          size="sm"
          className="h-9"
          onClick={() => onChange({ de: null, ate: null, categorias: [] })}
        >
          <X className="size-3.5" />
          Limpar tudo
        </Button>
      )}
    </div>
  );
}
