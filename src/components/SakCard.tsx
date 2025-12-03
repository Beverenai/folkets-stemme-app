import { Link } from 'react-router-dom';
import { Vote, ChevronRight, Clock, CheckCircle } from 'lucide-react';
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

  const colors = ['bg-primary/10 text-primary', 'bg-ios-green/10 text-ios-green', 'bg-ios-orange/10 text-ios-orange', 'bg-ios-purple/10 text-ios-purple'];
  const colorClass = colors[index % colors.length];

  return (
    <Link
      to={`/sak/${sak.id}`}
      className="ios-list-item ios-touch animate-ios-slide-up"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div className={cn('h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0', colorClass.split(' ')[0])}>
        <Vote className={cn('h-5 w-5', colorClass.split(' ')[1])} />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="font-medium text-[15px] truncate">
            {sak.kort_tittel || sak.tittel}
          </p>
        </div>
        
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className={cn(
            'flex items-center gap-1',
            isAvsluttet ? 'text-muted-foreground' : 'text-ios-green'
          )}>
            {isAvsluttet ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
            {isAvsluttet ? 'Avsluttet' : 'Pågående'}
          </span>
          {totalCount > 0 && (
            <span>{totalCount} stemmer</span>
          )}
        </div>

        {/* Mini vote bar */}
        {totalCount > 0 && (
          <div className="flex h-1 rounded-full overflow-hidden bg-muted mt-2">
            {forCount > 0 && (
              <div className="bg-vote-for" style={{ width: `${(forCount / totalCount) * 100}%` }} />
            )}
            {avholdendeCount > 0 && (
              <div className="bg-vote-avholdende" style={{ width: `${(avholdendeCount / totalCount) * 100}%` }} />
            )}
            {motCount > 0 && (
              <div className="bg-vote-mot" style={{ width: `${(motCount / totalCount) * 100}%` }} />
            )}
          </div>
        )}
      </div>
      
      <ChevronRight className="h-5 w-5 text-muted-foreground/50 flex-shrink-0" />
    </Link>
  );
}
