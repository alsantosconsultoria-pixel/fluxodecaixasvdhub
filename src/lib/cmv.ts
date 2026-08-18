import * as XLSX from "xlsx";

/** Linha bruta da planilha de veículos vendidos (chaves já normalizadas). */
export type CmvRaw = Record<string, string | number | null>;

export type TipoVenda = "Próprio" | "Consignado";

export type VendaVeiculo = {
  data: string | null; // ISO yyyy-mm-dd
  modelo: string;
  placa: string;
  dataCompra: string | null;
  dias: number;
  compra: number;
  pis: number;
  cofins: number;
  icms: number;
  ibs: number;
  cbs: number;
  patio: number;
  lancamentos: number;
  tipo: TipoVenda;
  comissaoPct: number;
  comissao: number;
  custoTotal: number; // CMV da placa (positivo)
  venda: number;
  lucro: number;
  margem: number; // fração (0,045 = 4,5%)
  vendedor: string;
  cliente: string;
  fornecedor: string;
};

function normalizar(txt: string) {
  return txt
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

const MAPA: Record<string, string> = {
  "dt. venda": "dataVenda",
  "dt venda": "dataVenda",
  "data venda": "dataVenda",
  modelo: "modelo",
  placa: "placa",
  "data compra": "dataCompra",
  dias: "dias",
  compra: "compra",
  pis: "pis",
  cofins: "cofins",
  icms: "icms",
  ibs: "ibs",
  cbs: "cbs",
  "c.patio": "patio",
  "c. patio": "patio",
  lancamentos: "lancamentos",
  "proprio / consignado": "tipo",
  "proprio/consignado": "tipo",
  "comissao %": "comissaoPct",
  "valor comissao": "comissao",
  total: "total",
  venda: "venda",
  "lucro liquido": "lucro",
  margem: "margem",
  vendedor: "vendedor",
  cliente: "cliente",
  comercial: "comercial",
  fornecedor: "fornecedor",
};

export function num(v: unknown): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v !== "string") return 0;
  const limpo = v
    .replace(/[R$\s%]/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(",", ".");
  const n = Number(limpo.replace(/[()]/g, ""));
  if (!Number.isFinite(n)) return 0;
  return /^\(.*\)$/.test(v.trim()) ? -n : n;
}

