-- Add kategori and er_viktig columns to stortinget_saker
ALTER TABLE public.stortinget_saker ADD COLUMN IF NOT EXISTS er_viktig BOOLEAN DEFAULT false;

-- Classify existing saker based on title patterns

-- Lovendringer - VIKTIG
UPDATE public.stortinget_saker 
SET kategori = 'lovendring', er_viktig = true
WHERE (tittel ILIKE '%endringer i%loven%' 
   OR tittel ILIKE '%endringer i%lova%'
   OR tittel ILIKE 'lov om%'
   OR tittel ILIKE '%lovvedtak%')
   AND kategori IS NULL;

-- Budsjett - VIKTIG
UPDATE public.stortinget_saker 
SET kategori = 'budsjett', er_viktig = true
WHERE (tittel ILIKE '%statsbudsjettet%' 
   OR tittel ILIKE '%budsjettet%'
   OR tittel ILIKE '%prop. 1 s%')
   AND kategori IS NULL;

-- Grunnlovsforslag - VIKTIG
UPDATE public.stortinget_saker 
SET kategori = 'grunnlov', er_viktig = true
WHERE (tittel ILIKE '%grunnlovsforslag%'
   OR tittel ILIKE '%grunnlovsframlegg%')
   AND kategori IS NULL;

-- Stortingsmeldinger - VIKTIG
UPDATE public.stortinget_saker 
SET kategori = 'melding', er_viktig = true
WHERE (tittel ILIKE '%meld. st.%')
   AND kategori IS NULL;

-- EØS/Samtykke - mindre viktig
UPDATE public.stortinget_saker 
SET kategori = 'samtykke', er_viktig = false
WHERE (tittel ILIKE '%samtykke til%'
   OR tittel ILIKE '%eøs-komiteens%')
   AND kategori IS NULL;

-- Rapporter - IKKE viktig
UPDATE public.stortinget_saker 
SET kategori = 'rapport', er_viktig = false
WHERE (tittel ILIKE '%årsrapport%'
   OR tittel ILIKE '%årsmelding%'
   OR tittel ILIKE '%beretning%'
   OR tittel ILIKE '%riksrevisjonens%')
   AND kategori IS NULL;

-- Alt annet
UPDATE public.stortinget_saker 
SET kategori = 'annet', er_viktig = false
WHERE kategori IS NULL;