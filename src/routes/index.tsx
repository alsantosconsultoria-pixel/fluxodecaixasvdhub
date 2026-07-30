import { createFileRoute } from "@tanstack/react-router";
import data from "@/data/fluxo-caixa.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fluxo de Caixa Mensal | Painel Financeiro" },
      {
        name: "description",
        content:
          "Fluxo de caixa mensal com entradas e saídas por categoria financeira, saldo operacional e saldo acumulado.",
      },
      { property: "og:title", content: "Fluxo de Caixa Mensal | Painel Financeiro" },
      {
        property: "og:description",
        content:
          "Entradas e saídas por categoria financeira, saldo operacional e saldo acumulado por mês.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FluxoDeCaixa,
});

type Linha = { categoria: string; valores: number[] };

const SALDO_INICIAL = 0;

function fmt(v: number) {
  if (!v) return "-";
  const s = Math.abs(v).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return v < 0 ? `(${s})` : s;
}

function mesLabel(m: string) {
  const [mm, yyyy] = m.split("/");
  const nomes = [
    "JAN",
    "FEV",
    "MAR",
    "ABR",
    "MAI",
    "JUN",
    "JUL",
    "AGO",
    "SET",
    "OUT",
    "NOV",
    "DEZ",
  ];
  return `${nomes[Number(mm) - 1]}/${yyyy}`;
}

function FluxoDeCaixa() {
  const meses: string[] = data.meses;
  const entradas: Linha[] = data.entradas;
  const saidas: Linha[] = data.saidas;

  const soma = (rows: Linha[], i: number) =>
    rows.reduce((acc, r) => acc + (r.valores[i] ?? 0), 0);

  const totalEntradas = meses.map((_, i) => soma(entradas, i));
  const totalSaidas = meses.map((_, i) => soma(saidas, i));
  const operacional = meses.map((_, i) => totalEntradas[i] - totalSaidas[i]);

  const inicial: number[] = [];
  const acumulado: number[] = [];
  meses.forEach((_, i) => {
    const ini = i === 0 ? SALDO_INICIAL : acumulado[i - 1];
    inicial.push(ini);
    acumulado.push(ini + operacional[i]);
  });

  const cell =
    "border border-flow-grid px-2 py-[3px] text-right tabular-nums whitespace-nowrap";
  const head = "sticky left-0 z-10 min-w-[240px] text-left px-2 py-[3px] border border-flow-grid";

  return (
    <main className="min-h-screen bg-background p-4 md:p-8">
      <header className="mb-4">
        <h1 className="text-xl font-semibold text-foreground">Fluxo de Caixa</h1>
        <p className="text-sm text-muted-foreground">
          Entradas e saídas agrupadas por categoria financeira e mês de referência.
        </p>
      </header>

      <div className="overflow-auto rounded-md border border-flow-grid bg-card">
        <table className="w-full border-collapse text-[11px] leading-tight">
          <thead>
            <tr className="bg-flow-total-bg font-semibold text-foreground">
              <th className={`${head} bg-flow-total-bg`}>Categoria</th>
              {meses.map((m) => (
                <th key={m} className={`${cell} text-center font-semibold`}>
                  {mesLabel(m)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="bg-flow-saldo-bg font-semibold text-flow-saldo">
              <td className={`${head} bg-flow-saldo-bg`}>Saldo Inicial Caixa</td>
              {inicial.map((v, i) => (
                <td key={i} className={cell}>
                  {fmt(v)}
                </td>
              ))}
            </tr>

            <tr className="bg-flow-in-bg font-semibold text-flow-in">
              <td className={`${head} bg-flow-in-bg`}>Entradas</td>
              {totalEntradas.map((v, i) => (
                <td key={i} className={cell}>
                  {fmt(v)}
                </td>
              ))}
            </tr>
            {entradas.map((r) => (
              <tr key={r.categoria} className="text-flow-in">
                <td className={`${head} bg-card pl-4 font-normal`}>{r.categoria}</td>
                {r.valores.map((v, i) => (
                  <td key={i} className={cell}>
                    {fmt(v)}
                  </td>
                ))}
              </tr>
            ))}

            <tr className="bg-flow-out-bg font-semibold text-flow-out">
              <td className={`${head} bg-flow-out-bg`}>Saídas</td>
              {totalSaidas.map((v, i) => (
                <td key={i} className={cell}>
                  {fmt(v)}
                </td>
              ))}
            </tr>
            {saidas.map((r) => (
              <tr key={r.categoria} className="text-flow-out">
                <td className={`${head} bg-card pl-4 font-normal`}>{r.categoria}</td>
                {r.valores.map((v, i) => (
                  <td key={i} className={cell}>
                    {fmt(v)}
                  </td>
                ))}
              </tr>
            ))}

            <tr className="bg-flow-total-bg font-semibold text-foreground">
              <td className={`${head} bg-flow-total-bg`}>Saldo Operacional</td>
              {operacional.map((v, i) => (
                <td key={i} className={cell}>
                  {fmt(v)}
                </td>
              ))}
            </tr>
            <tr className="bg-flow-total-bg font-semibold text-flow-in">
              <td className={`${head} bg-flow-total-bg`}>Saldo Acumulado</td>
              {acumulado.map((v, i) => (
                <td key={i} className={cell}>
                  {fmt(v)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </main>
  );
}