function toISO(v: unknown): string | null {
  if (v == null || v === "") return null;
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString().slice(0, 10);
  if (typeof v === "number") {
    const d = new Date(Date.UTC(1899, 11, 30) as unknown as number);
    d.setUTCDate(d.getUTCDate() + Math.round(v));
    return d.toISOString().slice(0, 10);
  }
  const s = String(v).trim();
  const br = s.match(/^(\d{2})[/-](\d{2})[/-](\d{4})/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return iso[0];
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

/** Lê a aba de faturamento de veículos vendidos (procura o cabeçalho em qualquer aba). */
export function lerVeiculos(wb: XLSX.WorkBook): CmvRaw[] {
  const out: CmvRaw[] = [];
  for (const nome of wb.SheetNames) {
    const matriz = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[nome], {
      header: 1,
      defval: "",
      raw: true,
    });
    const idx = matriz.findIndex((linha) => {
      const chaves = linha.map((c) => normalizar(String(c ?? "")));
      return chaves.includes("placa") && chaves.includes("venda") && chaves.includes("vendedor");
    });
    if (idx < 0) continue;

    const header = matriz[idx].map((c) => MAPA[normalizar(String(c ?? ""))] ?? "");
    for (const linha of matriz.slice(idx + 1)) {
      const row: CmvRaw = {};
      header.forEach((campo, i) => {
        if (!campo) return;
        const v = linha[i];
        row[campo] =
          v instanceof Date ? v.toISOString() : typeof v === "number" ? v : String(v ?? "");
      });
      const placa = String(row["placa"] ?? "").trim();
      const data = toISO(row["dataVenda"]);
      if (!placa || !data) continue; // ignora linhas de total/vazias
      if (normalizar(placa) === "total") continue;
      out.push(row);
    }
  }
  return out;
}

/** Chave de deduplicação (placa + data + venda). */
function chave(r: CmvRaw) {
  return `${String(r["placa"] ?? "").trim().toUpperCase()}|${toISO(r["dataVenda"])}|${num(r["venda"])}`;
}

export function mesclarVeiculos(atuais: CmvRaw[], novas: CmvRaw[]): CmvRaw[] {
  const vistos = new Set(atuais.map(chave));
  const out = [...atuais];
  for (const r of novas) {
    const k = chave(r);
    if (vistos.has(k)) continue;
    vistos.add(k);
    out.push(r);
  }
  return out;
}

export function normalizarVenda(r: CmvRaw): VendaVeiculo {
  const venda = num(r["venda"]);
  const lucro = num(r["lucro"]);
  const total = num(r["total"]);
  const custoTotal = Math.abs(total) || Math.max(venda - lucro, 0);
  const tipo: TipoVenda = normalizar(String(r["tipo"] ?? "")).startsWith("cons")
    ? "Consignado"
    : "Próprio";
  const margemBruta = num(r["margem"]);
  return {
    data: toISO(r["dataVenda"]),
    modelo: String(r["modelo"] ?? "").trim(),
    placa: String(r["placa"] ?? "").trim().toUpperCase(),
    dataCompra: toISO(r["dataCompra"]),
    dias: num(r["dias"]),
    compra: Math.abs(num(r["compra"])),
    pis: Math.abs(num(r["pis"])),
    cofins: Math.abs(num(r["cofins"])),
    icms: Math.abs(num(r["icms"])),
    ibs: Math.abs(num(r["ibs"])),
    cbs: Math.abs(num(r["cbs"])),
    patio: Math.abs(num(r["patio"])),
    lancamentos: Math.abs(num(r["lancamentos"])),
    tipo,
    comissaoPct: num(r["comissaoPct"]),
    comissao: Math.abs(num(r["comissao"])),
    custoTotal,
    venda,
    lucro,
    margem: margemBruta || (venda ? lucro / venda : 0),
    vendedor: String(r["vendedor"] ?? "").trim() || "—",
    cliente: String(r["cliente"] ?? "").trim(),
    fornecedor: String(r["fornecedor"] ?? "").trim(),
  };
}

export function normalizarVendas(rows: CmvRaw[]): VendaVeiculo[] {
  return rows.map(normalizarVenda).sort((a, b) => (a.data ?? "").localeCompare(b.data ?? ""));
}

export type Resumo = {
  faturamento: number;
  cmv: number;
  lucro: number;
  margem: number;
  comissoes: number;
  quantidade: number;
};

export function resumir(vendas: VendaVeiculo[]): Resumo {
  const faturamento = vendas.reduce((a, v) => a + v.venda, 0);
  const cmv = vendas.reduce((a, v) => a + v.custoTotal, 0);
  const lucro = vendas.reduce((a, v) => a + v.lucro, 0);
  const comissoes = vendas.reduce((a, v) => a + v.comissao, 0);
  return {
    faturamento,
    cmv,
    lucro,
    margem: faturamento ? lucro / faturamento : 0,
    comissoes,
    quantidade: vendas.length,
  };
}

export type RankingVendedor = Resumo & { vendedor: string };

export function rankingVendedores(vendas: VendaVeiculo[]): RankingVendedor[] {
  const mapa = new Map<string, VendaVeiculo[]>();
  for (const v of vendas) {
    const atual = mapa.get(v.vendedor) ?? [];
    atual.push(v);
    mapa.set(v.vendedor, atual);
  }
  return [...mapa.entries()]
    .map(([vendedor, lista]) => ({ vendedor, ...resumir(lista) }))
    .sort((a, b) => b.lucro - a.lucro);
}

export function formatarMoeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatarPct(v: number, casas = 2) {
  return `${(v * 100).toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  })}%`;
}

export function formatarData(iso: string | null) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
