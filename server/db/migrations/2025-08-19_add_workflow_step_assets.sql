-- Persist multiple IT Assets per step
-- Adds JSONB columns for arrays and keeps legacy single-column support

BEGIN;

ALTER TABLE workflow_steps
  ADD COLUMN IF NOT EXISTS primary_component_ids JSONB,
  ADD COLUMN IF NOT EXISTS alternative_component_ids JSONB;

-- Initialize nulls to empty arrays for consistency
UPDATE workflow_steps
SET primary_component_ids = '[]'::jsonb
WHERE primary_component_ids IS NULL;

UPDATE workflow_steps
SET alternative_component_ids = '[]'::jsonb
WHERE alternative_component_ids IS NULL;

-- Optional: ensure defaults for future inserts
ALTER TABLE workflow_steps
  ALTER COLUMN primary_component_ids SET DEFAULT '[]'::jsonb,
  ALTER COLUMN alternative_component_ids SET DEFAULT '[]'::jsonb;

-- Optional: GIN indexes if you plan to query by containment
-- CREATE INDEX IF NOT EXISTS idx_workflow_steps_primary_component_ids ON workflow_steps USING GIN (primary_component_ids);
-- CREATE INDEX IF NOT EXISTS idx_workflow_steps_alternative_component_ids ON workflow_steps USING GIN (alternative_component_ids);

COMMIT;
