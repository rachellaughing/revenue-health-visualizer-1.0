CREATE OR REPLACE FUNCTION public.match_knowledge_chunks(query_embedding extensions.vector, match_threshold double precision DEFAULT 0.7, match_count integer DEFAULT 10)
 RETURNS TABLE(id uuid, content text, source text, source_id text, metadata jsonb, similarity double precision)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'extensions'
AS $function$
  select
    kc.id,
    kc.content,
    kc.source,
    kc.source_id,
    kc.metadata,
    1 - (kc.embedding <=> query_embedding) as similarity
  from public.knowledge_chunks kc
  where 1 - (kc.embedding <=> query_embedding) > match_threshold
  order by kc.embedding <=> query_embedding
  limit match_count;
$function$;