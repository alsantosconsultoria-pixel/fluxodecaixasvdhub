DROP POLICY IF EXISTS "bank_accounts_select_authenticated" ON public.bank_accounts;
CREATE POLICY "bank_accounts_select_admin" ON public.bank_accounts
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "company_settings_select_all" ON public.company_settings;
CREATE POLICY "company_settings_select_authenticated" ON public.company_settings
  FOR SELECT TO authenticated
  USING (true);

REVOKE SELECT ON public.company_settings FROM anon;