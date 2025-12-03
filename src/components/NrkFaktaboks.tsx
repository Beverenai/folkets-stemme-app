import { Info, Users, Calendar, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NrkFaktaboksProps {
  oppsummering?: string | null;
  praktiskeKonsekvenser?: string[];
  hvemBerores?: string;
  ikrafttredelse?: string;
  className?: string;
}

export default function NrkFaktaboks({ 
  oppsummering, 
  praktiskeKonsekvenser = [],
  hvemBerores,
  ikrafttredelse,
  className 
}: NrkFaktaboksProps) {
  if (!oppsummering && praktiskeKonsekvenser.length === 0) return null;

  return (
    <div className={cn('nrk-faktaboks', className)}>
      <div className="flex items-center gap-2 mb-4">
        <div className="h-10 w-10 rounded-xl bg-nrk-primary/15 flex items-center justify-center">
          <Info className="h-5 w-5 text-nrk-primary" />
        </div>
        <h3 className="font-bold text-lg">Dette betyr det for folk flest</h3>
      </div>

      {oppsummering && (
        <p className="text-[15px] leading-relaxed text-foreground/90 mb-4">
          {oppsummering}
        </p>
      )}

      {praktiskeKonsekvenser.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
            <ArrowRight className="h-4 w-4" />
            Dette endres i praksis
          </h4>
          <ul className="space-y-2">
            {praktiskeKonsekvenser.map((konsekvens, index) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-nrk-primary mt-2 shrink-0" />
                <span>{konsekvens}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {hvemBerores && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
            <Users className="h-4 w-4" />
            Hvem berøres
          </h4>
          <p className="text-sm">{hvemBerores}</p>
        </div>
      )}

      {ikrafttredelse && (
        <div>
          <h4 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Når trer dette i kraft
          </h4>
          <p className="text-sm">{ikrafttredelse}</p>
        </div>
      )}
    </div>
  );
}
