-- Add tracking fields for sync status and close date
ALTER TABLE public.stortinget_saker 
ADD COLUMN IF NOT EXISTS voteringer_synced_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS stengt_dato DATE,
ADD COLUMN IF NOT EXISTS vedtak_resultat TEXT;

-- Create index for faster queries on sync status
CREATE INDEX IF NOT EXISTS idx_saker_sync_status 
ON public.stortinget_saker (status, voteringer_synced_at) 
WHERE voteringer_synced_at IS NULL;