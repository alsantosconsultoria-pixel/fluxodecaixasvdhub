CREATE TABLE public.cmv_dataset (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parte integer NOT NULL,
  linhas jsonb NOT NULL DEFAULT '[]'::jsonb,
  arquivo text NOT NULL DEFAULT '',
  criado_por uuid,
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cmv_dataset TO authenticated;
GRANT ALL ON public.cmv_dataset TO service_role;

ALTER TABLE public.cmv_dataset ENABLE ROW LEVEL SECURITY;

CREATE POLICY cmv_dataset_select_authenticated ON public.cmv_dataset
  FOR SELECT TO authenticated USING (true);

CREATE POLICY cmv_dataset_admin_write ON public.cmv_dataset
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));