-- Add columns for AI-generated arguments on voteringer
ALTER TABLE voteringer 
ADD COLUMN IF NOT EXISTS argumenter_for jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS argumenter_mot jsonb DEFAULT '[]'::jsonb;