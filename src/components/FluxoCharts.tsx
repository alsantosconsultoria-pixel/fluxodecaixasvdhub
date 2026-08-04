import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { computeTotais, mergeFluxo, mesLabel, type FluxoData } from "@/lib/fluxo";

const COLORS = {
  in: "var(--flow-in)",
  inPrev: "var(--flow-in-prev)",
  out: "var(--flow-out)",
  outPrev: "var(--flow-out-prev)",
  saldo: "var(--flow-saldo)",
  grid: "var(--flow-grid)",
  muted: "var(--muted-foreground)",
};

/** Coluna de data usada para cada série. */
const FONTE: Record<string, string> = {
  "Entradas realizadas": "Data baixa",
  "Saídas realizadas": "Data baixa",
  "Entradas previstas": "Data vencimento",
  "Saídas previstas": "Data vencimento",
  "Saldo acumulado realizado": "Data baixa",
  "Saldo acumulado projetado": "Data baixa + Data vencimento",
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
      {payload
        .filter((p: any) => p.value)
        .map((p: any) => (
          <p key={p.dataKey} className="text-xs text-muted-foreground">
            <span className="flex items-center gap-2">
              <span
                className="inline-block size-2 rounded-full"
                style={{ background: p.color ?? p.fill }}
              />
              {p.name}:{" "}
              <span className="font-medium tabular-nums text-foreground">{money(p.value)}</span>
            </span>
            {FONTE[p.name] && (
              <span className="ml-4 block text-[10px] italic">
                referência: {FONTE[p.name]}
              </span>
            )}
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

export function FluxoCharts({
  realizado,
  previsto,
}: {
  realizado: FluxoData;
  previsto: FluxoData;
}) {
  const total = useMemo(() => mergeFluxo(realizado, previsto), [realizado, previsto]);
  const temRealizado = realizado.entradas.length + realizado.saidas.length > 0;
  const temPrevisto = previsto.entradas.length + previsto.saidas.length > 0;

  const mensal = useMemo(() => {
    const r = computeTotais(realizado);
    const p = computeTotais(previsto);
    const t = computeTotais(total);
    return total.meses.map((m, i) => ({
      mes: mesLabel(m),
      entradasR: Math.abs(r.totalEntradas[i] ?? 0),
      entradasP: Math.abs(p.totalEntradas[i] ?? 0),
      saidasR: Math.abs(r.totalSaidas[i] ?? 0),
      saidasP: Math.abs(p.totalSaidas[i] ?? 0),
      acumuladoR: r.acumulado[i] ?? 0,
      acumuladoT: t.acumulado[i] ?? 0,
    }));
  }, [realizado, previsto, total]);

  const porCategoria = useMemo(() => {
    const sum = (d: FluxoData, tipo: "entradas" | "saidas", c: string) =>
      Math.abs(d[tipo].find((r) => r.categoria === c)?.valores.reduce((a, b) => a + b, 0) ?? 0);
    const rows = (["entradas", "saidas"] as const).flatMap((tipo) =>
      total[tipo].map((r) => ({
        categoria: r.categoria,
        tipo,
        realizado: sum(realizado, tipo, r.categoria),
        previsto: sum(previsto, tipo, r.categoria),
      })),
    );
    return rows
      .map((r) => ({ ...r, totalCat: r.realizado + r.previsto }))
      .filter((r) => r.totalCat > 0)
      .sort((a, b) => b.totalCat - a.totalCat)
      .slice(0, 12);
  }, [realizado, previsto, total]);

  const entradasCat = porCategoria.filter((r) => r.tipo === "entradas");
  const saidasCat = porCategoria.filter((r) => r.tipo === "saidas");

  const axis = { stroke: COLORS.muted, fontSize: 11 };

  return (
    <section className="space-y-4">
      <ChartLegend />

      <Panel
        title="Entradas, saídas e saldo acumulado por período"
        subtitle="Tons sólidos: valores baixados (data da baixa) · Tons claros: valores previstos (data de vencimento)"
      >
        <ResponsiveContainer width="100%" height={340}>
          <ComposedChart data={mensal} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
            <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
            <Bar
              dataKey="entradasR"
              stackId="in"
              name="Entradas realizadas"
              fill={COLORS.in}
              maxBarSize={26}
            />
            <Bar
              dataKey="entradasP"
              stackId="in"
              name="Entradas previstas"
              fill={COLORS.inPrev}
              radius={[4, 4, 0, 0]}
              maxBarSize={26}
            />
            <Bar
              dataKey="saidasR"
              stackId="out"
              name="Saídas realizadas"
              fill={COLORS.out}
              maxBarSize={26}
            />
            <Bar
              dataKey="saidasP"
              stackId="out"
              name="Saídas previstas"
              fill={COLORS.outPrev}
              radius={[4, 4, 0, 0]}
              maxBarSize={26}
            />
            {temRealizado && (
              <Line
                type="monotone"
                dataKey="acumuladoR"
                name="Saldo acumulado realizado"
                stroke={COLORS.saldo}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4 }}
              />
            )}
            {temPrevisto && (
              <Line
                type="monotone"
                dataKey="acumuladoT"
                name="Saldo acumulado projetado"
                stroke={COLORS.saldo}
                strokeWidth={2}
                strokeDasharray="5 4"
                dot={false}
                activeDot={{ r: 4 }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-2">
        <CategoriaPanel
          title="Entradas por categoria financeira"
          data={entradasCat}
          cores={[COLORS.in, COLORS.inPrev]}
          axis={axis}
        />
        <CategoriaPanel
          title="Saídas por categoria financeira"
          data={saidasCat}
          cores={[COLORS.out, COLORS.outPrev]}
          axis={axis}
        />
      </div>
    </section>
  );
}

function CategoriaPanel({
  title,
  data,
  cores,
  axis,
}: {
  title: string;
  data: { categoria: string; realizado: number; previsto: number }[];
  cores: [string, string] | string[];
  axis: object;
}) {
  return (
    <Panel title={title} subtitle="Realizado (data da baixa) + previsto (data de vencimento)">
      <ResponsiveContainer width="100%" height={Math.max(240, data.length * 34)}>
        <BarChart
          data={data}
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
            width={190}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--flow-total-bg)" }} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
          <Bar dataKey="realizado" stackId="c" name="Realizado" fill={cores[0]} maxBarSize={20} />
          <Bar
            dataKey="previsto"
            stackId="c"
            name="Previsto"
            fill={cores[1]}
            radius={[0, 4, 4, 0]}
            maxBarSize={20}
          />
        </BarChart>
      </ResponsiveContainer>
    </Panel>
  );
}

export function ChartLegend() {
  const items = [
    { c: "var(--flow-in)", l: "Entradas realizadas", s: "Data baixa" },
    { c: "var(--flow-in-prev)", l: "Entradas previstas", s: "Data vencimento" },
    { c: "var(--flow-out)", l: "Saídas realizadas", s: "Data baixa" },
    { c: "var(--flow-out-prev)", l: "Saídas previstas", s: "Data vencimento" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-flow-grid bg-card px-4 py-3 shadow-elegant">
      {items.map((i) => (
        <span key={i.l} className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-block size-2.5 rounded-sm" style={{ background: i.c }} />
          <span className="font-medium text-foreground">{i.l}</span>
          <span className="italic">({i.s})</span>
        </span>
      ))}
    </div>
  );
}
