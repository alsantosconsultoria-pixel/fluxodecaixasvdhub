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

import { supabase } from "@/integrations/supabase/client";
import { lerVeiculos, mesclarVeiculos, type CmvRaw } from "@/lib/cmv";
import { registrarLog } from "@/lib/logs";

const STORAGE_KEY = "cmv:planilha";
const TAMANHO_PARTE = 300;

async function carregarCmv(): Promise<{ rows: CmvRaw[]; arquivo: string | null; atualizadoEm: string | null } | null> {
  const { data, error } = await supabase
    .from("cmv_dataset")
    .select("parte, linhas, arquivo, atualizado_em")
    .order("parte");
  if (error || !data?.length) return null;
  const rows = data.flatMap((p) => (Array.isArray(p.linhas) ? (p.linhas as CmvRaw[]) : []));
  if (!rows.length) return null;
  return { rows, arquivo: data[0]?.arquivo || null, atualizadoEm: data[0]?.atualizado_em ?? null };
}

async function gravarCmv(rows: CmvRaw[], arquivo: string | null) {
  const { error: delErro } = await supabase.from("cmv_dataset").delete().not("id", "is", null);
  if (delErro) throw new Error(delErro.message);
  if (!rows.length) return;
  const { data: auth } = await supabase.auth.getUser();
  const partes = [];
  for (let i = 0; i < rows.length; i += TAMANHO_PARTE) {
    partes.push({
      parte: partes.length,
      linhas: rows.slice(i, i + TAMANHO_PARTE),
      arquivo: arquivo ?? "",
      criado_por: auth.user?.id ?? null,
    });
  }
  for (let i = 0; i < partes.length; i += 10) {
    const { error } = await supabase.from("cmv_dataset").insert(partes.slice(i, i + 10) as never);
    if (error) throw new Error(error.message);
  }
}

type Ctx = {
  rows: CmvRaw[];
  arquivo: string | null;
  gravadoEm: string | null;
  erro: string | null;
  ocupado: boolean;
  importar: (file: File) => Promise<void>;
  gravar: () => Promise<void>;
  zerar: () => Promise<void>;
  abrirSeletor: () => void;
  inputProps: {
    ref: React.RefObject<HTMLInputElement | null>;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  };
};

const CmvContext = createContext<Ctx | null>(null);

function lerCache(): { rows: CmvRaw[]; arquivo: string | null } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function CmvProvider({ children }: { children: ReactNode }) {
  const cache = typeof window === "undefined" ? null : lerCache();
  const [rows, setRows] = useState<CmvRaw[]>(() => cache?.rows ?? []);
  const [arquivo, setArquivo] = useState<string | null>(cache?.arquivo ?? null);
  const [gravadoEm, setGravadoEm] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const rowsRef = useRef<CmvRaw[]>(rows);
  rowsRef.current = rows;

  useEffect(() => {
    let ativo = true;
    void carregarCmv()
      .then((salvo) => {
        if (!ativo || !salvo) return;
        setGravadoEm(salvo.atualizadoEm);
        setRows((atuais) => (atuais.length ? mesclarVeiculos(salvo.rows, atuais) : salvo.rows));
        setArquivo((atual) => atual ?? salvo.arquivo);
      })
      .catch(() => undefined);
    return () => {
      ativo = false;
    };
  }, []);

  const value = useMemo<Ctx>(() => {
    function persistir(novas: CmvRaw[], nome: string | null) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ rows: novas, arquivo: nome }));
      } catch {
        /* cache indisponível */
      }
    }

    async function importar(file: File) {
      setErro(null);
      try {
        const wb = XLSX.read(await file.arrayBuffer(), { cellDates: true });
        const lidas = lerVeiculos(wb);
        if (!lidas.length) {
          setErro("Nenhuma venda encontrada. Envie a planilha de veículos vendidos (aba FATURAMENTO).");
          return;
        }
        const combinadas = mesclarVeiculos(rowsRef.current, lidas);
        const novos = combinadas.length - rowsRef.current.length;
        setRows(combinadas);
        setArquivo(file.name);
        persistir(combinadas, file.name);
        void registrarLog(
          "importacao",
          `CMV: "${file.name}" (${novos} novas de ${lidas.length} vendas lidas)`,
        );
      } catch {
        setErro("Não foi possível ler o arquivo. Envie um .xlsx válido.");
      }
    }

    async function gravar() {
      setErro(null);
      setOcupado(true);
      try {
        await gravarCmv(rowsRef.current, arquivo);
        setGravadoEm(new Date().toISOString());
        void registrarLog("backup", `Base de CMV gravada (${rowsRef.current.length} vendas)`);
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Falha ao gravar os dados.");
      } finally {
        setOcupado(false);
      }
    }

    async function zerar() {
      setErro(null);
      setOcupado(true);
      try {
        const { error } = await supabase.from("cmv_dataset").delete().not("id", "is", null);
        if (error) throw new Error(error.message);
        setRows([]);
        setArquivo(null);
        setGravadoEm(null);
        try {
          window.localStorage.removeItem(STORAGE_KEY);
        } catch {
          /* cache indisponível */
        }
        void registrarLog("backup", "Base de CMV zerada");
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Falha ao zerar os dados.");
      } finally {
        setOcupado(false);
      }
    }

    return {
      rows,
      arquivo,
      gravadoEm,
      erro,
      ocupado,
      importar,
      gravar,
      zerar,
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
  }, [rows, arquivo, gravadoEm, erro, ocupado]);

  return (
    <CmvContext.Provider value={value}>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={value.inputProps.onChange}
      />
      {children}
    </CmvContext.Provider>
  );
}

export function useCmv() {
  const ctx = useContext(CmvContext);
  if (!ctx) throw new Error("useCmv must be used inside CmvProvider");
  return ctx;
}
