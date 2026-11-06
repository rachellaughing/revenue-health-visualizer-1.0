CREATE TABLE revhealth2._seed_backup_20261106 (
  id bigserial PRIMARY KEY,
  table_name text NOT NULL,
  pk jsonb NOT NULL,
  action text NOT NULL,
  old_values jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON revhealth2._seed_backup_20261106 TO service_role;
GRANT USAGE, SELECT ON SEQUENCE revhealth2._seed_backup_20261106_id_seq TO service_role;
ALTER TABLE revhealth2._seed_backup_20261106 ENABLE ROW LEVEL SECURITY;