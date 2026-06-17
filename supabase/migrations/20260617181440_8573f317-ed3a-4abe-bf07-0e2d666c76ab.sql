DROP POLICY IF EXISTS "Service role full access" ON public.knowledge_chunks;

CREATE POLICY "Service role full access"
  ON public.knowledge_chunks
  AS PERMISSIVE
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

REVOKE ALL ON public.knowledge_chunks FROM anon, authenticated;