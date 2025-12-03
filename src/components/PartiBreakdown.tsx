import { getPartiConfig } from '@/lib/partiConfig';
import { cn } from '@/lib/utils';

interface PartiStemme {
  parti_forkortelse: string;
  stemmer_for: number;
  stemmer_mot: number;
}

interface PartiBreakdownProps {
  partiStemmer: PartiStemme[];
  className?: string;
}

export default function PartiBreakdown({ partiStemmer, className }: PartiBreakdownProps) {
  if (!partiStemmer || partiStemmer.length === 0) return null;

  // Determine which parties voted for/against (majority of their representatives)
  const partierFor = partiStemmer
    .filter(p => p.stemmer_for > p.stemmer_mot)
    .map(p => p.parti_forkortelse);
  
  const partierMot = partiStemmer
    .filter(p => p.stemmer_mot > p.stemmer_for)
    .map(p => p.parti_forkortelse);

  if (partierFor.length === 0 && partierMot.length === 0) return null;

  return (
    <div className={cn('space-y-2', className)}>
      {partierFor.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-10 shrink-0">For:</span>
          <div className="flex flex-wrap gap-1.5">
            {partierFor.map(forkortelse => {
              const config = getPartiConfig(forkortelse);
              return (
                <div
                  key={forkortelse}
                  className="h-6 w-6 rounded-full overflow-hidden ring-1 ring-border/30 bg-card flex items-center justify-center"
                  title={config.navn}
                >
                  {config.logo ? (
                    <img src={config.logo} alt={config.forkortelse} className="h-5 w-5 object-contain" />
                  ) : (
                    <span 
                      className="text-[8px] font-bold" 
                      style={{ color: config.farge }}
                    >
                      {config.forkortelse}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {partierMot.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-10 shrink-0">Mot:</span>
          <div className="flex flex-wrap gap-1.5">
            {partierMot.map(forkortelse => {
              const config = getPartiConfig(forkortelse);
              return (
                <div
                  key={forkortelse}
                  className="h-6 w-6 rounded-full overflow-hidden ring-1 ring-border/30 bg-card flex items-center justify-center"
                  title={config.navn}
                >
                  {config.logo ? (
                    <img src={config.logo} alt={config.forkortelse} className="h-5 w-5 object-contain" />
                  ) : (
                    <span 
                      className="text-[8px] font-bold" 
                      style={{ color: config.farge }}
                    >
                      {config.forkortelse}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
