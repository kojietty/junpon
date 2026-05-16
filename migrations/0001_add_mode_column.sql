-- Add `mode` column to scores so 2-key and 4-key rankings are separated.
-- Existing rows pre-date the mode column → backfill as 4 (the only mode that existed).
ALTER TABLE scores ADD COLUMN mode INTEGER NOT NULL DEFAULT 4;

-- Composite index for the GET hot path: WHERE mode=? ORDER BY score DESC LIMIT 50.
CREATE INDEX IF NOT EXISTS idx_scores_mode_score ON scores(mode, score DESC);
