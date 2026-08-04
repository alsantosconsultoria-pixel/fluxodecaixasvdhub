import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { FluxoView } from "@/components/FluxoView";
import { Button } from "@/components/ui/button";
import { useFluxo } from "@/lib/fluxo-store";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Fluxo de Caixa Diário | Painel Financeiro" },
      {
        name: "description",
        content:
          "Fluxo de caixa por dia e por categoria financeira, usando a data da baixa para realizados e o vencimento para títulos em aberto.",
      },
      { property: "og:title", content: "Fluxo de Caixa Diário | Painel Financeiro" },
      {
        property: "og:description",
        content:
          "Entradas e saídas por categoria financeira, saldo operacional e saldo acumulado com filtro de período por dia.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FluxoDeCaixa,
});

function FluxoDeCaixa() {
  const { bundle, bundleDia, temDetalheDiario } = useFluxo();
  const [modo, setModo] = useState<"realizado" | "total">("realizado");
  const [gran, setGran] = useState<"dia" | "mes">(temDetalheDiario ? "dia" : "mes");

  const atual = gran === "dia" && temDetalheDiario ? bundleDia : bundle;

  return (
    <div className="space-y-4">
      <div className="mx-auto flex max-w-[1600px] gap-2">
        <Button
          size="sm"
          variant={modo === "realizado" ? "default" : "outline"}
          onClick={() => setModo("realizado")}
        >
          Realizado (data da baixa)
        </Button>
        <Button
          size="sm"
          variant={modo === "total" ? "default" : "outline"}
          onClick={() => setModo("total")}
        >
          Realizado + projeção
        </Button>
      </div>

      <FluxoView
        eyebrow="Painel financeiro"
        titulo="Fluxo de Caixa"
        descricao={
          modo === "realizado"
            ? `Somente títulos baixados (Conciliado = Sim), alocados pel${gran === "dia" ? "o dia" : "o mês"} da data da baixa.`
            : `Baixados pela data da baixa e títulos em aberto pela data de vencimento, agrupados por ${gran === "dia" ? "dia" : "mês"}.`
        }
        realizado={atual.realizado}
        previsto={modo === "total" ? atual.previsto : undefined}
        exportName={modo === "realizado" ? "fluxo-realizado" : "fluxo-completo"}
        granularidade={gran}
        onGranularidade={setGran}
        granularidadeDisponivel={temDetalheDiario}
      />
    </div>
  );
}
