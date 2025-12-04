-- Legg til spoersmaal-kolonne for brukervenlige spørsmål
ALTER TABLE stortinget_saker ADD COLUMN IF NOT EXISTS spoersmaal TEXT;

-- Kommenter kolonnen for dokumentasjon
COMMENT ON COLUMN stortinget_saker.spoersmaal IS 'AI-generert ja/nei-spørsmål som gjør saken lettere å forstå for vanlige folk';