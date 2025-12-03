import { Link } from 'react-router-dom';
import { ChevronRight, Users, TrendingUp } from 'lucide-react';
import { getPartiConfig } from '@/lib/partiConfig';

interface PartiKortProps {
  forkortelse: string;
  antallRepresentanter: number;
  stemmeStats?: {
    for: number;
    mot: number;
    avholdende: number;
  };
}

export default function PartiKort({ forkortelse, antallRepresentanter, stemmeStats }: PartiKortProps) {
  const config = getPartiConfig(forkortelse);
  const totalStemmer = stemmeStats ? stemmeStats.for + stemmeStats.mot + stemmeStats.avholdende : 0;
  const forProsent = totalStemmer > 0 ? Math.round((stemmeStats!.for / totalStemmer) * 100) : null;

  return (
    <Link
      to={`/parti/${forkortelse}`}
      className="block bg-card rounded-2xl border border-border/50 overflow-hidden transition-all duration-200 hover:scale-[0.98] active:scale-[0.96]"
      style={{ 
        boxShadow: `0 4px 20px -4px ${config.farge}30`
      }}
    >
      {/* Color accent bar */}
      <div 
        className="h-2"
        style={{ backgroundColor: config.farge }}
      />
      
      <div className="p-4">
        {/* Header with abbreviation and name */}
        <div className="flex items-center gap-3 mb-3">
          <div 
            className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg"
            style={{ 
              backgroundColor: config.farge,
              color: config.tekstFarge
            }}
          >
            {config.forkortelse}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate">
              {config.navn}
            </h3>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              <span>{antallRepresentanter} representanter</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        {forProsent !== null && (
          <div className="flex items-center justify-between pt-3 border-t border-border/50">
            <div className="flex items-center gap-1.5 text-sm">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-muted-foreground">For-stemmer:</span>
              <span className="font-semibold text-foreground">{forProsent}%</span>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        )}

        {forProsent === null && (
          <div className="flex items-center justify-end pt-3 border-t border-border/50">
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
      </div>
    </Link>
  );
}
