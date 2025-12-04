import { ThumbsUp, ThumbsDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { triggerHaptic } from '@/lib/haptics';

interface NrkVoteButtonsProps {
  currentVote: string | null;
  onVote: (vote: 'for' | 'mot' | 'avholdende') => void;
  disabled?: boolean;
  isLoggedIn?: boolean;
  onLoginClick?: () => void;
}

export default function NrkVoteButtons({ 
  currentVote, 
  onVote, 
  disabled = false,
  isLoggedIn = true,
  onLoginClick
}: NrkVoteButtonsProps) {
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

  if (!isLoggedIn) {
    return (
      <div className="text-center py-6">
        <p className="text-muted-foreground mb-4">Logg inn for å stemme</p>
        <button
          onClick={() => {
            triggerHaptic('light');
            onLoginClick?.();
          }}
          className="px-6 py-3 bg-primary text-primary-foreground rounded-full font-semibold ios-press hover:bg-primary/90 transition-colors"
        >
          Logg inn
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {/* For button */}
        <button
          onClick={() => handleVote('for')}
          disabled={disabled}
          className={cn(
            'nrk-vote-btn group flex flex-col items-center justify-center py-5 px-3 rounded-2xl transition-all ios-press',
            currentVote === 'for'
              ? 'bg-[hsl(var(--vote-for))] text-white ring-2 ring-[hsl(var(--vote-for))] ring-offset-2 ring-offset-background'
              : 'bg-[hsl(var(--vote-for))]/15 text-[hsl(var(--vote-for))] hover:bg-[hsl(var(--vote-for))]/25'
          )}
        >
          <div className={cn(
            'h-12 w-12 rounded-full flex items-center justify-center mb-2 transition-all',
            currentVote === 'for' 
              ? 'bg-white/20' 
              : 'bg-[hsl(var(--vote-for))]/20 group-hover:bg-[hsl(var(--vote-for))]/30'
          )}>
            <ThumbsUp className="h-6 w-6" />
          </div>
          <span className="text-sm font-bold">For</span>
        </button>

        {/* Avstår button */}
        <button
          onClick={() => handleVote('avholdende')}
          disabled={disabled}
          className={cn(
            'nrk-vote-btn group flex flex-col items-center justify-center py-5 px-3 rounded-2xl transition-all ios-press',
            currentVote === 'avholdende'
              ? 'bg-muted-foreground text-white ring-2 ring-muted-foreground ring-offset-2 ring-offset-background'
              : 'bg-muted-foreground/15 text-muted-foreground hover:bg-muted-foreground/25'
          )}
        >
          <div className={cn(
            'h-12 w-12 rounded-full flex items-center justify-center mb-2 transition-all',
            currentVote === 'avholdende' 
              ? 'bg-white/20' 
              : 'bg-muted-foreground/20 group-hover:bg-muted-foreground/30'
          )}>
            <Minus className="h-6 w-6" />
          </div>
          <span className="text-sm font-bold">Avstår</span>
        </button>

        {/* Mot button */}
        <button
          onClick={() => handleVote('mot')}
          disabled={disabled}
          className={cn(
            'nrk-vote-btn group flex flex-col items-center justify-center py-5 px-3 rounded-2xl transition-all ios-press',
            currentVote === 'mot'
              ? 'bg-[hsl(var(--vote-mot))] text-white ring-2 ring-[hsl(var(--vote-mot))] ring-offset-2 ring-offset-background'
              : 'bg-[hsl(var(--vote-mot))]/15 text-[hsl(var(--vote-mot))] hover:bg-[hsl(var(--vote-mot))]/25'
          )}
        >
          <div className={cn(
            'h-12 w-12 rounded-full flex items-center justify-center mb-2 transition-all',
            currentVote === 'mot' 
              ? 'bg-white/20' 
              : 'bg-[hsl(var(--vote-mot))]/20 group-hover:bg-[hsl(var(--vote-mot))]/30'
          )}>
            <ThumbsDown className="h-6 w-6" />
          </div>
          <span className="text-sm font-bold">Mot</span>
        </button>
      </div>

      {currentVote && (
        <p className="text-center text-xs text-muted-foreground">
          Du kan endre stemmen din når som helst
        </p>
      )}
    </div>
  );
}
