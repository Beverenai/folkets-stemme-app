import { cn } from '@/lib/utils';
import { getPartiConfig } from '@/lib/partiConfig';

interface PartiSamsvar {
  parti: string;
  partiForkortelse: string;
  enighet: number;
  antallSaker: number;
}

interface NrkPartiBarProps {
  data: PartiSamsvar[];
  maxBars?: number;
}

export default function NrkPartiBar({ data, maxBars = 10 }: NrkPartiBarProps) {
  const sortedData = [...data].sort((a, b) => b.enighet - a.enighet).slice(0, maxBars);

  return (
    <div className="space-y-3">
      {sortedData.map((item, index) => {
        const config = getPartiConfig(item.partiForkortelse);
        
        return (
          <div key={item.partiForkortelse} className="animate-ios-slide-up" style={{ animationDelay: `${index * 0.03}s` }}>
            <div className="flex items-center gap-3">
              {/* Party badge */}
              <div 
                className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                style={{ backgroundColor: config.farge, color: config.tekstFarge }}
              >
                {config.forkortelse}
              </div>
              
              {/* Party name and bar */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium truncate">{config.navn}</span>
                  <span className="text-sm font-bold ml-2">{Math.round(item.enighet)}%</span>
                </div>
                
                {/* Progress bar */}
                <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{ 
                      width: `${item.enighet}%`,
                      backgroundColor: config.farge,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
