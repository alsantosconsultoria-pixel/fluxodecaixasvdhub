import { createFileRoute } from "@tanstack/react-router";

import { DreView } from "@/components/DreView";

export const Route = createFileRoute("/_authenticated/dre")({
  head: () => ({
    meta: [
      { title: "DRE Gerencial | Painel Financeiro" },
      {
        name: "description",
        content:
          "Demonstrativo de resultado gerencial por período: receita líquida, custos, despesas com pessoal, EBITDA e resultado final.",
      },
      { property: "og:title", content: "DRE Gerencial | Painel Financeiro" },
      {
        property: "og:description",
        content:
          "Resultado gerencial construído a partir das categorias financeiras do fluxo de caixa, com filtro de período.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DreView,
});
