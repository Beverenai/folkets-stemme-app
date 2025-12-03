-- Legg til nye felter for rikere innhold i saker
ALTER TABLE public.stortinget_saker 
ADD COLUMN IF NOT EXISTS oppsummering TEXT,
ADD COLUMN IF NOT EXISTS bilde_url TEXT,
ADD COLUMN IF NOT EXISTS argumenter_for JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS argumenter_mot JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS kategori TEXT;