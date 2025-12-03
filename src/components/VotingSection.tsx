import { useState } from 'react';
import { ThumbsUp, ThumbsDown, Minus, LogIn, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface VotingSectionProps {
  userVote: string | null;
  onVote: (vote: 'for' | 'mot' | 'avholdende') => Promise<void>;
  isLoggedIn: boolean;
  disabled?: boolean;
}

export default function VotingSection({ userVote, onVote, isLoggedIn, disabled }: VotingSectionProps) {
  const [submitting, setSubmitting] = useState(false);
  const [animatingVote, setAnimatingVote] = useState<string | null>(null);

  const handleVote = async (vote: 'for' | 'mot' | 'avholdende') => {
    if (submitting || disabled) return;
    
    setSubmitting(true);
    setAnimatingVote(vote);
    
    try {
      await onVote(vote);
    } finally {
      setSubmitting(false);
      setTimeout(() => setAnimatingVote(null), 500);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="premium-card p-6 text-center animate-ios-slide-up">
        <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <LogIn className="h-8 w-8 text-primary" />
        </div>
        <h3 className="font-semibold text-lg mb-2">Avgi din stemme</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Logg inn for å stemme på denne saken
        </p>
        <Button asChild className="w-full h-12 text-base font-semibold ios-press">
          <Link to="/auth">
            Logg inn
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="premium-card p-5 animate-ios-slide-up">
      <h3 className="font-semibold text-lg mb-1">
        {userVote ? 'Din stemme' : 'Avgi din stemme'}
      </h3>
      {userVote && (
        <p className="text-xs text-muted-foreground mb-4">
          Du kan endre din stemme når som helst
        </p>
      )}
      
      <div className="grid grid-cols-3 gap-3 mt-4">
        {/* For button */}
        <button
          onClick={() => handleVote('for')}
          disabled={submitting}
          className={cn(
            'relative flex flex-col items-center justify-center gap-2 py-5 rounded-2xl font-semibold transition-all ios-press',
            userVote === 'for' 
              ? 'bg-vote-for text-vote-for-foreground shadow-lg shadow-vote-for/30' 
              : 'bg-vote-for/10 text-vote-for hover:bg-vote-for/20',
            animatingVote === 'for' && 'animate-vote-success',
            submitting && 'opacity-50'
          )}
        >
          <ThumbsUp className={cn('h-6 w-6', userVote === 'for' && 'animate-ios-bounce')} />
          <span className="text-sm">For</span>
          {userVote === 'for' && (
            <div className="absolute -top-1 -right-1 h-5 w-5 bg-background rounded-full flex items-center justify-center">
              <Check className="h-3 w-3 text-vote-for" />
            </div>
          )}
        </button>

        {/* Avholdende button */}
        <button
          onClick={() => handleVote('avholdende')}
          disabled={submitting}
          className={cn(
            'relative flex flex-col items-center justify-center gap-2 py-5 rounded-2xl font-semibold transition-all ios-press',
            userVote === 'avholdende' 
              ? 'bg-vote-avholdende text-vote-avholdende-foreground shadow-lg shadow-vote-avholdende/30' 
              : 'bg-vote-avholdende/10 text-vote-avholdende hover:bg-vote-avholdende/20',
            animatingVote === 'avholdende' && 'animate-vote-success',
            submitting && 'opacity-50'
          )}
        >
          <Minus className={cn('h-6 w-6', userVote === 'avholdende' && 'animate-ios-bounce')} />
          <span className="text-sm">Avstår</span>
          {userVote === 'avholdende' && (
            <div className="absolute -top-1 -right-1 h-5 w-5 bg-background rounded-full flex items-center justify-center">
              <Check className="h-3 w-3 text-vote-avholdende" />
            </div>
          )}
        </button>

        {/* Mot button */}
        <button
          onClick={() => handleVote('mot')}
          disabled={submitting}
          className={cn(
            'relative flex flex-col items-center justify-center gap-2 py-5 rounded-2xl font-semibold transition-all ios-press',
            userVote === 'mot' 
              ? 'bg-vote-mot text-vote-mot-foreground shadow-lg shadow-vote-mot/30' 
              : 'bg-vote-mot/10 text-vote-mot hover:bg-vote-mot/20',
            animatingVote === 'mot' && 'animate-vote-success',
            submitting && 'opacity-50'
          )}
        >
          <ThumbsDown className={cn('h-6 w-6', userVote === 'mot' && 'animate-ios-bounce')} />
          <span className="text-sm">Mot</span>
          {userVote === 'mot' && (
            <div className="absolute -top-1 -right-1 h-5 w-5 bg-background rounded-full flex items-center justify-center">
              <Check className="h-3 w-3 text-vote-mot" />
            </div>
          )}
        </button>
      </div>
    </div>
  );
}