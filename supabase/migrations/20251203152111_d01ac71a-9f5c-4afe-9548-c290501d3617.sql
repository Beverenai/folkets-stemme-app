-- Add indexes for efficient querying of historical data
CREATE INDEX IF NOT EXISTS idx_stortinget_saker_behandlet_sesjon ON public.stortinget_saker(behandlet_sesjon);
CREATE INDEX IF NOT EXISTS idx_stortinget_saker_kategori ON public.stortinget_saker(kategori);
CREATE INDEX IF NOT EXISTS idx_stortinget_saker_er_viktig ON public.stortinget_saker(er_viktig);
CREATE INDEX IF NOT EXISTS idx_stortinget_saker_status ON public.stortinget_saker(status);
CREATE INDEX IF NOT EXISTS idx_representant_voteringer_sak_id ON public.representant_voteringer(sak_id);
CREATE INDEX IF NOT EXISTS idx_voteringer_sak_id ON public.voteringer(sak_id);