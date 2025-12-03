import CaseCard from './CaseCard';

interface Sak {
  id: string;
  stortinget_id: string;
  tittel: string;
  kort_tittel: string | null;
  beskrivelse: string | null;
  tema: string | null;
  status: string;
  oppsummering?: string | null;
  kategori?: string | null;
  bilde_url?: string | null;
  stortinget_votering_for?: number | null;
  stortinget_votering_mot?: number | null;
  folke_stemmer?: { stemme: string }[];
}

interface SakCardProps {
  sak: Sak;
  index?: number;
  variant?: 'default' | 'compact' | 'featured';
}

export default function SakCard({ sak, index = 0, variant = 'default' }: SakCardProps) {
  const folkeStemmer = sak.folke_stemmer || [];
  const forCount = folkeStemmer.filter(s => s.stemme === 'for').length;
  const motCount = folkeStemmer.filter(s => s.stemme === 'mot').length;
  const avholdendeCount = folkeStemmer.filter(s => s.stemme === 'avholdende').length;

  return (
    <CaseCard
      id={sak.id}
      tittel={sak.tittel}
      kortTittel={sak.kort_tittel}
      oppsummering={sak.oppsummering}
      kategori={sak.kategori}
      status={sak.status}
      bildeUrl={sak.bilde_url}
      forCount={forCount}
      motCount={motCount}
      avholdendeCount={avholdendeCount}
      index={index}
      variant={variant}
    />
  );
}