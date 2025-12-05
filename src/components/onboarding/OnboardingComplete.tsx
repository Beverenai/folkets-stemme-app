import { useEffect } from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { triggerSuccessConfetti } from '@/lib/confetti';
import AchievementBadge from '@/components/gamification/AchievementBadge';
import { getAchievementById } from '@/lib/achievements';

interface OnboardingCompleteProps {
  onComplete: () => void;
}

export default function OnboardingComplete({ onComplete }: OnboardingCompleteProps) {
  const achievement = getAchievementById('onboarding_complete');

  useEffect(() => {
    // Trigger celebration on mount
    triggerSuccessConfetti();
  }, []);

  if (!achievement) return null;

  return (
    <div className="flex flex-col items-center text-center px-4 animate-fade-in">
      <div className="relative mb-6">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center animate-scale-in">
          <Sparkles className="w-12 h-12 text-primary" />
        </div>
        <div className="absolute -top-2 -right-2 animate-bounce">
          <span className="text-3xl">{achievement.emoji}</span>
        </div>
      </div>

      <h2 className="text-2xl font-bold mb-2">Gratulerer!</h2>
      <p className="text-muted-foreground mb-6">
        Du har fullført introduksjonen og fått ditt første merke!
      </p>

      <div className="bg-card rounded-xl p-6 border mb-6 w-full">
        <p className="text-sm text-muted-foreground mb-4">Du har låst opp:</p>
        <AchievementBadge achievement={achievement} unlocked={true} size="lg" />
        <p className="text-xs text-primary font-medium mt-4">
          +{achievement.xpReward} XP
        </p>
      </div>

      <div className="bg-secondary/50 rounded-xl p-4 mb-6 w-full">
        <p className="text-sm font-medium mb-2">Neste steg:</p>
        <ul className="text-sm text-muted-foreground space-y-2 text-left">
          <li className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-xs">1</span>
            Stem på din første ekte sak
          </li>
          <li className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-xs">2</span>
            Sammenlign med Stortinget
          </li>
          <li className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-xs">3</span>
            Lås opp flere merker!
          </li>
        </ul>
      </div>

      <button
        onClick={onComplete}
        className="w-full h-14 rounded-full bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2"
      >
        Start å stemme
        <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );
}
