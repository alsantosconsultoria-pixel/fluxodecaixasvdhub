export type Linha = { categoria: string; valores: number[] };
export type FluxoData = { meses: string[]; entradas: Linha[]; saidas: Linha[] };

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

function parseMes(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) {
    return `${String(value.getMonth() + 1).padStart(2, "0")}/${value.getFullYear()}`;
  }
  const s = String(value).trim();
  const m = s.match(/^(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[1].padStart(2, "0")}/${m[2]}`;
  const d = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (d) return `${d[2].padStart(2, "0")}/${d[3]}`;
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

/** Aggregates raw spreadsheet rows into the monthly cash-flow matrix. */
export function buildFluxo(rows: Raw[]): FluxoData {
  type Bucket = Map<string, Map<string, number>>;
  const entradas: Bucket = new Map();
  const saidas: Bucket = new Map();
  const mesesSet = new Set<string>();

  for (const row of rows) {
    const mes = parseMes(pick(row, "Mês referência"));
    if (!mes) continue;
    const ano = Number(mes.split("/")[1]);
    if (ano < 2023 || ano > 2027) continue;

    const operacao = String(pick(row, "Operação") ?? "")
      .trim()
      .toLowerCase();
    const categoria = String(pick(row, "Categoria financeira") ?? "").trim();
    if (!categoria) continue;

    const valor = parseValor(pick(row, "Valor título"));
    let bucket: Bucket;
    let signed: number;
    if (operacao === "receber") {
      bucket = entradas;
      signed = valor;
    } else if (operacao === "pagar") {
      bucket = saidas;
      signed = -valor;
    } else {
      continue;
    }

    mesesSet.add(mes);
    const porMes = bucket.get(categoria) ?? new Map<string, number>();
    porMes.set(mes, (porMes.get(mes) ?? 0) + signed);
    bucket.set(categoria, porMes);
  }

  const meses = [...mesesSet].sort((a, b) => {
    const [ma, ya] = a.split("/").map(Number);
    const [mb, yb] = b.split("/").map(Number);
    return ya - yb || ma - mb;
  });

  const toRows = (bucket: Bucket): Linha[] =>
    [...bucket.entries()]
      .map(([categoria, porMes]) => ({
        categoria,
        valores: meses.map((m) => Math.round((porMes.get(m) ?? 0) * 100) / 100),
      }))
      .sort(
        (a, b) =>
          b.valores.reduce((x, y) => x + y, 0) - a.valores.reduce((x, y) => x + y, 0),
      );

  return { meses, entradas: toRows(entradas), saidas: toRows(saidas) };
}

export function computeTotais(data: FluxoData, saldoInicial = 0) {
  const soma = (rows: Linha[], i: number) =>
    rows.reduce((acc, r) => acc + (r.valores[i] ?? 0), 0);
  const totalEntradas = data.meses.map((_, i) => soma(data.entradas, i));
  const totalSaidas = data.meses.map((_, i) => soma(data.saidas, i));
  const operacional = data.meses.map((_, i) => totalEntradas[i] - totalSaidas[i]);
  const inicial: number[] = [];
  const acumulado: number[] = [];
  data.meses.forEach((_, i) => {
    const ini = i === 0 ? saldoInicial : acumulado[i - 1];
    inicial.push(ini);
    acumulado.push(ini + operacional[i]);
  });
  return { totalEntradas, totalSaidas, operacional, inicial, acumulado };
}
