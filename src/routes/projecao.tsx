import { createFileRoute } from "@tanstack/react-router";

import { FluxoView } from "@/components/FluxoView";
import { useFluxo } from "@/lib/fluxo-store";

export const Route = createFileRoute("/projecao")({
  head: () => ({
    meta: [
      { title: "Projeções Futuras | Painel Financeiro" },
      {
        name: "description",
        content:
          "Pagamentos futuros e receitas futuras por categoria financeira, projetados pela data de vencimento dos títulos em aberto.",
      },
      { property: "og:title", content: "Projeções Futuras | Painel Financeiro" },
      {
        property: "og:description",
        content:
          "Contas a pagar e a receber ainda não baixadas, distribuídas pelo mês de vencimento.",
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
      data={bundle.previsto}
      exportName="projecao-futura"
      labelEntradas="Receitas futuras"
      labelSaidas="Pagamentos futuros"
    />
  );
}
