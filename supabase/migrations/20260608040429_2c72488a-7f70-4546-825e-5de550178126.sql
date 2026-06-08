
-- 1. report_narratives: remove permissive policies applied to public role.
-- service_role bypasses RLS, so no replacement policy is needed for writes.
DROP POLICY IF EXISTS "Service role can insert narratives" ON public.report_narratives;
DROP POLICY IF EXISTS "Service role can update narratives" ON public.report_narratives;

-- 2. user_roles: block any client-side INSERT/UPDATE/DELETE. Only service_role
-- (which bypasses RLS) may modify role assignments.
CREATE POLICY "Block client role inserts"
  ON public.user_roles FOR INSERT TO public
  WITH CHECK (false);

CREATE POLICY "Block client role updates"
  ON public.user_roles FOR UPDATE TO public
  USING (false) WITH CHECK (false);

CREATE POLICY "Block client role deletes"
  ON public.user_roles FOR DELETE TO public
  USING (false);

-- 3. coupons: no client access at all. service_role bypasses RLS for server-side validation.
CREATE POLICY "Block all client access to coupons"
  ON public.coupons FOR ALL TO public
  USING (false) WITH CHECK (false);

-- 4. ghl_sync_log: internal sync log, no client access.
CREATE POLICY "Block all client access to ghl_sync_log"
  ON public.ghl_sync_log FOR ALL TO public
  USING (false) WITH CHECK (false);
