# Permissões de acesso por usuário (por aba)

Hoje o acesso é só por papel: quem é administrador vê tudo, os demais veem apenas o bloco financeiro. A ideia é permitir que o administrador marque, usuário por usuário, exatamente quais abas ele pode abrir.

## Como vai funcionar

- Na aba **Usuários**, cada linha ganha um botão "Permissões" que abre um painel com a lista de todas as abas, cada uma com uma caixa de seleção:
  - Financeiro: Fluxo de Caixa, Saldos Bancários, DRE Gerencial, Projeções futuras, Apresentação
  - Administração: Editar KPIs, Usuários, Empresa, Backup, Registros
- Atalhos "Marcar todas" / "Desmarcar todas" e um grupo por seção.
- Ao salvar, o menu lateral daquele usuário passa a mostrar somente as abas liberadas, e a tentativa de abrir uma aba não liberada leva de volta ao Fluxo de Caixa com aviso de acesso restrito.
- Administradores continuam com acesso total (não são limitados pelas marcações), evitando que alguém se tranque para fora do painel.
- Usuários sem nenhuma permissão salva mantêm o padrão atual: abas financeiras liberadas, administração bloqueada.
- Cada alteração de permissão vira um registro na aba **Registros**.

## Detalhes técnicos

1. Migração: nova tabela `public.user_permissions` (`user_id`, `aba` texto, único por par), com GRANTs, RLS — leitura pela própria pessoa e leitura/escrita total para admin (`private.has_role`).
2. `src/lib/permissoes.ts`: catálogo único das abas (chave, título, rota, grupo) reaproveitado pelo menu e pelo painel de permissões.
3. `src/lib/permissoes.functions.ts`: server functions com `requireSupabaseAuth` + `assertAdmin` para listar e salvar permissões de um usuário; salvamento substitui o conjunto inteiro e grava log via `registrarLogServidor`.
4. `src/lib/session.tsx`: passa a carregar as permissões do usuário logado e expõe `abasPermitidas` e `podeAcessar(rota)`.
5. `src/components/AppSidebar.tsx`: filtra ambos os grupos por `podeAcessar`; grupo Administração aparece se houver ao menos uma aba liberada.
6. `src/routes/_authenticated/route.tsx`: após a checagem de sessão, valida a rota contra as permissões e redireciona para `/` quando bloqueada.
7. `src/routes/_authenticated/usuarios.tsx`: diálogo de permissões por usuário (checkboxes agrupadas + salvar).
