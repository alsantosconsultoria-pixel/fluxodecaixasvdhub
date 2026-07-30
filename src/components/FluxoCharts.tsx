import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { computeTotais, mesLabel, type FluxoData } from "@/lib/fluxo";

const COLORS = {
  in: "var(--flow-in)",
  out: "var(--flow-out)",
  saldo: "var(--flow-saldo)",
  grid: "var(--flow-grid)",
  muted: "var(--muted-foreground)",
};

function compact(v: number) {
  const abs = Math.abs(v);
  const fmt = (n: number, suf: string) =>
    `${v < 0 ? "-" : ""}${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}${suf}`;
  if (abs >= 1_000_000) return fmt(abs / 1_000_000, " mi");
  if (abs >= 1_000) return fmt(abs / 1_000, " mil");
  return fmt(abs, "");
}

function money(v: number) {
  return v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-flow-grid bg-card px-3 py-2 shadow-elegant">
      <p className="mb-1 text-xs font-semibold text-foreground">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="flex items-center gap-2 text-xs text-muted-foreground">
          <span
            className="inline-block size-2 rounded-full"
            style={{ background: p.color ?? p.fill }}
          />
          {p.name}:{" "}
          <span className="font-medium tabular-nums text-foreground">{money(p.value)}</span>
        </p>
      ))}
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-flow-grid bg-card p-4 shadow-elegant md:p-5">
      <div className="mb-3">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">{title}</h2>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

export function FluxoCharts({ data }: { data: FluxoData }) {
  const { totalEntradas, totalSaidas, acumulado } = computeTotais(data);

  const mensal = useMemo(
    () =>
      data.meses.map((m, i) => ({
        mes: mesLabel(m),
        entradas: Math.abs(totalEntradas[i] ?? 0),
        saidas: Math.abs(totalSaidas[i] ?? 0),
        acumulado: acumulado[i] ?? 0,
      })),
    [data.meses, totalEntradas, totalSaidas, acumulado],
  );

  const porCategoria = useMemo(() => {
    const rows = [
      ...data.entradas.map((r) => ({
        categoria: r.categoria,
        tipo: "Entradas" as const,
        valor: Math.abs(r.valores.reduce((a, b) => a + b, 0)),
      })),
      ...data.saidas.map((r) => ({
        categoria: r.categoria,
        tipo: "Saídas" as const,
        valor: Math.abs(r.valores.reduce((a, b) => a + b, 0)),
      })),
    ].filter((r) => r.valor > 0);
    return rows.sort((a, b) => b.valor - a.valor).slice(0, 12);
  }, [data]);

  const axis = { stroke: COLORS.muted, fontSize: 11 };

  return (
    <section className="grid gap-4 xl:grid-cols-2">
      <div className="xl:col-span-2">
        <Panel
          title="Entradas, saídas e saldo acumulado por mês"
          subtitle="Barras: movimentação mensal · Linha: saldo acumulado"
        >
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={mensal} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gIn" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS.in} stopOpacity={0.95} />
                  <stop offset="100%" stopColor={COLORS.in} stopOpacity={0.55} />
                </linearGradient>
                <linearGradient id="gOut" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS.out} stopOpacity={0.95} />
                  <stop offset="100%" stopColor={COLORS.out} stopOpacity={0.55} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke={COLORS.grid} />
              <XAxis dataKey="mes" tickLine={false} axisLine={false} tick={axis} />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={axis}
                width={64}
                tickFormatter={compact}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--flow-total-bg)" }} />
              <Legend
                iconType="circle"
                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
              />
              <Bar
                dataKey="entradas"
                name="Entradas"
                fill="url(#gIn)"
                radius={[4, 4, 0, 0]}
                maxBarSize={26}
              />
              <Bar
                dataKey="saidas"
                name="Saídas"
                fill="url(#gOut)"
                radius={[4, 4, 0, 0]}
                maxBarSize={26}
              />
              <Line
                type="monotone"
                dataKey="acumulado"
                name="Saldo acumulado"
                stroke={COLORS.saldo}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <div className="xl:col-span-2">
        <Panel
          title="Movimentação por categoria financeira"
          subtitle="Maiores categorias no período (entradas em verde, saídas em vermelho)"
        >
          <ResponsiveContainer width="100%" height={Math.max(280, porCategoria.length * 32)}>
            <BarChart
              data={porCategoria}
              layout="vertical"
              margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
            >
              <CartesianGrid horizontal={false} stroke={COLORS.grid} />
              <XAxis
                type="number"
                tickLine={false}
                axisLine={false}
                tick={axis}
                tickFormatter={compact}
              />
              <YAxis
                type="category"
                dataKey="categoria"
                tickLine={false}
                axisLine={false}
                tick={axis}
                width={220}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--flow-total-bg)" }} />
              <Bar dataKey="valor" name="Total" radius={[0, 4, 4, 0]} maxBarSize={20}>
                {porCategoria.map((r) => (
                  <Cell
                    key={`${r.tipo}-${r.categoria}`}
                    fill={r.tipo === "Entradas" ? COLORS.in : COLORS.out}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>
    </section>
  );
}
