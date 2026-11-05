CREATE TABLE IF NOT EXISTS revhealth2._spelling_backup_20261105 (
  schema_name text NOT NULL, table_name text NOT NULL, column_name text NOT NULL,
  row_id text NOT NULL, old_value text, new_value text, backed_up_at timestamptz NOT NULL DEFAULT now());
REVOKE ALL ON revhealth2._spelling_backup_20261105 FROM anon, authenticated;
GRANT ALL ON revhealth2._spelling_backup_20261105 TO service_role;
ALTER TABLE revhealth2._spelling_backup_20261105 ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION revhealth2._us_spell(v text) RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path = revhealth2 AS $$
DECLARE p text[]; pairs text[][] := ARRAY[
 ['organisation','organization'],['organised','organized'],['organise','organize'],
 ['prioritise','prioritize'],['recognisable','recognizable'],['recognised','recognized'],['recognise','recognize'],
 ['categorised','categorized'],['unrealised','unrealized'],['realisation','realization'],['realise','realize'],
 ['personalised','personalized'],['operationalised','operationalized'],['normalisation','normalization'],
 ['judgement','judgment'],['labelled','labeled'],['rigour','rigor'],['behaviour','behavior'],
 ['enquiries','inquiries'],['enquiry','inquiry'],['colours','colors'],['programmes','programs'],['programme','program']];
BEGIN
  IF v IS NULL THEN RETURN v; END IF;
  FOREACH p SLICE 1 IN ARRAY pairs LOOP
    v := regexp_replace(v, '\m'||p[1]||'\M', p[2], 'g');
    v := regexp_replace(v, '\m'||initcap(p[1])||'\M', initcap(p[2]), 'g');
    v := regexp_replace(v, '\m'||upper(p[1])||'\M', upper(p[2]), 'g');
  END LOOP;
  RETURN v;
END $$;

DO $$
DECLARE r record; n int;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('questions','default_question'),('questions','helper_text'),
    ('critical_paths','tagline'),('critical_paths','core_question'),('critical_paths','bottleneck_logic'),
    ('critical_path_members','role_in_path'),('scoring_config','description'),
    ('contradiction_rules','founder_psychology'),('contradiction_rules','email_sequence_trigger'),
    ('contradiction_rules','sales_script_note'),('contradiction_rules','probe_question'),
    ('symptom_map','description'),('diagnostic_frames','applies_to'),('recommended_actions','why')) t(tb,col)
  LOOP
    EXECUTE format('INSERT INTO revhealth2._spelling_backup_20261105(schema_name,table_name,column_name,row_id,old_value,new_value)
      SELECT %L,%L,%L,id::text,%I::text,revhealth2._us_spell(%I::text) FROM revhealth2.%I WHERE %I::text IS DISTINCT FROM revhealth2._us_spell(%I::text)',
      'revhealth2', r.tb, r.col, r.col, r.col, r.tb, r.col, r.col);
    EXECUTE format('UPDATE revhealth2.%I SET %I = revhealth2._us_spell(%I) WHERE %I IS DISTINCT FROM revhealth2._us_spell(%I)',
      r.tb, r.col, r.col, r.col, r.col);
  END LOOP;
END $$;