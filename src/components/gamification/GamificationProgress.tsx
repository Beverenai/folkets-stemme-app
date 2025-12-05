import { cn } from '@/lib/utils';
import { UserLevel } from '@/lib/achievements';
import { Sparkles } from 'lucide-react';

interface GamificationProgressProps {
  level: UserLevel;
  xpPoints: number;
  progressToNextLevel: number;
  className?: string;
  compact?: boolean;
}

export default function GamificationProgress({
  level,
  xpPoints,
  progressToNextLevel,
  className,
  compact = false,
}: GamificationProgressProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-sm">Nivå {level.level}</p>
            <p className="text-xs text-muted-foreground">{level.name}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-mono text-sm font-medium">{xpPoints} XP</p>
          {!compact && level.maxXp !== Infinity && (
            <p className="text-xs text-muted-foreground">
              {level.maxXp - xpPoints} til neste nivå
            </p>
          )}
        </div>
      </div>
      
      <div className="relative">
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressToNextLevel}%` }}
          />
        </div>
        {!compact && (
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-muted-foreground">
              {level.minXp} XP
            </span>
            {level.maxXp !== Infinity && (
              <span className="text-[10px] text-muted-foreground">
                {level.maxXp} XP
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
