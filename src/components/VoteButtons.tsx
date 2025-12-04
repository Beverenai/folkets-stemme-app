import { ThumbsUp, ThumbsDown, Minus, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { triggerHaptic } from '@/lib/haptics';

interface VoteButtonsProps {
  currentVote: string | null;
  onVote: (vote: 'for' | 'mot' | 'avholdende') => void;
  disabled?: boolean;
  isLoggedIn: boolean;
}

export default function VoteButtons({ currentVote, onVote, disabled, isLoggedIn }: VoteButtonsProps) {
  if (!isLoggedIn) {
    return (
      <div className="text-center py-6">
        <p className="text-muted-foreground mb-4">
          Logg inn for å avgi din stemme
        </p>
        <Button asChild className="gradient-hero text-white hover:opacity-90">
          <Link to="/auth">
            <LogIn className="h-4 w-4 mr-2" />
            Logg inn
          </Link>
        </Button>
      </div>
    );
  }

  const handleVote = (vote: 'for' | 'mot' | 'avholdende') => {
    // Trigger haptic feedback based on vote type
    if (vote === 'for') {
      triggerHaptic('success');
    } else if (vote === 'mot') {
      triggerHaptic('error');
    } else {
      triggerHaptic('medium');
    }
    onVote(vote);
  };

  const votes = [
    {
      value: 'for' as const,
      label: 'For',
      icon: ThumbsUp,
      className: 'bg-vote-for hover:bg-vote-for/90 text-vote-for-foreground',
      activeClass: 'ring-4 ring-vote-for/30 scale-105',
    },
    {
      value: 'avholdende' as const,
      label: 'Avholdende',
      icon: Minus,
      className: 'bg-vote-avholdende hover:bg-vote-avholdende/90 text-vote-avholdende-foreground',
      activeClass: 'ring-4 ring-vote-avholdende/30 scale-105',
    },
    {
      value: 'mot' as const,
      label: 'Mot',
      icon: ThumbsDown,
      className: 'bg-vote-mot hover:bg-vote-mot/90 text-vote-mot-foreground',
      activeClass: 'ring-4 ring-vote-mot/30 scale-105',
    },
  ];

  return (
    <div className="space-y-3">
      {votes.map((vote) => {
        const Icon = vote.icon;
        const isActive = currentVote === vote.value;

        return (
          <button
            key={vote.value}
            onClick={() => handleVote(vote.value)}
            disabled={disabled}
            className={cn(
              'w-full flex items-center justify-center gap-3 p-4 rounded-xl font-semibold text-lg transition-all duration-200',
              vote.className,
              isActive && vote.activeClass,
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <Icon className={cn('h-6 w-6', isActive && 'animate-bounce-in')} />
            {vote.label}
            {isActive && (
              <span className="ml-auto text-sm font-normal opacity-80">
                ✓ Din stemme
              </span>
            )}
          </button>
        );
      })}

      {currentVote && (
        <p className="text-center text-sm text-muted-foreground mt-4">
          Du kan endre din stemme når som helst
        </p>
      )}
    </div>
  );
}
