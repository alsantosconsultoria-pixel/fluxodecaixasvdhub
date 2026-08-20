ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS cnpj text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS razao_social text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS email text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS telefone text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS endereco text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS principal boolean NOT NULL DEFAULT false;

CREATE POLICY "company_settings_admin_delete"
ON public.company_settings FOR DELETE TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role));

UPDATE public.company_settings SET principal = true
WHERE id = (SELECT id FROM public.company_settings ORDER BY criado_em LIMIT 1)
AND NOT EXISTS (SELECT 1 FROM public.company_settings WHERE principal);