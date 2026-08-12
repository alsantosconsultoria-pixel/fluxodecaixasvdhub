-- Admin write paths for profiles
CREATE POLICY "profiles_update_admin" ON public.profiles
FOR UPDATE TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "profiles_delete_admin" ON public.profiles
FOR DELETE TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role));

-- Admin-only role management
CREATE POLICY "user_roles_insert_admin" ON public.user_roles
FOR INSERT TO authenticated
WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "user_roles_update_admin" ON public.user_roles
FOR UPDATE TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "user_roles_delete_admin" ON public.user_roles
FOR DELETE TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role));

GRANT INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT UPDATE, DELETE ON public.profiles TO authenticated;