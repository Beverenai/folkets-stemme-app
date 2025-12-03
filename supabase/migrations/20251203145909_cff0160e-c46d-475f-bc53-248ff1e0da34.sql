-- Create voteringer table for individual votes
CREATE TABLE public.voteringer (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stortinget_votering_id TEXT NOT NULL UNIQUE,
  sak_id UUID REFERENCES public.stortinget_saker(id) ON DELETE CASCADE,
  forslag_tekst TEXT,
  oppsummering TEXT,
  votering_dato TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pågående',
  resultat_for INTEGER DEFAULT 0,
  resultat_mot INTEGER DEFAULT 0,
  resultat_avholdende INTEGER DEFAULT 0,
  vedtatt BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.voteringer ENABLE ROW LEVEL SECURITY;

-- Anyone can view voteringer
CREATE POLICY "Anyone can view voteringer"
ON public.voteringer
FOR SELECT
USING (true);

-- Add votering_id to folke_stemmer
ALTER TABLE public.folke_stemmer 
ADD COLUMN votering_id UUID REFERENCES public.voteringer(id) ON DELETE CASCADE;

-- Make sak_id nullable since we'll use votering_id going forward
ALTER TABLE public.folke_stemmer 
ALTER COLUMN sak_id DROP NOT NULL;

-- Create index for performance
CREATE INDEX idx_voteringer_status ON public.voteringer(status);
CREATE INDEX idx_voteringer_sak_id ON public.voteringer(sak_id);
CREATE INDEX idx_folke_stemmer_votering_id ON public.folke_stemmer(votering_id);

-- Add trigger for updated_at
CREATE TRIGGER update_voteringer_updated_at
BEFORE UPDATE ON public.voteringer
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update representant_voteringer to reference new voteringer table
ALTER TABLE public.representant_voteringer
ADD COLUMN votering_uuid UUID REFERENCES public.voteringer(id) ON DELETE CASCADE;