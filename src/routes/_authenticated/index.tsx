import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { FluxoView } from "@/components/FluxoView";
import { Button } from "@/components/ui/button";
import { useFluxo } from "@/lib/fluxo-store";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Fluxo de Caixa Diário | Fluxo de Caixa | Painel Financeiro" },
      {
        name: "description",
        content:
          "Fluxo de caixa diário por categoria, com saldo bancário, projeções futuras e controle de acesso por usuário.",
      },
      { property: "og:title", content: "Fluxo de Caixa Diário | Fluxo de Caixa | Painel Financeiro" },
      {
        property: "og:description",
        content:
          "Fluxo de caixa diário por categoria, com saldo bancário, projeções futuras e controle de acesso por usuário.",
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
            ? `Somente lançamentos pagos/recebidos (com conta bancária), alocados pel${gran === "dia" ? "o dia" : "o mês"} da data de pagamento/recebimento.`
            : `Pagos/recebidos pela data de pagamento e títulos em aberto pela data de vencimento, agrupados por ${gran === "dia" ? "dia" : "mês"}.`
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
