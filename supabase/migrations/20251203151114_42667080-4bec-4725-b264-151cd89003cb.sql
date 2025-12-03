-- Create sync_log table for monitoring
CREATE TABLE public.sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  saker_synced INTEGER DEFAULT 0,
  voteringer_synced INTEGER DEFAULT 0,
  ai_generated INTEGER DEFAULT 0,
  errors JSONB DEFAULT '[]'::jsonb,
  duration_ms INTEGER,
  source TEXT DEFAULT 'cron'
);

-- Enable RLS
ALTER TABLE public.sync_log ENABLE ROW LEVEL SECURITY;

-- Anyone can view sync logs (for status display)
CREATE POLICY "Anyone can view sync_log" ON public.sync_log FOR SELECT USING (true);

-- Enable pg_cron and pg_net extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;