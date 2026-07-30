import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import * as XLSX from "xlsx";

import baseData from "@/data/fluxo-caixa.json";
import {
  buildFluxo,
  computeTotais,
  mesLabel,
  trimMeses,
  type FluxoBundle,
  type FluxoData,
} from "@/lib/fluxo";

type Ctx = {
  bundle: FluxoBundle;
  fileName: string | null;
  erro: string | null;
  importar: (file: File) => Promise<void>;
  exportar: (data: FluxoData, nome: string) => void;
  abrirSeletor: () => void;
  inputProps: {
    ref: React.RefObject<HTMLInputElement | null>;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  };
};

const FluxoContext = createContext<Ctx | null>(null);

export function FluxoProvider({ children }: { children: ReactNode }) {
  const [bundle, setBundle] = useState<FluxoBundle>(baseData as FluxoBundle);
  const [fileName, setFileName] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const value = useMemo<Ctx>(() => {
    async function importar(file: File) {
      setErro(null);
      try {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { cellDates: true });
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
          wb.Sheets[wb.SheetNames[0]],
        );
        const next = buildFluxo(rows);
        if (!next.meses.length) {
          setErro("Nenhum lançamento válido encontrado nesta planilha.");
          return;
        }
        setBundle(next);
        setFileName(file.name);
      } catch {
        setErro("Não foi possível ler o arquivo. Envie um .xlsx válido.");
      }
    }

    function exportar(data: FluxoData, nome: string) {
      const view = trimMeses(data);
      const { totalEntradas, totalSaidas, operacional, inicial, acumulado } =
        computeTotais(view);
      const header = ["Categoria", ...view.meses.map(mesLabel)];
      const rows: (string | number)[][] = [
        header,
        ["Saldo Inicial Caixa", ...inicial],
        ["Entradas", ...totalEntradas],
        ...view.entradas.map((r) => [r.categoria, ...r.valores]),
        ["Saídas", ...totalSaidas],
        ...view.saidas.map((r) => [r.categoria, ...r.valores]),
        ["Saldo Operacional", ...operacional],
        ["Saldo Acumulado", ...acumulado],
      ];
      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws["!cols"] = header.map((_, i) => ({ wch: i === 0 ? 42 : 14 }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Fluxo de Caixa");
      const hoje = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `backup-${nome}-${hoje}.xlsx`);
    }

    return {
      bundle,
      fileName,
      erro,
      importar,
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
  }, [bundle, fileName, erro]);

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
