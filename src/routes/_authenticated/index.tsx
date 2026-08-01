import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { FluxoView } from "@/components/FluxoView";
import { Button } from "@/components/ui/button";
import { useFluxo } from "@/lib/fluxo-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fluxo de Caixa Mensal | Painel Financeiro" },
      {
        name: "description",
        content:
          "Fluxo de caixa mensal por categoria financeira, usando a data da baixa para realizados e vencimento para títulos em aberto.",
      },
      { property: "og:title", content: "Fluxo de Caixa Mensal | Painel Financeiro" },
      {
        property: "og:description",
        content:
          "Entradas e saídas por categoria financeira, saldo operacional e saldo acumulado por mês.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FluxoDeCaixa,
});

function FluxoDeCaixa() {
  const { bundle } = useFluxo();
  const [modo, setModo] = useState<"realizado" | "total">("realizado");

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
            ? "Somente títulos baixados, alocados pelo mês da data da baixa."
            : "Baixados pela data da baixa e títulos em aberto pela data de vencimento."
        }
        realizado={bundle.realizado}
        previsto={modo === "total" ? bundle.previsto : undefined}
        exportName={modo === "realizado" ? "fluxo-realizado" : "fluxo-completo"}
      />
    </div>
  );
}
