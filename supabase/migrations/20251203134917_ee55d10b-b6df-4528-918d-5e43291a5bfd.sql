-- Create representanter table
CREATE TABLE public.representanter (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stortinget_id TEXT NOT NULL UNIQUE,
  fornavn TEXT NOT NULL,
  etternavn TEXT NOT NULL,
  parti TEXT,
  parti_forkortelse TEXT,
  fylke TEXT,
  kjonn TEXT,
  fodt DATE,
  bilde_url TEXT,
  epost TEXT,
  komite TEXT,
  er_aktiv BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create representant_voteringer table
CREATE TABLE public.representant_voteringer (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  representant_id UUID NOT NULL REFERENCES public.representanter(id) ON DELETE CASCADE,
  sak_id UUID REFERENCES public.stortinget_saker(id) ON DELETE CASCADE,
  votering_id TEXT,
  stemme TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.representanter ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.representant_voteringer ENABLE ROW LEVEL SECURITY;

-- RLS policies - public read access
CREATE POLICY "Anyone can view representanter"
ON public.representanter
FOR SELECT
USING (true);

CREATE POLICY "Anyone can view representant voteringer"
ON public.representant_voteringer
FOR SELECT
USING (true);

-- Create indexes for performance
CREATE INDEX idx_representanter_parti ON public.representanter(parti_forkortelse);
CREATE INDEX idx_representanter_fylke ON public.representanter(fylke);
CREATE INDEX idx_representanter_aktiv ON public.representanter(er_aktiv);
CREATE INDEX idx_representant_voteringer_representant ON public.representant_voteringer(representant_id);
CREATE INDEX idx_representant_voteringer_sak ON public.representant_voteringer(sak_id);

-- Trigger for updated_at
CREATE TRIGGER update_representanter_updated_at
BEFORE UPDATE ON public.representanter
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();