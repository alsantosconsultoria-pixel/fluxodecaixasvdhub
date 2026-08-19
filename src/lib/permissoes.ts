/** Catálogo único das abas do sistema, usado pelo menu e pelo painel de permissões. */
export type Grupo = "financeiro" | "administracao";

export type Aba = {
  chave: string;
  titulo: string;
  rota: string;
  grupo: Grupo;
};

export const ABAS: Aba[] = [
  { chave: "fluxo", titulo: "Fluxo de Caixa", rota: "/", grupo: "financeiro" },
  { chave: "bancos", titulo: "Saldos Bancários", rota: "/bancos", grupo: "financeiro" },
  { chave: "dre", titulo: "DRE Gerencial", rota: "/dre", grupo: "financeiro" },
  { chave: "projecao", titulo: "Projeções futuras", rota: "/projecao", grupo: "financeiro" },
  { chave: "cmv", titulo: "Análise de CMV", rota: "/cmv", grupo: "financeiro" },
  { chave: "apresentacao", titulo: "Apresentação", rota: "/apresentacao", grupo: "financeiro" },
  { chave: "kpis", titulo: "Editar KPIs", rota: "/kpis", grupo: "administracao" },
  { chave: "usuarios", titulo: "Usuários", rota: "/usuarios", grupo: "administracao" },
  { chave: "empresa", titulo: "Empresa", rota: "/empresa", grupo: "administracao" },
  { chave: "backup", titulo: "Backup", rota: "/backup", grupo: "administracao" },
  { chave: "logs", titulo: "Registros", rota: "/logs", grupo: "administracao" },
];

export const CHAVES_ABAS = ABAS.map((a) => a.chave);

/** Padrão para quem ainda não tem permissões salvas: somente abas financeiras. */
export const ABAS_PADRAO = ABAS.filter((a) => a.grupo === "financeiro").map((a) => a.chave);

export function abaPorRota(rota: string): Aba | undefined {
  return ABAS.find((a) => a.rota === rota);
}

export const ROTULO_GRUPO: Record<Grupo, string> = {
  financeiro: "Financeiro",
  administracao: "Administração",
};
