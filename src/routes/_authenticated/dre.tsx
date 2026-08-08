import { createFileRoute } from "@tanstack/react-router";

import { DreView } from "@/components/DreView";

export const Route = createFileRoute("/_authenticated/dre")({
  head: () => ({
    meta: [
      { title: "DRE Gerencial | Fluxo de Caixa | Painel Financeiro" },
      {
        name: "description",
        content:
          "DRE gerencial por período: receita líquida, custos, despesas com pessoal, EBITDA e resultado final.",
      },
      { property: "og:title", content: "DRE Gerencial | Fluxo de Caixa | Painel Financeiro" },
      {
        property: "og:description",
        content:
          "DRE gerencial por período: receita líquida, custos, despesas com pessoal, EBITDA e resultado final.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DreView,
});
