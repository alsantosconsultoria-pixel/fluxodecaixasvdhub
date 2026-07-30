import * as XLSX from "xlsx";
import { readFileSync, writeFileSync } from "node:fs";
import { buildFluxo } from "../src/lib/fluxo";

const buf = readFileSync("/mnt/user-uploads/base_teste_janeiro.xlsx");
const wb = XLSX.read(buf, { cellDates: true });
const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
  wb.Sheets[wb.SheetNames[0]],
);
const bundle = buildFluxo(rows);
writeFileSync("src/data/fluxo-caixa.json", JSON.stringify(bundle));
console.log(bundle.meses, bundle.realizado.entradas.length, bundle.previsto.saidas.length);
