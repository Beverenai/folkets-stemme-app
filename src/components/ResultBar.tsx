import { cn } from '@/lib/utils';

interface ResultBarProps {
  forCount: number;
  motCount: number;
  avholdendeCount?: number;
  showLabels?: boolean;
  showPercentages?: boolean;
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
}

export default function ResultBar({ 
  forCount, 
  motCount, 
  avholdendeCount = 0, 
  showLabels = false,
  showPercentages = true,
  size = 'md',
  animated = true
}: ResultBarProps) {
  const total = forCount + motCount + avholdendeCount;
  
  if (total === 0) {
    return (
      <div className={cn(
        'bg-secondary rounded-full overflow-hidden',
        size === 'sm' && 'h-1.5',
        size === 'md' && 'h-3',
        size === 'lg' && 'h-4'
      )}>
        <div className="h-full w-full bg-muted-foreground/20" />
      </div>
    );
  }

  const forPercent = (forCount / total) * 100;
  const motPercent = (motCount / total) * 100;
  const avholdendePercent = (avholdendeCount / total) * 100;

  return (
    <div className="space-y-1">
      {/* Percentage labels above bar - always show when showPercentages is true */}
      {showPercentages && (
        <div className={cn(
          "flex justify-between font-semibold",
          size === 'sm' && 'text-[10px]',
          size === 'md' && 'text-xs',
          size === 'lg' && 'text-sm'
        )}>
          <span className={cn(size === 'sm' ? 'text-white/90' : 'text-vote-for')}>{Math.round(forPercent)}%</span>
          {avholdendeCount > 0 && (
            <span className={cn(size === 'sm' ? 'text-white/70' : 'text-vote-avholdende')}>{Math.round(avholdendePercent)}%</span>
          )}
          <span className={cn(size === 'sm' ? 'text-white/90' : 'text-vote-mot')}>{Math.round(motPercent)}%</span>
        </div>
      )}

      {/* Bar */}
      <div className={cn(
        'flex rounded-full overflow-hidden bg-secondary',
        size === 'sm' && 'h-1.5',
        size === 'md' && 'h-3',
        size === 'lg' && 'h-5'
      )}>
        {forCount > 0 && (
          <div 
            className={cn(
              'bg-vote-for transition-all duration-700 ease-out',
              animated && 'animate-progress-fill'
            )}
            style={{ 
              width: `${forPercent}%`,
              ['--progress-width' as string]: `${forPercent}%`
            }} 
          />
        )}
        {avholdendeCount > 0 && (
          <div 
            className={cn(
              'bg-vote-avholdende transition-all duration-700 ease-out',
              animated && 'animate-progress-fill'
            )}
            style={{ 
              width: `${avholdendePercent}%`,
              animationDelay: '0.1s',
              ['--progress-width' as string]: `${avholdendePercent}%`
            }} 
          />
        )}
        {motCount > 0 && (
          <div 
            className={cn(
              'bg-vote-mot transition-all duration-700 ease-out',
              animated && 'animate-progress-fill'
            )}
            style={{ 
              width: `${motPercent}%`,
              animationDelay: '0.2s',
              ['--progress-width' as string]: `${motPercent}%`
            }} 
          />
        )}
      </div>

      {/* Labels below bar */}
      {showLabels && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-vote-for" />
            <span>For ({forCount})</span>
          </div>
          {avholdendeCount > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-vote-avholdende" />
              <span>Avholdende ({avholdendeCount})</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-vote-mot" />
            <span>Mot ({motCount})</span>
          </div>
        </div>
      )}
    </div>
  );
}