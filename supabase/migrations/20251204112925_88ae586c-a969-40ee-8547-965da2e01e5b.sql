-- Fix security definer views by using SECURITY INVOKER
DROP VIEW IF EXISTS v_komplette_saker;
DROP VIEW IF EXISTS v_komplette_voteringer;

-- Recreate view for complete saker with SECURITY INVOKER
CREATE VIEW v_komplette_saker 
WITH (security_invoker = on) AS
SELECT 
  s.*,
  (SELECT COUNT(*) FROM folke_stemmer fs WHERE fs.sak_id = s.id) as folke_stemmer_count
FROM stortinget_saker s
WHERE s.er_viktig = true
  AND s.oppsummering IS NOT NULL
  AND s.argumenter_for IS NOT NULL
  AND s.argumenter_for::text != '[]'
ORDER BY s.updated_at DESC;

-- Recreate view for complete voteringer with SECURITY INVOKER
CREATE VIEW v_komplette_voteringer 
WITH (security_invoker = on) AS
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