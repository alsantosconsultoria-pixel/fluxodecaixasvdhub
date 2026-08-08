import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { DatabaseBackup, Download, FileCode2, Loader2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  baixarBackupJson,
  baixarHtml,
  gerarBackup,
  lerBackup,
  restaurarBackup,
} from "@/lib/backup";
import { listarBancos, somaSaldos } from "@/lib/bancos";
import { useEmpresa } from "@/lib/empresa";
import { useFluxo } from "@/lib/fluxo-store";
import { registrarLog } from "@/lib/logs";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/backup")({
  head: () => ({
    meta: [
      { title: "Backup e Exportação | Fluxo de Caixa | Painel Financeiro" },
      {
        name: "description",
        content:
          "Baixe o fluxo de caixa em HTML, gere backup JSON e restaure os dados do painel financeiro.",
      },
      { property: "og:title", content: "Backup e Exportação | Fluxo de Caixa | Painel Financeiro" },
      {
        property: "og:description",
        content: "Baixe o fluxo de caixa em HTML, gere backup JSON e restaure os dados do painel financeiro.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BackupPage,
});

function BackupPage() {
  const { isAdmin } = useSession();
  const { empresa } = useEmpresa();
  const { bundle, bundleDia, temDetalheDiario, rows, fileName } = useFluxo();
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { restaurar } = useFluxo();

  const dados = temDetalheDiario ? bundleDia.total : bundle.total;

  async function exportarHtml() {
    setOcupado("html");
    setErro(null);
    try {
      const saldoInicial = somaSaldos(await listarBancos().catch(() => []));
      baixarHtml(dados, empresa?.nome ?? "Painel Financeiro", saldoInicial);
      void registrarLog("exportacao", "Fluxo de caixa exportado em HTML");
      setMsg("Arquivo HTML gerado.");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao gerar o HTML.");
    } finally {
      setOcupado(null);
    }
  }

  async function exportarJson() {
    setOcupado("json");
    setErro(null);
    try {
      const backup = await gerarBackup(rows, fileName);
      baixarBackupJson(backup);
      void registrarLog(
        "backup",
        `Backup JSON gerado (${backup.rows.length} lançamentos, ${backup.bancos.length} bancos, ${backup.kpis.length} KPIs)`,
      );
      setMsg("Backup JSON baixado.");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao gerar o backup.");
    } finally {
      setOcupado(null);
    }
  }

  async function aoRestaurar(file: File) {
    setOcupado("restore");
    setErro(null);
    setMsg(null);
    try {
      const backup = lerBackup(await file.text());
      await restaurarBackup(backup);
      restaurar(backup.rows ?? [], backup.fileName ?? file.name);
      void registrarLog("backup", `Backup restaurado a partir de "${file.name}"`);
      setMsg("Backup restaurado com sucesso.");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível restaurar o backup.");
    } finally {
      setOcupado(null);
    }
  }

  return (
    <div className="mx-auto max-w-[900px] space-y-6">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-flow-saldo">
          Administração
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">
          Backup e Exportação
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gere uma versão em HTML do fluxo de caixa, salve um backup completo em JSON e
          restaure os dados quando precisar.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <Cartao
          icon={<FileCode2 className="size-5 text-flow-saldo" />}
          titulo="Baixar código em HTML"
          descricao="Página autônoma com a tabela completa do fluxo de caixa, pronta para abrir no navegador ou enviar por e-mail."
          acao={
            <Button onClick={() => void exportarHtml()} disabled={ocupado !== null} className="w-full">
              {ocupado === "html" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              Baixar HTML
            </Button>
          }
        />
        <Cartao
          icon={<DatabaseBackup className="size-5 text-flow-saldo" />}
          titulo="Backup em JSON"
          descricao="Inclui a planilha importada, os saldos bancários, os KPIs configurados e os dados da empresa."
          acao={
            <Button
              variant="secondary"
              onClick={() => void exportarJson()}
              disabled={ocupado !== null}
              className="w-full"
            >
              {ocupado === "json" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              Baixar backup
            </Button>
          }
        />
        <Cartao
          icon={<Upload className="size-5 text-flow-saldo" />}
          titulo="Restaurar backup"
          descricao="Substitui bancos, KPIs, dados da empresa e a planilha base pelo conteúdo do arquivo JSON."
          acao={
            <>
              <input
                ref={inputRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void aoRestaurar(f);
                  e.target.value = "";
                }}
              />
              <Button
                variant="outline"
                onClick={() => inputRef.current?.click()}
                disabled={ocupado !== null || !isAdmin}
                className="w-full"
              >
                {ocupado === "restore" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Upload className="size-4" />
                )}
                Restaurar
              </Button>
            </>
          }
        />
      </section>

      {msg && <p className="text-sm text-flow-saldo">{msg}</p>}
      {erro && <p className="text-sm text-flow-out">{erro}</p>}
      {!isAdmin && (
        <p className="text-xs text-muted-foreground">
          Somente administradores podem restaurar backups.
        </p>
      )}
    </div>
  );
}

function Cartao({
  icon,
  titulo,
  descricao,
  acao,
}: {
  icon: React.ReactNode;
  titulo: string;
  descricao: string;
  acao: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-flow-grid bg-card p-4 shadow-elegant">
      {icon}
      <div className="flex-1">
        <h2 className="text-sm font-semibold">{titulo}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{descricao}</p>
      </div>
      {acao}
    </div>
  );
}
