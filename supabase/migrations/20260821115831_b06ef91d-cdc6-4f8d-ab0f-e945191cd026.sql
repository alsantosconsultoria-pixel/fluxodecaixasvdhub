DROP POLICY IF EXISTS bank_accounts_avaliador_write ON public.bank_accounts;

CREATE POLICY bank_accounts_avaliador_select ON public.bank_accounts
FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'avaliador'::app_role));

CREATE POLICY bank_accounts_avaliador_insert ON public.bank_accounts
FOR INSERT TO authenticated
WITH CHECK (private.has_role(auth.uid(), 'avaliador'::app_role));

CREATE POLICY bank_accounts_avaliador_update ON public.bank_accounts
FOR UPDATE TO authenticated
USING (private.has_role(auth.uid(), 'avaliador'::app_role))
WITH CHECK (private.has_role(auth.uid(), 'avaliador'::app_role));