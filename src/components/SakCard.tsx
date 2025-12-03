import { Link } from 'react-router-dom';
import { Clock, Users, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Sak {
  id: string;
  stortinget_id: string;
  tittel: string;
  kort_tittel: string | null;
  beskrivelse: string | null;
  tema: string | null;
  status: string;
  stortinget_votering_for: number | null;
  stortinget_votering_mot: number | null;
  folke_stemmer?: { stemme: string }[];
}

interface SakCardProps {
  sak: Sak;
  index?: number;
}

export default function SakCard({ sak, index = 0 }: SakCardProps) {
  const folkeStemmer = sak.folke_stemmer || [];
  const forCount = folkeStemmer.filter(s => s.stemme === 'for').length;
  const motCount = folkeStemmer.filter(s => s.stemme === 'mot').length;
  const avholdendeCount = folkeStemmer.filter(s => s.stemme === 'avholdende').length;
  const totalCount = forCount + motCount + avholdendeCount;

  const isAvsluttet = sak.status === 'avsluttet';

  return (
    <Link
      to={`/sak/${sak.id}`}
      className={cn(
        'group block p-6 rounded-2xl bg-card border border-border transition-all duration-300',
        'hover:shadow-lg hover:border-primary/20 hover:-translate-y-1',
        'animate-slide-up'
      )}
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      {/* Status Badge */}
      <div className="flex items-center justify-between mb-3">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium',
            isAvsluttet
              ? 'bg-muted text-muted-foreground'
              : 'bg-success/10 text-success'
          )}
        >
          <Clock className="h-3 w-3" />
          {isAvsluttet ? 'Avsluttet' : 'Pågående'}
        </span>
        {sak.tema && (
          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
            {sak.tema}
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="font-display text-lg font-semibold mb-2 line-clamp-2 group-hover:text-primary transition-colors">
        {sak.kort_tittel || sak.tittel}
      </h3>

      {/* Description */}
      {sak.beskrivelse && (
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
          {sak.beskrivelse}
        </p>
      )}

      {/* Vote Stats */}
      {totalCount > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {totalCount} stemmer avgitt
            </span>
          </div>
          <div className="flex h-2 rounded-full overflow-hidden bg-muted">
            {forCount > 0 && (
              <div
                className="bg-vote-for transition-all"
                style={{ width: `${(forCount / totalCount) * 100}%` }}
              />
            )}
            {avholdendeCount > 0 && (
              <div
                className="bg-vote-avholdende transition-all"
                style={{ width: `${(avholdendeCount / totalCount) * 100}%` }}
              />
            )}
            {motCount > 0 && (
              <div
                className="bg-vote-mot transition-all"
                style={{ width: `${(motCount / totalCount) * 100}%` }}
              />
            )}
          </div>
          <div className="flex justify-between mt-2 text-xs">
            <span className="text-vote-for font-medium">{forCount} for</span>
            <span className="text-vote-avholdende font-medium">{avholdendeCount} avh.</span>
            <span className="text-vote-mot font-medium">{motCount} mot</span>
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <span className="text-sm font-medium text-primary group-hover:underline">
          {isAvsluttet ? 'Se resultat' : 'Avgi din stemme'}
        </span>
        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
      </div>
    </Link>
  );
}
