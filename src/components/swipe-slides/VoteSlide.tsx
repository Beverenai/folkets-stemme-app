import { Link } from 'react-router-dom';
import { LogIn, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { triggerVoteConfetti } from '@/lib/confetti';
import { triggerHaptic } from '@/lib/haptics';

interface VoteSlideProps {
  spoersmaal: string | null;
  tittel: string;
  kortTittel: string | null;
  isLoggedIn: boolean;
  userVote: string | null;
  onVote: (vote: 'for' | 'mot') => void;
  isSubmitting: boolean;
}

export default function VoteSlide({ 
  spoersmaal,
  tittel, 
  kortTittel, 
  isLoggedIn, 
  userVote, 
  onVote,
  isSubmitting 
}: VoteSlideProps) {
  const selectedVote = userVote === 'for' ? 'enig' : userVote === 'mot' ? 'uenig' : null;
  const displayQuestion = spoersmaal || kortTittel || tittel;

  if (!isLoggedIn) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-4 pb-12">
        <div className="premium-card p-8 text-center w-full max-w-sm">
          <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-5">
            <LogIn className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold mb-2">Logg inn for å stemme</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Du må være innlogget for å avgi din stemme på denne saken.
          </p>
          <Link
            to="/auth"
            className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 ios-press"
          >
            <LogIn className="h-4 w-4" />
            Logg inn
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col px-4 pt-6 pb-12">
      <h2 className="text-sm font-medium text-muted-foreground mb-4">Stem på forslaget</h2>
      
      {/* Spørsmålet */}
      <div className="rounded-2xl bg-secondary/80 backdrop-blur-sm border border-border/50 p-5 mb-6 shadow-[0_2px_8px_rgba(0,0,0,0.1)]">
        <p className="text-lg font-semibold leading-tight">
          {displayQuestion}
        </p>
      </div>

      {/* Ja/Nei knapper */}
      <div className="space-y-3 mb-6">
        <button
          onClick={() => {
            triggerHaptic('success');
            triggerVoteConfetti();
            onVote('for');
          }}
          disabled={isSubmitting}
          className={cn(
            "w-full p-4 rounded-2xl border-2 flex items-center justify-between transition-all ios-press shadow-[0_2px_8px_rgba(0,0,0,0.08)]",
            selectedVote === 'enig' 
              ? "border-vote-for bg-vote-for/10 shadow-[0_4px_12px_rgba(52,199,89,0.2)]" 
              : "border-border bg-secondary/60 hover:border-muted-foreground hover:bg-secondary"
          )}
        >
          <span className="text-lg font-semibold">Enig</span>
          <div className={cn(
            "h-6 w-6 rounded-full border-2 flex items-center justify-center",
            selectedVote === 'enig' 
              ? "border-vote-for bg-vote-for" 
              : "border-muted-foreground"
          )}>
            {selectedVote === 'enig' && <Check className="h-4 w-4 text-white" />}
          </div>
        </button>

        <button
          onClick={() => {
            triggerHaptic('success');
            triggerVoteConfetti();
            onVote('mot');
          }}
          disabled={isSubmitting}
          className={cn(
            "w-full p-4 rounded-2xl border-2 flex items-center justify-between transition-all ios-press shadow-[0_2px_8px_rgba(0,0,0,0.08)]",
            selectedVote === 'uenig' 
              ? "border-vote-mot bg-vote-mot/10 shadow-[0_4px_12px_rgba(255,59,48,0.2)]" 
              : "border-border bg-secondary/60 hover:border-muted-foreground hover:bg-secondary"
          )}
        >
          <span className="text-lg font-semibold">Uenig</span>
          <div className={cn(
            "h-6 w-6 rounded-full border-2 flex items-center justify-center",
            selectedVote === 'uenig' 
              ? "border-vote-mot bg-vote-mot" 
              : "border-muted-foreground"
          )}>
            {selectedVote === 'uenig' && <Check className="h-4 w-4 text-white" />}
          </div>
        </button>
      </div>

      {userVote ? (
        <p className="text-xs text-center text-muted-foreground">
          Du kan endre stemmen din når som helst
        </p>
      ) : (
        <p className="text-sm text-center text-muted-foreground">
          Velg et alternativ ovenfor
        </p>
      )}
    </div>
  );
}
