import { supabase } from "@/integrations/supabase/client";
import { buscarEmpresa, salvarEmpresa } from "@/lib/empresa";
import {
  computeTotais,
  formatValor,
  periodoLabel,
  trimMeses,
  type FluxoData,
  type Raw,
} from "@/lib/fluxo";
import type { KpiConfig } from "@/lib/kpi-calc";

export type Backup = {
  versao: 1;
  gerado_em: string;
  fileName: string | null;
  rows: Raw[];
  empresa: { nome: string; logo_url: string | null } | null;
  bancos: Array<{
    nome: string;
    agencia: string;
    conta: string;
    saldo: number;
    observacao: string;
    data_saldo: string;
  }>;
  kpis: Array<Omit<KpiConfig, "id">>;
};

function baixar(conteudo: string, nome: string, mime: string) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
}

/** Reúne planilha em cache + dados do banco em um único arquivo de backup. */
export async function gerarBackup(rows: Raw[], fileName: string | null): Promise<Backup> {
  const [empresa, bancos, kpis] = await Promise.all([
    buscarEmpresa(),
    supabase
      .from("bank_accounts")
      .select("nome, agencia, conta, saldo, observacao, data_saldo")
      .order("nome"),
    supabase
      .from("kpi_configs")
      .select(
        "titulo, coluna, operacao, filtro_coluna, filtro_valor, comparar_periodo, formato, ordem",
      )
      .order("ordem"),
  ]);

  return {
    versao: 1,
    gerado_em: new Date().toISOString(),
    fileName,
    rows,
    empresa: empresa ? { nome: empresa.nome, logo_url: empresa.logo_url } : null,
    bancos: (bancos.data ?? []).map((b) => ({ ...b, saldo: Number(b.saldo) })),
    kpis: (kpis.data ?? []) as Array<Omit<KpiConfig, "id">>,
  };
}

export function baixarBackupJson(backup: Backup) {
  const hoje = new Date().toISOString().slice(0, 10);
  baixar(JSON.stringify(backup, null, 2), `backup-painel-${hoje}.json`, "application/json");
}

export function lerBackup(texto: string): Backup {
  const parsed = JSON.parse(texto) as Backup;
  if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.rows))
    throw new Error("Arquivo de backup inválido.");
  return parsed;
}

/** Restaura empresa, bancos e KPIs no banco de dados (requer perfil admin). */
export async function restaurarBackup(backup: Backup) {
  if (backup.empresa) {
    const atual = await buscarEmpresa();
    await salvarEmpresa({
      ...(atual?.id ? { id: atual.id } : {}),
      nome: backup.empresa.nome,
      logo_url: backup.empresa.logo_url,
    });
  }

  if (backup.bancos?.length) {
    await supabase.from("bank_accounts").delete().not("id", "is", null);
    const { error } = await supabase.from("bank_accounts").insert(backup.bancos);
    if (error) throw new Error(error.message);
  }

  if (backup.kpis?.length) {
    await supabase.from("kpi_configs").delete().not("id", "is", null);
    const { error } = await supabase.from("kpi_configs").insert(backup.kpis);
    if (error) throw new Error(error.message);
  }
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Gera uma página HTML autônoma com o fluxo de caixa atual. */
export function baixarHtml(data: FluxoData, empresa: string, saldoInicial = 0) {
  const view = trimMeses(data);
  const { totalEntradas, totalSaidas, operacional, inicial, acumulado } = computeTotais(
    view,
    saldoInicial,
  );
  const head = view.meses.map((m) => `<th>${esc(periodoLabel(m))}</th>`).join("");
  const linha = (rot: string, valores: number[], cls: string) =>
    `<tr class="${cls}"><td class="rot">${esc(rot)}</td>${valores
      .map((v) => `<td class="num">${esc(formatValor(v))}</td>`)
      .join("")}</tr>`;

  const corpo = [
    linha("Saldo Inicial Caixa", inicial, "saldo"),
    linha("Entradas", totalEntradas, "grupo entrada"),
    ...view.entradas.map((r) => linha(r.categoria, r.valores, "item")),
    linha("Saídas", totalSaidas, "grupo saida"),
    ...view.saidas.map((r) => linha(r.categoria, r.valores, "item")),
    linha("Saldo Operacional", operacional, "saldo"),
    linha("Saldo Acumulado", acumulado, "saldo forte"),
  ].join("");

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Fluxo de Caixa — ${esc(empresa)}</title>
<style>
  :root { color-scheme: light; }
  body { margin:0; padding:32px; font-family: ui-sans-serif, system-ui, sans-serif; background:#f5f7fb; color:#0f1c3f; }
  h1 { font-size:20px; margin:0 0 4px; }
  p.sub { margin:0 0 20px; color:#5b6b8c; font-size:13px; }
  .card { background:#fff; border:1px solid #dfe5f1; border-radius:12px; overflow:auto; box-shadow:0 8px 24px rgba(15,28,63,.06); }
  table { border-collapse:collapse; width:100%; font-size:13px; }
  th, td { padding:6px 10px; border-bottom:1px solid #eef1f7; white-space:nowrap; }
  thead th { position:sticky; top:0; background:#0f1c3f; color:#fff; text-align:right; font-size:11px; letter-spacing:.06em; text-transform:uppercase; }
  thead th:first-child { text-align:left; }
  td.num { text-align:right; font-variant-numeric:tabular-nums; }
  td.rot { font-weight:500; }
  tr.grupo td { font-weight:700; background:#f2f5fb; }
  tr.entrada td { color:#0f7a4a; }
  tr.saida td { color:#b3261e; }
  tr.saldo td { font-weight:600; background:#eef3ff; color:#12306e; }
  tr.forte td { background:#0f1c3f; color:#fff; }
  tr.item td.rot { padding-left:22px; color:#42526e; }
</style>
</head>
<body>
  <h1>Fluxo de Caixa — ${esc(empresa)}</h1>
  <p class="sub">Gerado em ${new Date().toLocaleString("pt-BR")}</p>
  <div class="card">
    <table>
      <thead><tr><th>Categoria</th>${head}</tr></thead>
      <tbody>${corpo}</tbody>
    </table>
  </div>
</body>
</html>`;

  const hoje = new Date().toISOString().slice(0, 10);
  baixar(html, `fluxo-de-caixa-${hoje}.html`, "text/html;charset=utf-8");
}
