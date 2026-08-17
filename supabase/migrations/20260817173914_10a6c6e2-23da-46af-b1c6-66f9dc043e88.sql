CREATE TABLE public.fluxo_dataset (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parte integer NOT NULL,
  linhas jsonb NOT NULL DEFAULT '[]'::jsonb,
  arquivo text NOT NULL DEFAULT '',
  criado_por uuid,
  atualizado_em timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (parte)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fluxo_dataset TO authenticated;
GRANT ALL ON public.fluxo_dataset TO service_role;

ALTER TABLE public.fluxo_dataset ENABLE ROW LEVEL SECURITY;

CREATE POLICY fluxo_dataset_select_authenticated ON public.fluxo_dataset
  FOR SELECT TO authenticated USING (true);

CREATE POLICY fluxo_dataset_admin_write ON public.fluxo_dataset
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));