-- Add indexes for optimized queries
CREATE INDEX IF NOT EXISTS idx_saker_viktig_oppsummering 
ON stortinget_saker(er_viktig, oppsummering) 
WHERE er_viktig = true;

CREATE INDEX IF NOT EXISTS idx_saker_kategori_sesjon 
ON stortinget_saker(kategori, behandlet_sesjon) 
WHERE er_viktig = true;

CREATE INDEX IF NOT EXISTS idx_voteringer_sak_resultat 
ON voteringer(sak_id, resultat_for, resultat_mot) 
WHERE resultat_for > 0 OR resultat_mot > 0;

-- Create view for complete saker (ready to display)
CREATE OR REPLACE VIEW v_komplette_saker AS
SELECT 
  s.*,
  (SELECT COUNT(*) FROM folke_stemmer fs WHERE fs.sak_id = s.id) as folke_stemmer_count
FROM stortinget_saker s
WHERE s.er_viktig = true
  AND s.oppsummering IS NOT NULL
  AND s.argumenter_for IS NOT NULL
  AND s.argumenter_for::text != '[]'
ORDER BY s.updated_at DESC;

-- Create view for complete voteringer (ready to display)
CREATE OR REPLACE VIEW v_komplette_voteringer AS
SELECT 
  v.*,
  s.tittel as sak_tittel,
  s.oppsummering as sak_oppsummering,
  s.kategori as sak_kategori,
  s.er_viktig as sak_er_viktig,
  (SELECT COUNT(*) FROM folke_stemmer fs WHERE fs.votering_id = v.id) as folke_stemmer_count
FROM voteringer v
LEFT JOIN stortinget_saker s ON v.sak_id = s.id
WHERE v.oppsummering IS NOT NULL
  AND v.votering_dato IS NOT NULL
  AND (v.resultat_for > 0 OR v.resultat_mot > 0)
ORDER BY v.votering_dato DESC;