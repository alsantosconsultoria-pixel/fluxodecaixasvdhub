export type Linha = { categoria: string; valores: number[] };
export type FluxoData = { meses: string[]; entradas: Linha[]; saidas: Linha[] };
export type FluxoBundle = {
  meses: string[];
  realizado: FluxoData;
  previsto: FluxoData;
  total: FluxoData;
};

export type Raw = Record<string, unknown>;

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

export type Granularidade = "mes" | "dia";

/** Rótulo de um período ("MM/YYYY" ou "DD/MM/YYYY"). */
export function periodoLabel(p: string) {
  const partes = p.split("/");
  if (partes.length === 3) {
    const [dd, mm, yyyy] = partes;
    return `${dd}/${MESES_ABREV[Number(mm) - 1] ?? mm}/${yyyy.slice(2)}`;
  }
  const [mm, yyyy] = partes;
  return `${MESES_ABREV[Number(mm) - 1] ?? mm}/${yyyy}`;
}

/** Alias histórico. */
export const mesLabel = periodoLabel;

/** Primeiro e último dia (ISO) cobertos pelo período. */
export function periodoRangeISO(p: string): [string, string] {
  const partes = p.split("/");
  if (partes.length === 3) {
    const iso = `${partes[2]}-${partes[1]}-${partes[0]}`;
    return [iso, iso];
  }
  const [mm, yyyy] = partes;
  const ultimo = new Date(Number(yyyy), Number(mm), 0).getDate();
  return [`${yyyy}-${mm}-01`, `${yyyy}-${mm}-${String(ultimo).padStart(2, "0")}`];
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

export function pick(row: Raw, wanted: string): unknown {
  const target = normalizeKey(wanted);
  for (const k of Object.keys(row)) {
    if (normalizeKey(k) === target) return row[k];
  }
  return undefined;
}

/** Converts any supported date cell into a "MM/YYYY" reference. */
export function parseMes(value: unknown): string | null {
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

/** Converts any supported date cell into a "DD/MM/YYYY" reference. */
export function parseDia(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) {
    return `${String(value.getDate()).padStart(2, "0")}/${String(
      value.getMonth() + 1,
    ).padStart(2, "0")}/${value.getFullYear()}`;
  }
  const s = String(value).trim();
  const d = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (d) return `${d[1].padStart(2, "0")}/${d[2].padStart(2, "0")}/${d[3]}`;
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  return null;
}

/** Período conforme a granularidade escolhida. */
export function parsePeriodo(value: unknown, gran: Granularidade): string | null {
  return gran === "dia" ? parseDia(value) : parseMes(value);
}

export function parseValor(value: unknown): number {
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
 * Reference rules (validated against the base spreadsheet):
 * - Realizado: Conciliado = "Sim" -> month from "Data baixa", amount "Total pago".
 * - Provisão:  Conciliado = "Não" -> month from "Data vencimento", amount "Valor título".
 * Applies to both "Pagar" (saídas) and "Receber" (entradas).
 */
function parseLancamentos(rows: Raw[], gran: Granularidade): Lancamento[] {
  const out: Lancamento[] = [];
  for (const row of rows) {
    const categoria = String(pick(row, "Categoria financeira") ?? "").trim();
    if (!categoria) continue;

    const operacao = String(pick(row, "Operação") ?? "")
      .trim()
      .toLowerCase();
    if (operacao !== "pagar" && operacao !== "receber") continue;

    const conciliado = String(pick(row, "Conciliado") ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();
    const realizado = conciliado === "sim";

    const mes = realizado
      ? parsePeriodo(pick(row, "Data baixa"), gran)
      : parsePeriodo(pick(row, "Data vencimento"), gran);
    if (!mes) continue;

    const partes = mes.split("/");
    const ano = Number(partes[partes.length - 1]);
    if (ano < 2023 || ano > 2030) continue;

    const valor = parseValor(
      realizado ? (pick(row, "Total pago") ?? pick(row, "Valor pago")) : pick(row, "Valor título"),
    );
    if (!valor) continue;

    out.push({
      mes,
      categoria,
      valor: operacao === "pagar" ? -Math.abs(valor) : Math.abs(valor),
      tipo: operacao === "pagar" ? "saida" : "entrada",
      realizado,
    });
  }
  return out;
}


function sortMeses(meses: Iterable<string>) {
  return [...meses].sort((a, b) => periodoRangeISO(a)[0].localeCompare(periodoRangeISO(b)[0]));
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
export function buildFluxo(rows: Raw[], gran: Granularidade = "mes"): FluxoBundle {
  const lancamentos = parseLancamentos(rows, gran);
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

/* ---------- filtros, merge e utilidades de visão ---------- */

export type Filtros = { de: string | null; ate: string | null; categorias: string[] };

export const FILTROS_VAZIOS: Filtros = { de: null, ate: null, categorias: [] };

function mesKey(m: string) {
  const [mm, yyyy] = m.split("/").map(Number);
  return yyyy * 12 + mm;
}

const somaLinha = (v: number[]) => v.reduce((a, b) => a + b, 0);

/** Soma duas visões (mesmo eixo de meses) categoria a categoria. */
export function mergeFluxo(a: FluxoData, b: FluxoData): FluxoData {
  const meses = a.meses.length ? a.meses : b.meses;
  const mergeRows = (x: Linha[], y: Linha[]): Linha[] => {
    const map = new Map<string, number[]>();
    for (const r of [...x, ...y]) {
      const cur = map.get(r.categoria);
      if (!cur) map.set(r.categoria, meses.map((_, i) => r.valores[i] ?? 0));
      else meses.forEach((_, i) => (cur[i] = (cur[i] ?? 0) + (r.valores[i] ?? 0)));
    }
    return [...map.entries()]
      .map(([categoria, valores]) => ({ categoria, valores }))
      .sort((p, q) => Math.abs(somaLinha(q.valores)) - Math.abs(somaLinha(p.valores)));
  };
  return {
    meses,
    entradas: mergeRows(a.entradas, b.entradas),
    saidas: mergeRows(a.saidas, b.saidas),
  };
}

export function fluxoVazio(meses: string[]): FluxoData {
  return { meses, entradas: [], saidas: [] };
}

export function categoriasDe(...datas: FluxoData[]) {
  const set = new Set<string>();
  for (const d of datas) for (const r of [...d.entradas, ...d.saidas]) set.add(r.categoria);
  return [...set].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function sliceRows(rows: Linha[], keep: number[], categorias: string[]): Linha[] {
  return rows
    .filter((r) => !categorias.length || categorias.includes(r.categoria))
    .map((r) => ({ categoria: r.categoria, valores: keep.map((i) => r.valores[i] ?? 0) }))
    .filter((r) => r.valores.some((v) => v !== 0));
}

/**
 * Aplica os filtros a várias visões que compartilham o mesmo eixo de meses,
 * mantendo o alinhamento entre elas e removendo meses sem movimento.
 */
export function aplicarFiltros(partes: FluxoData[], filtros: Filtros): FluxoData[] {
  const meses = partes.find((p) => p.meses.length)?.meses ?? [];
  const dentro = meses
    .map((_, i) => i)
    .filter((i) => {
      const k = mesKey(meses[i]);
      return (
        (!filtros.de || k >= mesKey(filtros.de)) && (!filtros.ate || k <= mesKey(filtros.ate))
      );
    });

  const parciais = partes.map((p) => ({
    meses: dentro.map((i) => meses[i]),
    entradas: sliceRows(p.entradas, dentro, filtros.categorias),
    saidas: sliceRows(p.saidas, dentro, filtros.categorias),
  }));

  const comMovimento = dentro.map((_, i) => i).filter((i) =>
    parciais.some((p) =>
      [...p.entradas, ...p.saidas].some((r) => (r.valores[i] ?? 0) !== 0),
    ),
  );

  return parciais.map((p) => ({
    meses: comMovimento.map((i) => p.meses[i]),
    entradas: p.entradas.map((r) => ({
      categoria: r.categoria,
      valores: comMovimento.map((i) => r.valores[i] ?? 0),
    })),
    saidas: p.saidas.map((r) => ({
      categoria: r.categoria,
      valores: comMovimento.map((i) => r.valores[i] ?? 0),
    })),
  }));
}

/** Valor de uma categoria/mês dentro de uma visão. */
export function valorEm(data: FluxoData, tipo: "entradas" | "saidas", categoria: string, i: number) {
  return data[tipo].find((r) => r.categoria === categoria)?.valores[i] ?? 0;
}
