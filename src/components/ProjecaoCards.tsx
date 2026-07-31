import { CalendarClock, TrendingDown, TrendingUp, Wallet } from "lucide-react";

import { computeTotais, formatValor, mergeFluxo, mesLabel, type FluxoData } from "@/lib/fluxo";

/** Cards mensais de pagamentos e receitas futuras + saldo projetado acumulado. */
export function ProjecaoCards({
  realizado,
  previsto,
}: {
  realizado: FluxoData;
  previsto: FluxoData;
}) {
  const total = mergeFluxo(realizado, previsto);
  const p = computeTotais(previsto);
  const t = computeTotais(total);

  const meses = previsto.meses
    .map((m, i) => ({
      m,
      receitas: p.totalEntradas[i] ?? 0,
      pagamentos: p.totalSaidas[i] ?? 0,
      acumulado: t.acumulado[i] ?? 0,
    }))
    .filter((r) => r.receitas !== 0 || r.pagamentos !== 0);

  if (!meses.length) return null;

  return (
    <section className="rounded-xl border border-flow-grid bg-card p-4 shadow-elegant md:p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="inline-flex rounded-md bg-flow-saldo-bg p-1.5 text-flow-saldo">
          <CalendarClock className="size-4" />
        </span>
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            Projeção mensal — pagamentos e receitas futuras
          </h2>
          <p className="text-xs text-muted-foreground">
            Títulos em aberto pela data de vencimento · saldo projetado acumulado inclui os
            realizados (data da baixa)
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {meses.map((r) => (
          <div
            key={r.m}
            className="rounded-lg border border-dashed border-flow-grid bg-flow-prev-bg p-3"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-flow-saldo">
              {mesLabel(r.m)}
            </p>
            <div className="mt-2 space-y-1.5 text-xs">
              <Linha
                icon={<TrendingUp className="size-3.5" />}
                label="Receitas futuras"
                value={r.receitas}
                className="text-flow-in"
              />
              <Linha
                icon={<TrendingDown className="size-3.5" />}
                label="Pagamentos futuros"
                value={r.pagamentos}
                className="text-flow-out"
              />
              <Linha
                icon={<Wallet className="size-3.5" />}
                label="Saldo projetado"
                value={r.acumulado}
                className="text-flow-saldo font-semibold"
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Linha({
  icon,
  label,
  value,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  className: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className={`tabular-nums ${className}`}>{formatValor(value)}</span>
    </div>
  );
}
