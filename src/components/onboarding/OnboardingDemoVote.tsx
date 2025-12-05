import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Check, ThumbsUp, ThumbsDown, Sparkles } from 'lucide-react';
import { triggerSuccessConfetti } from '@/lib/confetti';

interface OnboardingDemoVoteProps {
  onComplete: () => void;
}

const DEMO_CASE = {
  question: 'Bør Norge øke støtten til fornybar energi?',
  category: 'Miljø',
  argumentsFor: [
    'Reduserer klimautslipp og bidrar til å nå klimamålene',
    'Skaper nye grønne arbeidsplasser',
  ],
  argumentsAgainst: [
    'Kan øke strømprisene på kort sikt',
    'Krever store investeringer fra staten',
  ],
};

export default function OnboardingDemoVote({ onComplete }: OnboardingDemoVoteProps) {
  const [selectedVote, setSelectedVote] = useState<'for' | 'mot' | null>(null);
  const [showResult, setShowResult] = useState(false);

  const handleVote = (vote: 'for' | 'mot') => {
    setSelectedVote(vote);
    triggerSuccessConfetti();
    setTimeout(() => {
      setShowResult(true);
    }, 500);
  };

  if (showResult) {
    return (
      <div className="flex flex-col items-center text-center px-4 animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-6">
          <Sparkles className="w-8 h-8 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold mb-4">Slik fungerer det!</h2>
        <p className="text-muted-foreground mb-6">
          Du stemte <span className="font-semibold text-foreground">
            {selectedVote === 'for' ? 'FOR' : 'MOT'}
          </span> forslaget. I den virkelige appen vil du se hvordan din stemme sammenligner med andre brukere og Stortinget.
        </p>
        
        <div className="w-full bg-card rounded-xl p-4 mb-6 border">
          <p className="text-sm text-muted-foreground mb-3">Demo-resultat:</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Folket:</span>
              <span className="font-medium">67% FOR</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div className="h-full w-[67%] bg-green-500 rounded-full" />
            </div>
            <div className="flex items-center justify-between text-sm mt-3">
              <span>Stortinget:</span>
              <span className="font-medium">72% FOR</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div className="h-full w-[72%] bg-primary rounded-full" />
            </div>
          </div>
        </div>

        <button
          onClick={onComplete}
          className="w-full h-14 rounded-full bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2"
        >
          <Check className="w-5 h-5" />
          Fortsett
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col px-4 animate-fade-in">
      <div className="text-center mb-6">
        <span className="inline-block px-3 py-1 bg-primary/10 text-primary text-sm font-medium rounded-full mb-3">
          Prøv selv!
        </span>
        <h2 className="text-xl font-bold">Gi din første stemme</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Dette er en demo - stemmen lagres ikke
        </p>
      </div>

      <div className="bg-card rounded-xl p-5 border mb-6">
        <span className="text-xs text-muted-foreground uppercase tracking-wide">
          {DEMO_CASE.category}
        </span>
        <h3 className="text-lg font-semibold mt-1 mb-4">{DEMO_CASE.question}</h3>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="space-y-2">
            <p className="text-xs font-medium text-green-600">Argumenter for:</p>
            {DEMO_CASE.argumentsFor.map((arg, i) => (
              <p key={i} className="text-xs text-muted-foreground">• {arg}</p>
            ))}
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium text-red-600">Argumenter mot:</p>
            {DEMO_CASE.argumentsAgainst.map((arg, i) => (
              <p key={i} className="text-xs text-muted-foreground">• {arg}</p>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => handleVote('for')}
          className={cn(
            'h-14 rounded-full font-semibold flex items-center justify-center gap-2 transition-all',
            'bg-green-500/10 text-green-600 border-2 border-green-500/30',
            'hover:bg-green-500 hover:text-white hover:border-green-500',
            selectedVote === 'for' && 'bg-green-500 text-white border-green-500'
          )}
        >
          <ThumbsUp className="w-5 h-5" />
          Enig
        </button>
        <button
          onClick={() => handleVote('mot')}
          className={cn(
            'h-14 rounded-full font-semibold flex items-center justify-center gap-2 transition-all',
            'bg-red-500/10 text-red-600 border-2 border-red-500/30',
            'hover:bg-red-500 hover:text-white hover:border-red-500',
            selectedVote === 'mot' && 'bg-red-500 text-white border-red-500'
          )}
        >
          <ThumbsDown className="w-5 h-5" />
          Uenig
        </button>
      </div>
    </div>
  );
}
