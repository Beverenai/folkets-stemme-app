import { ThumbsUp, ThumbsDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  if (!isLoggedIn) {
    return (
      <div className="text-center py-6">
        <p className="text-muted-foreground mb-4">Logg inn for å stemme</p>
        <button
          onClick={onLoginClick}
          className="px-6 py-3 bg-nrk-primary text-white rounded-full font-semibold ios-press hover:bg-nrk-primary/90 transition-colors"
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
          onClick={() => onVote('for')}
          disabled={disabled}
          className={cn(
            'nrk-vote-btn group flex flex-col items-center justify-center py-5 px-3 rounded-2xl transition-all ios-press',
            currentVote === 'for'
              ? 'bg-nrk-success text-white ring-2 ring-nrk-success ring-offset-2 ring-offset-background'
              : 'bg-nrk-success/15 text-nrk-success hover:bg-nrk-success/25'
          )}
        >
          <div className={cn(
            'h-12 w-12 rounded-full flex items-center justify-center mb-2 transition-all',
            currentVote === 'for' 
              ? 'bg-white/20' 
              : 'bg-nrk-success/20 group-hover:bg-nrk-success/30'
          )}>
            <ThumbsUp className="h-6 w-6" />
          </div>
          <span className="text-sm font-bold">For</span>
        </button>

        {/* Avstår button */}
        <button
          onClick={() => onVote('avholdende')}
          disabled={disabled}
          className={cn(
            'nrk-vote-btn group flex flex-col items-center justify-center py-5 px-3 rounded-2xl transition-all ios-press',
            currentVote === 'avholdende'
              ? 'bg-nrk-neutral text-white ring-2 ring-nrk-neutral ring-offset-2 ring-offset-background'
              : 'bg-nrk-neutral/15 text-nrk-neutral hover:bg-nrk-neutral/25'
          )}
        >
          <div className={cn(
            'h-12 w-12 rounded-full flex items-center justify-center mb-2 transition-all',
            currentVote === 'avholdende' 
              ? 'bg-white/20' 
              : 'bg-nrk-neutral/20 group-hover:bg-nrk-neutral/30'
          )}>
            <Minus className="h-6 w-6" />
          </div>
          <span className="text-sm font-bold">Avstår</span>
        </button>

        {/* Mot button */}
        <button
          onClick={() => onVote('mot')}
          disabled={disabled}
          className={cn(
            'nrk-vote-btn group flex flex-col items-center justify-center py-5 px-3 rounded-2xl transition-all ios-press',
            currentVote === 'mot'
              ? 'bg-nrk-danger text-white ring-2 ring-nrk-danger ring-offset-2 ring-offset-background'
              : 'bg-nrk-danger/15 text-nrk-danger hover:bg-nrk-danger/25'
          )}
        >
          <div className={cn(
            'h-12 w-12 rounded-full flex items-center justify-center mb-2 transition-all',
            currentVote === 'mot' 
              ? 'bg-white/20' 
              : 'bg-nrk-danger/20 group-hover:bg-nrk-danger/30'
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
