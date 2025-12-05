import { cn } from '@/lib/utils';
import { Achievement } from '@/lib/achievements';
import { Lock } from 'lucide-react';

interface AchievementBadgeProps {
  achievement: Achievement;
  unlocked: boolean;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export default function AchievementBadge({
  achievement,
  unlocked,
  size = 'md',
  showLabel = true,
  className,
}: AchievementBadgeProps) {
  const Icon = achievement.icon;
  
  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-20 h-20',
  };

  const iconSizes = {
    sm: 'w-5 h-5',
    md: 'w-7 h-7',
    lg: 'w-9 h-9',
  };

  const emojiSizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
  };

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <div
        className={cn(
          'rounded-full flex items-center justify-center transition-all duration-300',
          sizeClasses[size],
          unlocked
            ? 'bg-gradient-to-br from-primary/20 to-primary/40 border-2 border-primary shadow-lg shadow-primary/20'
            : 'bg-muted border-2 border-muted-foreground/20 grayscale opacity-50'
        )}
      >
        {unlocked ? (
          <span className={emojiSizes[size]}>{achievement.emoji}</span>
        ) : (
          <Lock className={cn(iconSizes[size], 'text-muted-foreground')} />
        )}
      </div>
      {showLabel && (
        <div className="text-center">
          <p className={cn(
            'font-medium',
            size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base',
            !unlocked && 'text-muted-foreground'
          )}>
            {achievement.name}
          </p>
          {size !== 'sm' && (
            <p className={cn(
              'text-xs text-muted-foreground',
              !unlocked && 'opacity-75'
            )}>
              {unlocked ? achievement.description : achievement.requirement}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
