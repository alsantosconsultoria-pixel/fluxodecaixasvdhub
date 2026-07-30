export type Linha = { categoria: string; valores: number[] };
export type FluxoData = { meses: string[]; entradas: Linha[]; saidas: Linha[] };
export type FluxoBundle = {
  meses: string[];
  realizado: FluxoData;
  previsto: FluxoData;
  total: FluxoData;
};

type Raw = Record<string, unknown>;

const MESES_ABREV = [
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

export function mesLabel(m: string) {
  const [mm, yyyy] = m.split("/");
  return `${MESES_ABREV[Number(mm) - 1] ?? mm}/${yyyy}`;
}

export function formatValor(v: number) {
  if (!v) return "-";
  const s = Math.abs(v).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return v < 0 ? `(${s})` : s;
}

function normalizeKey(k: string) {
  return k
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function pick(row: Raw, wanted: string): unknown {
  const target = normalizeKey(wanted);
  for (const k of Object.keys(row)) {
    if (normalizeKey(k) === target) return row[k];
  }
  return undefined;
}

/** Converts any supported date cell into a "MM/YYYY" reference. */
function parseMes(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) {
    return `${String(value.getMonth() + 1).padStart(2, "0")}/${value.getFullYear()}`;
  }
  const s = String(value).trim();
  const d = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (d) return `${d[2].padStart(2, "0")}/${d[3]}`;
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[2]}/${iso[1]}`;
  const m = s.match(/^(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[1].padStart(2, "0")}/${m[2]}`;
  return null;
}

function parseValor(value: unknown): number {
  if (typeof value === "number") return value;
  if (value == null) return 0;
  const s = String(value)
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

type Lancamento = {
  mes: string;
  categoria: string;
  valor: number;
  tipo: "entrada" | "saida";
  realizado: boolean;
};

/**
 * Reference-date rule:
 * - Settled entries (with "Data baixa"): use the settlement month, for both
 *   payables and receivables.
 * - Open/future entries (no "Data baixa"): use the due date ("Data vencimento"),
 *   ignoring any payment date.
 */
function parseLancamentos(rows: Raw[]): Lancamento[] {
  const out: Lancamento[] = [];
  for (const row of rows) {
    const categoria = String(pick(row, "Categoria financeira") ?? "").trim();
    if (!categoria) continue;

    const operacao = String(pick(row, "Operação") ?? "")
      .trim()
      .toLowerCase();
    if (operacao !== "pagar" && operacao !== "receber") continue;

    const baixa = parseMes(pick(row, "Data baixa"));
    const vencimento = parseMes(pick(row, "Data vencimento"));
    const realizado = Boolean(baixa);
    const mes = baixa ?? vencimento ?? parseMes(pick(row, "Mês referência"));
    if (!mes) continue;

    const ano = Number(mes.split("/")[1]);
    if (ano < 2023 || ano > 2030) continue;

    const valor = parseValor(pick(row, "Valor título"));
    out.push({
      mes,
      categoria,
      valor: operacao === "pagar" ? -valor : valor,
      tipo: operacao === "pagar" ? "saida" : "entrada",
      realizado,
    });
  }
  return out;
}

function sortMeses(meses: Iterable<string>) {
  return [...meses].sort((a, b) => {
    const [ma, ya] = a.split("/").map(Number);
    const [mb, yb] = b.split("/").map(Number);
    return ya - yb || ma - mb;
  });
}

function toFluxo(lancamentos: Lancamento[], meses: string[]): FluxoData {
  const buckets = {
    entrada: new Map<string, Map<string, number>>(),
    saida: new Map<string, Map<string, number>>(),
  };
  for (const l of lancamentos) {
    const bucket = buckets[l.tipo];
    const porMes = bucket.get(l.categoria) ?? new Map<string, number>();
    porMes.set(l.mes, (porMes.get(l.mes) ?? 0) + l.valor);
    bucket.set(l.categoria, porMes);
  }
  const toRows = (bucket: Map<string, Map<string, number>>): Linha[] =>
    [...bucket.entries()]
      .map(([categoria, porMes]) => ({
        categoria,
        valores: meses.map((m) => Math.round((porMes.get(m) ?? 0) * 100) / 100),
      }))
      .filter((r) => r.valores.some((v) => v !== 0))
      .sort(
        (a, b) =>
          b.valores.reduce((x, y) => x + y, 0) - a.valores.reduce((x, y) => x + y, 0),
      );

  return { meses, entradas: toRows(buckets.entrada), saidas: toRows(buckets.saida) };
}

/** Aggregates raw spreadsheet rows into realized / projected / total matrices. */
export function buildFluxo(rows: Raw[]): FluxoBundle {
  const lancamentos = parseLancamentos(rows);
  const meses = sortMeses(new Set(lancamentos.map((l) => l.mes)));
  return {
    meses,
    realizado: toFluxo(
      lancamentos.filter((l) => l.realizado),
      meses,
    ),
    previsto: toFluxo(
      lancamentos.filter((l) => !l.realizado),
      meses,
    ),
    total: toFluxo(lancamentos, meses),
  };
}

/** Drops months where the given view has no movement at all. */
export function trimMeses(data: FluxoData): FluxoData {
  const keep = data.meses
    .map((_, i) => i)
    .filter((i) =>
      [...data.entradas, ...data.saidas].some((r) => (r.valores[i] ?? 0) !== 0),
    );
  const map = (rows: Linha[]) =>
    rows.map((r) => ({ categoria: r.categoria, valores: keep.map((i) => r.valores[i]) }));
  return {
    meses: keep.map((i) => data.meses[i]),
    entradas: map(data.entradas),
    saidas: map(data.saidas),
  };
}

export function computeTotais(data: FluxoData, saldoInicial = 0) {
  const soma = (rows: Linha[], i: number) =>
    rows.reduce((acc, r) => acc + (r.valores[i] ?? 0), 0);
  const totalEntradas = data.meses.map((_, i) => soma(data.entradas, i));
  const totalSaidas = data.meses.map((_, i) => soma(data.saidas, i));
  const operacional = data.meses.map((_, i) => totalEntradas[i] + totalSaidas[i]);
  const inicial: number[] = [];
  const acumulado: number[] = [];
  data.meses.forEach((_, i) => {
    const ini = i === 0 ? saldoInicial : acumulado[i - 1];
    inicial.push(ini);
    acumulado.push(ini + operacional[i]);
  });
  return { totalEntradas, totalSaidas, operacional, inicial, acumulado };
}
