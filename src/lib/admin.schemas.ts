import { z } from "zod";

export const criarUsuarioSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome").max(120),
  email: z.string().trim().email("E-mail inválido").max(255),
  role: z.enum(["admin", "user"]),
  modo: z.enum(["convite", "senha"]),
  senha: z.string().min(8, "Mínimo de 8 caracteres").max(72).optional(),
});
export type CriarUsuarioInput = z.infer<typeof criarUsuarioSchema>;

export const primeiroAdminSchema = z.object({
  nome: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  senha: z.string().min(8).max(72),
});

export const definirPapelSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["admin", "user"]),
});

export const excluirUsuarioSchema = z.object({ userId: z.string().uuid() });

export const kpiSchema = z.object({
  id: z.string().uuid().optional(),
  titulo: z.string().trim().min(1).max(80),
  coluna: z.string().trim().min(1).max(120),
  operacao: z.enum(["soma", "media", "contagem"]),
  filtro_coluna: z.string().trim().max(120).nullable().optional(),
  filtro_valor: z.string().trim().max(120).nullable().optional(),
  comparar_periodo: z.boolean(),
  formato: z.enum(["moeda", "numero", "inteiro"]),
  ordem: z.number().int().min(0).max(999),
});
export type KpiInput = z.infer<typeof kpiSchema>;
