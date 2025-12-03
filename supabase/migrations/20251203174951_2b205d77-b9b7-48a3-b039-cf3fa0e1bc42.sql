-- Add unique constraint for representant_voteringer to enable ON CONFLICT
ALTER TABLE representant_voteringer 
ADD CONSTRAINT representant_voteringer_unique 
UNIQUE (representant_id, votering_uuid);

-- Add unique constraint for parti_voteringer to enable ON CONFLICT
ALTER TABLE parti_voteringer 
ADD CONSTRAINT parti_voteringer_unique 
UNIQUE (parti_forkortelse, sak_id);