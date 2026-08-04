import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Check, Filter, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { limitesPeriodos, type Filtros } from "@/lib/fluxo";

const toISO = (d: Date) => format(d, "yyyy-MM-dd");
const fromISO = (s: string | null) => (s ? parseISO(s) : undefined);
const label = (s: string | null, fallback: string) =>
  s ? format(parseISO(s), "dd/MM/yyyy", { locale: ptBR }) : fallback;

function inicioDoMes(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

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
  const limites = useMemo(() => limitesPeriodos(meses), [meses]);

  const toggle = (c: string) =>
    onChange({
      ...filtros,
      categorias: selecionadas.includes(c)
        ? selecionadas.filter((x) => x !== c)
        : [...selecionadas, c],
    });

  const aplicarPeriodo = (de: Date, ate: Date) =>
    onChange({ ...filtros, de: toISO(de), ate: toISO(ate) });

  const presets = useMemo(() => {
    const hoje = new Date();
    const fim = limites ? parseISO(limites[1]) : hoje;
    const ref = fim < hoje ? fim : hoje;
    const dias = (n: number) => {
      const d = new Date(ref);
      d.setDate(d.getDate() - (n - 1));
      return d;
    };
    return [
      { l: "7 dias", de: dias(7), ate: ref },
      { l: "30 dias", de: dias(30), ate: ref },
      { l: "Mês atual", de: inicioDoMes(ref), ate: ref },
      { l: "Ano atual", de: new Date(ref.getFullYear(), 0, 1), ate: ref },
    ];
  }, [limites]);

  const limpo = !filtros.de && !filtros.ate && !selecionadas.length;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-flow-grid bg-card p-3 shadow-elegant">
      <span className="mr-1 inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Filter className="size-3.5" />
        Período
      </span>

      <DataPicker
        valor={filtros.de}
        placeholder="Data inicial"
        onSelect={(v) => onChange({ ...filtros, de: v })}
      />
      <span className="text-xs text-muted-foreground">até</span>
      <DataPicker
        valor={filtros.ate}
        placeholder="Data final"
        onSelect={(v) => onChange({ ...filtros, ate: v })}
      />

      <div className="flex flex-wrap items-center gap-1">
        {presets.map((p) => (
          <Button
            key={p.l}
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={() => aplicarPeriodo(p.de, p.ate)}
          >
            {p.l}
          </Button>
        ))}
        {limites && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={() => onChange({ ...filtros, de: null, ate: null })}
          >
            Tudo
          </Button>
        )}
      </div>

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

function DataPicker({
  valor,
  placeholder,
  onSelect,
}: {
  valor: string | null;
  placeholder: string;
  onSelect: (v: string | null) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("h-9 w-[150px] justify-start font-normal", !valor && "text-muted-foreground")}
        >
          <CalendarIcon className="size-3.5" />
          {label(valor, placeholder)}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          locale={ptBR}
          defaultMonth={fromISO(valor)}
          selected={fromISO(valor)}
          onSelect={(d) => onSelect(d ? toISO(d) : null)}
          initialFocus
          className={cn("p-3 pointer-events-auto")}
        />
        <div className="border-t border-flow-grid p-2">
          <Button variant="ghost" size="sm" className="w-full" onClick={() => onSelect(null)}>
            Limpar data
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
