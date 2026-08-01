CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  nome text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "profiles_select_authenticated" ON public.profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "user_roles_select_authenticated" ON public.user_roles
  FOR SELECT TO authenticated USING (true);

CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  email text NOT NULL DEFAULT '',
  tipo text NOT NULL,
  descricao text NOT NULL DEFAULT '',
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX activity_logs_criado_em_idx ON public.activity_logs (criado_em DESC);
GRANT SELECT, INSERT ON public.activity_logs TO authenticated;
GRANT ALL ON public.activity_logs TO service_role;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activity_logs_insert_own" ON public.activity_logs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "activity_logs_select_admin" ON public.activity_logs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "activity_logs_select_own" ON public.activity_logs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.kpi_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  coluna text NOT NULL,
  operacao text NOT NULL DEFAULT 'soma',
  filtro_coluna text,
  filtro_valor text,
  comparar_periodo boolean NOT NULL DEFAULT false,
  formato text NOT NULL DEFAULT 'moeda',
  ordem integer NOT NULL DEFAULT 0,
  criado_por uuid,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kpi_configs TO authenticated;
GRANT ALL ON public.kpi_configs TO service_role;
ALTER TABLE public.kpi_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kpi_configs_select_authenticated" ON public.kpi_configs
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "kpi_configs_admin_write" ON public.kpi_configs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));