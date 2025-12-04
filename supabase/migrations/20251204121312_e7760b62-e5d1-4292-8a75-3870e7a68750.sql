-- Add new columns for enriched case data from Stortinget API
ALTER TABLE public.stortinget_saker 
ADD COLUMN IF NOT EXISTS komite_navn text,
ADD COLUMN IF NOT EXISTS forslagsstiller jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS prosess_steg integer DEFAULT 1;

-- Add comment for documentation
COMMENT ON COLUMN public.stortinget_saker.komite_navn IS 'Name of the committee handling the case';
COMMENT ON COLUMN public.stortinget_saker.forslagsstiller IS 'JSON array of proposers with name and party';
COMMENT ON COLUMN public.stortinget_saker.prosess_steg IS '1=Forslag, 2=Komitebehandling, 3=Votering/Vedtak';