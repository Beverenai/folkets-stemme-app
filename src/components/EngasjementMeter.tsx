import { cn } from '@/lib/utils';
import { Flame, Meh, Snowflake, TrendingUp } from 'lucide-react';

interface EngasjementMeterProps {
  antallStemmer: number;
  stemmerSisteTime?: number;
  visninger?: number;
  className?: string;
}

type EngasjementNiva = 'høyt' | 'normalt' | 'lavt';

function calculateEngasjement(
  antallStemmer: number,
  stemmerSisteTime?: number
): EngasjementNiva {
  // Simple heuristic based on vote counts
  if (antallStemmer > 50 || (stemmerSisteTime && stemmerSisteTime > 10)) {
    return 'høyt';
  }
  if (antallStemmer > 10) {
    return 'normalt';
  }
  return 'lavt';
}

const engasjementConfig: Record<EngasjementNiva, {
  icon: typeof Flame;
  emoji: string;
  label: string;
  description: string;
  bgClass: string;
  textClass: string;
  barWidth: string;
}> = {
  høyt: {
    icon: Flame,
    emoji: '🔥',
    label: 'Høyt engasjement',
    description: 'Mange stemmer raskt inn',
    bgClass: 'bg-nrk-danger/20',
    textClass: 'text-nrk-danger',
    barWidth: '100%',
  },
  normalt: {
    icon: Meh,
    emoji: '😐',
    label: 'Normalt engasjement',
    description: 'Jevn stemmestrøm',
    bgClass: 'bg-nrk-neutral/20',
    textClass: 'text-nrk-neutral',
    barWidth: '60%',
  },
  lavt: {
    icon: Snowflake,
    emoji: '❄️',
    label: 'Lavt engasjement',
    description: 'Få har stemt',
    bgClass: 'bg-nrk-primary/20',
    textClass: 'text-nrk-primary',
    barWidth: '25%',
  },
};

export default function EngasjementMeter({ 
  antallStemmer, 
  stemmerSisteTime,
  visninger,
  className 
}: EngasjementMeterProps) {
  const niva = calculateEngasjement(antallStemmer, stemmerSisteTime);
  const config = engasjementConfig[niva];
  const Icon = config.icon;

  return (
    <div className={cn('nrk-card', className)}>
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-5 w-5 text-nrk-primary" />
        <h3 className="font-bold text-lg">Engasjement</h3>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <div className={cn(
          'h-16 w-16 rounded-2xl flex items-center justify-center text-3xl',
          config.bgClass
        )}>
          {config.emoji}
        </div>
        <div>
          <p className={cn('font-bold text-lg', config.textClass)}>
            {config.label}
          </p>
          <p className="text-sm text-muted-foreground">{config.description}</p>
        </div>
      </div>

      {/* Temperature bar */}
      <div className="mb-4">
        <div className="h-3 bg-secondary rounded-full overflow-hidden">
          <div 
            className={cn(
              'h-full rounded-full transition-all duration-700',
              niva === 'høyt' ? 'bg-nrk-danger' : 
              niva === 'normalt' ? 'bg-nrk-neutral' : 'bg-nrk-primary'
            )}
            style={{ width: config.barWidth }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>❄️ Kaldt</span>
          <span>🔥 Hett</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 text-center">
        <div>
          <p className="text-2xl font-bold">{antallStemmer}</p>
          <p className="text-xs text-muted-foreground">Totalt stemmer</p>
        </div>
        {stemmerSisteTime !== undefined && (
          <div>
            <p className="text-2xl font-bold">{stemmerSisteTime}</p>
            <p className="text-xs text-muted-foreground">Siste time</p>
          </div>
        )}
      </div>
    </div>
  );
}
