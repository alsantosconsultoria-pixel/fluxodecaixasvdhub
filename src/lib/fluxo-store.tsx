import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import * as XLSX from "xlsx";

import baseData from "@/data/fluxo-caixa.json";
import { carregarDataset, gravarDataset, limparDataset } from "@/lib/dataset";
import {
  buildFluxo,
  computeTotais,
  contasRealizadas,
  mesclarRows,
  mesLabel,
  trimMeses,
  type FluxoBundle,
  type FluxoData,
  type Raw,
} from "@/lib/fluxo";
import { registrarLog } from "@/lib/logs";

const STORAGE_KEY = "fluxo:planilha";


/**
 * Lê os lançamentos de TODAS as abas da planilha, ignorando abas de resumo
 * (tabelas dinâmicas) que não têm as colunas da base.
 */
function lerLancamentos(wb: XLSX.WorkBook): Raw[] {
  const out: Raw[] = [];
  for (const nome of wb.SheetNames) {
    const linhas = XLSX.utils.sheet_to_json<Raw>(wb.Sheets[nome], { defval: "" });
    const valida = linhas.some(
      (r) =>
        Object.keys(r).some((k) => k.trim().toLowerCase() === "operação") &&
        Object.keys(r).some((k) => k.trim().toLowerCase() === "categoria financeira"),
    );
    if (valida) out.push(...linhas);
  }
  return out;
}

type Ctx = {
  bundle: FluxoBundle;
  bundleDia: FluxoBundle;
  temDetalheDiario: boolean;
  rows: Raw[];
  contas: string[];
  contasSelecionadas: string[];
  setContasSelecionadas: (contas: string[]) => void;
  fileName: string | null;
  erro: string | null;
  gravando: boolean;
  gravadoEm: string | null;
  importar: (file: File) => Promise<void>;
  restaurar: (rows: Raw[], fileName: string | null, mesclar?: boolean) => void;
  exportar: (data: FluxoData, nome: string) => void;
  gravar: () => Promise<void>;
  zerar: () => Promise<void>;
  abrirSeletor: () => void;
  inputProps: {
    ref: React.RefObject<HTMLInputElement | null>;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  };
};

const FluxoContext = createContext<Ctx | null>(null);

function lerCache(): { rows: Raw[]; fileName: string } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as { rows: Raw[]; fileName: string }) : null;
  } catch {
    return null;
  }
}

export function FluxoProvider({ children }: { children: ReactNode }) {
  const cache = typeof window === "undefined" ? null : lerCache();
  const [rows, setRows] = useState<Raw[]>(() => cache?.rows ?? []);
  const [fileName, setFileName] = useState<string | null>(cache?.fileName ?? null);
  const [erro, setErro] = useState<string | null>(null);
  const [contasSelecionadas, setContasSelecionadas] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const contas = useMemo(() => contasRealizadas(rows), [rows]);

  const bundle = useMemo<FluxoBundle>(
    () =>
      rows.length ? buildFluxo(rows, "mes", contasSelecionadas) : (baseData as FluxoBundle),
    [rows, contasSelecionadas],
  );

  const bundleDia = useMemo<FluxoBundle>(
    () => (rows.length ? buildFluxo(rows, "dia", contasSelecionadas) : bundle),
    [rows, contasSelecionadas, bundle],
  );


  const value = useMemo<Ctx>(() => {
    async function importar(file: File) {
      setErro(null);
      try {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { cellDates: true });
        const lidas = lerLancamentos(wb);
        const next = buildFluxo(lidas);
        if (!next.meses.length) {
          setErro("Nenhum lançamento válido encontrado nesta planilha.");
          return;
        }
        setContasSelecionadas([]);
        setRows(lidas);
        setFileName(file.name);
        try {
          window.localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ rows: lidas, fileName: file.name }),
          );
        } catch {
          /* planilha grande demais para o cache local */
        }
        void registrarLog(
          "importacao",
          `Base atualizada com "${file.name}" (${lidas.length} lançamentos)`,
        );
      } catch {
        setErro("Não foi possível ler o arquivo. Envie um .xlsx válido.");
      }
    }

    function restaurar(novas: Raw[], nome: string | null) {
      setErro(null);
      setContasSelecionadas([]);
      setRows(novas);
      setFileName(nome);
      try {
        window.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ rows: novas, fileName: nome ?? "backup" }),
        );
      } catch {
        /* planilha grande demais para o cache local */
      }
    }

    function exportar(data: FluxoData, nome: string) {
      const view = trimMeses(data);
      const { totalEntradas, totalSaidas, operacional, inicial, acumulado } =
        computeTotais(view);
      const header = ["Categoria", ...view.meses.map(mesLabel)];
      const linhas: (string | number)[][] = [
        header,
        ["Saldo Inicial Caixa", ...inicial],
        ["Entradas", ...totalEntradas],
        ...view.entradas.map((r) => [r.categoria, ...r.valores]),
        ["Saídas", ...totalSaidas],
        ...view.saidas.map((r) => [r.categoria, ...r.valores]),
        ["Saldo Operacional", ...operacional],
        ["Saldo Acumulado", ...acumulado],
      ];
      const ws = XLSX.utils.aoa_to_sheet(linhas);
      ws["!cols"] = header.map((_, i) => ({ wch: i === 0 ? 42 : 14 }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Fluxo de Caixa");
      const hoje = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `backup-${nome}-${hoje}.xlsx`);
      void registrarLog("exportacao", `Backup exportado (${nome})`);
    }

    return {
      bundle,
      bundleDia,
      temDetalheDiario: rows.length > 0,
      rows,
      contas,
      contasSelecionadas,
      setContasSelecionadas,
      fileName,
      erro,
      importar,
      restaurar,
      exportar,
      abrirSeletor: () => inputRef.current?.click(),
      inputProps: {
        ref: inputRef,
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
          const f = e.target.files?.[0];
          if (f) void importar(f);
          e.target.value = "";
        },
      },
    };
  }, [bundle, bundleDia, rows, contas, contasSelecionadas, fileName, erro]);


  return (
    <FluxoContext.Provider value={value}>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={value.inputProps.onChange}
      />
      {children}
    </FluxoContext.Provider>
  );
}

export function useFluxo() {
  const ctx = useContext(FluxoContext);
  if (!ctx) throw new Error("useFluxo must be used inside FluxoProvider");
  return ctx;
}
