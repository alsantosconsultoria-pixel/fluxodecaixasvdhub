import { parseMes, parseValor, pick, type Raw } from "@/lib/fluxo";

export type Operacao = "soma" | "media" | "contagem";
export type Formato = "moeda" | "numero" | "inteiro";

export type KpiConfig = {
  id: string;
  titulo: string;
  coluna: string;
  operacao: Operacao;
  filtro_coluna: string | null;
  filtro_valor: string | null;
  comparar_periodo: boolean;
  formato: Formato;
  ordem: number;
};

export type KpiResultado = {
  config: KpiConfig;
  valor: number;
  anterior: number | null;
  variacao: number | null;
  registros: number;
};

/** Todas as colunas presentes na planilha importada. */
export function colunasDe(rows: Raw[]): string[] {
  const set = new Set<string>();
  for (const r of rows) for (const k of Object.keys(r)) set.add(k);
  return [...set].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

/** Colunas que contêm números (candidatas a soma/média). */
export function colunasNumericas(rows: Raw[]): string[] {
  return colunasDe(rows).filter((c) =>
    rows.slice(0, 200).some((r) => {
      const v = r[c];
      return typeof v === "number" || (typeof v === "string" && /\d,\d|\d\.\d|^\d+$/.test(v));
    }),
  );
}

export function valoresUnicos(rows: Raw[], coluna: string): string[] {
  const set = new Set<string>();
  for (const r of rows) {
    const v = pick(r, coluna);
    if (v == null || v === "") continue;
    set.add(String(v).trim());
    if (set.size > 200) break;
  }
  return [...set].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function mesKey(m: string) {
  const [mm, yyyy] = m.split("/").map(Number);
  return yyyy * 12 + mm;
}

export function mesesDe(rows: Raw[], colunaData: string): string[] {
  const set = new Set<string>();
  for (const r of rows) {
    const m = parseMes(pick(r, colunaData));
    if (m) set.add(m);
  }
  return [...set].sort((a, b) => mesKey(a) - mesKey(b));
}

export type Periodo = { colunaData: string; de: string | null; ate: string | null };

function noPeriodo(row: Raw, p: Periodo) {
  const m = parseMes(pick(row, p.colunaData));
  if (!m) return !p.de && !p.ate;
  const k = mesKey(m);
  return (!p.de || k >= mesKey(p.de)) && (!p.ate || k <= mesKey(p.ate));
}

/** Período imediatamente anterior, com a mesma quantidade de meses. */
export function periodoAnterior(p: Periodo, meses: string[]): Periodo | null {
  if (!p.de || !p.ate || !meses.length) return null;
  const dentro = meses.filter((m) => mesKey(m) >= mesKey(p.de!) && mesKey(m) <= mesKey(p.ate!));
  if (!dentro.length) return null;
  const antes = meses.filter((m) => mesKey(m) < mesKey(p.de!));
  if (!antes.length) return null;
  const janela = antes.slice(-dentro.length);
  return { colunaData: p.colunaData, de: janela[0], ate: janela[janela.length - 1] };
}

function aplicar(rows: Raw[], cfg: KpiConfig, p: Periodo) {
  const filtradas = rows.filter((r) => {
    if (!noPeriodo(r, p)) return false;
    if (cfg.filtro_coluna && cfg.filtro_valor) {
      const v = pick(r, cfg.filtro_coluna);
      if (String(v ?? "").trim().toLowerCase() !== cfg.filtro_valor.trim().toLowerCase())
        return false;
    }
    return true;
  });
  if (cfg.operacao === "contagem") return { valor: filtradas.length, registros: filtradas.length };
  const valores = filtradas.map((r) => parseValor(pick(r, cfg.coluna)));
  const soma = valores.reduce((a, b) => a + b, 0);
  return {
    valor: cfg.operacao === "media" ? (valores.length ? soma / valores.length : 0) : soma,
    registros: filtradas.length,
  };
}

export function calcularKpis(
  rows: Raw[],
  configs: KpiConfig[],
  periodo: Periodo,
  meses: string[],
): KpiResultado[] {
  const anterior = periodoAnterior(periodo, meses);
  return [...configs]
    .sort((a, b) => a.ordem - b.ordem)
    .map((config) => {
      const atual = aplicar(rows, config, periodo);
      let ant: number | null = null;
      if (config.comparar_periodo && anterior) ant = aplicar(rows, config, anterior).valor;
      const variacao =
        ant != null && ant !== 0 ? ((atual.valor - ant) / Math.abs(ant)) * 100 : null;
      return { config, valor: atual.valor, anterior: ant, variacao, registros: atual.registros };
    });
}

export function formatarKpi(valor: number, formato: Formato) {
  if (formato === "moeda")
    return valor.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 2,
    });
  if (formato === "inteiro") return Math.round(valor).toLocaleString("pt-BR");
  return valor.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}
