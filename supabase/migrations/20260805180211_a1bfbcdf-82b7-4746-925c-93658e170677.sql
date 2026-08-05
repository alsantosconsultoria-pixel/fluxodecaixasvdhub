CREATE TABLE public.bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  agencia text NOT NULL DEFAULT '',
  conta text NOT NULL DEFAULT '',
  saldo numeric NOT NULL DEFAULT 0,
  observacao text NOT NULL DEFAULT '',
  data_saldo date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  criado_por uuid,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_accounts TO authenticated;
GRANT ALL ON public.bank_accounts TO service_role;

ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY bank_accounts_select_authenticated ON public.bank_accounts
  FOR SELECT TO authenticated USING (true);
CREATE POLICY bank_accounts_admin_write ON public.bank_accounts
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_bank_accounts_updated_at
  BEFORE UPDATE ON public.bank_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();