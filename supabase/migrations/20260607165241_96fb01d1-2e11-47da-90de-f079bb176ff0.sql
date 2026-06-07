
CREATE OR REPLACE FUNCTION public.guard_responses_immutable()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  parent_status text;
  anchor_ts timestamptz;
BEGIN
  SELECT status, COALESCE(submitted_at, completed_at)
    INTO parent_status, anchor_ts
    FROM public.assessments
   WHERE id = COALESCE(NEW.assessment_id, OLD.assessment_id);

  IF parent_status = 'completed' THEN
    -- Allow edits within the 7-day edit window after submission
    IF anchor_ts IS NULL OR (now() - anchor_ts) > interval '7 days' THEN
      RAISE EXCEPTION 'Cannot modify responses for a submitted assessment (edit window closed)';
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$function$;
