import { createFileRoute } from "@tanstack/react-router";

import { FluxoView } from "@/components/FluxoView";
import { useFluxo } from "@/lib/fluxo-store";

export const Route = createFileRoute("/_authenticated/projecao")({
  head: () => ({
    meta: [
      { title: "Projeções Futuras | Fluxo de Caixa | Painel Financeiro" },
      {
        name: "description",
        content:
          "Pagamentos e receitas futuras por categoria financeira, projetados pela data de vencimento.",
      },
      { property: "og:title", content: "Projeções Futuras | Fluxo de Caixa | Painel Financeiro" },
      {
        property: "og:description",
        content:
          "Pagamentos e receitas futuras por categoria financeira, projetados pela data de vencimento.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Projecao,
});

function Projecao() {
  const { bundle } = useFluxo();

  return (
    <FluxoView
      eyebrow="Projeção"
      titulo="Pagamentos e receitas futuras"
      descricao="Títulos sem baixa, projetados pela data de vencimento (data de pagamento ignorada)."
      previsto={bundle.previsto}
      exportName="projecao-futura"
      labelEntradas="Receitas futuras"
      labelSaidas="Pagamentos futuros"
    />
  );
}
