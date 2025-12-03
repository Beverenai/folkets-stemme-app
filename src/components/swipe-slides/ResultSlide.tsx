import { Share2, Users, Building2, CheckCircle, XCircle } from 'lucide-react';
import ResultBar from '@/components/ResultBar';
import { cn } from '@/lib/utils';

interface ResultSlideProps {
  userVote: string | null;
  voteStats: {
    for: number;
    mot: number;
    avholdende: number;
    total: number;
  };
  stortingetFor: number | null;
  stortingetMot: number | null;
  stortingetAvholdende: number | null;
  onShare: () => void;
}

export default function ResultSlide({ 
  userVote, 
  voteStats, 
  stortingetFor,
  stortingetMot,
  stortingetAvholdende,
  onShare 
}: ResultSlideProps) {
  const hasStortingetVotes = (stortingetFor || 0) > 0 || (stortingetMot || 0) > 0;
  const vedtatt = (stortingetFor || 0) > (stortingetMot || 0);

  // Calculate if public agrees with Stortinget
  const folketVedtatt = voteStats.for > voteStats.mot;
  const agreement = hasStortingetVotes && voteStats.total > 0 
    ? folketVedtatt === vedtatt 
    : null;

  return (
    <div className="h-full flex flex-col px-4 pt-6 pb-20 overflow-y-auto">
      {userVote && (
        <div className="text-center mb-6">
          <div className="h-14 w-14 rounded-full bg-vote-for/20 flex items-center justify-center mx-auto mb-3">
            <CheckCircle className="h-7 w-7 text-vote-for" />
          </div>
          <h2 className="text-xl font-bold">Takk for din stemme!</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Du stemte {userVote === 'for' ? 'Ja' : userVote === 'mot' ? 'Nei' : 'Avholdende'}
          </p>
        </div>
      )}

      {/* Public votes */}
      <div className="premium-card p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Folkets stemmer</h3>
          </div>
          <span className="text-sm text-muted-foreground">{voteStats.total} stemmer</span>
        </div>
        
        {voteStats.total > 0 ? (
          <ResultBar 
            forCount={voteStats.for}
            motCount={voteStats.mot}
            avholdendeCount={voteStats.avholdende}
            size="lg"
            showLabels
          />
        ) : (
          <p className="text-center text-muted-foreground text-sm py-4">
            Ingen har stemt ennå
          </p>
        )}
      </div>

      {/* Stortinget result */}
      {hasStortingetVotes && (
        <div className="premium-card p-5 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Stortingets vedtak</h3>
          </div>
          
          <div className={cn(
            "p-3 rounded-xl mb-4 flex items-center gap-3",
            vedtatt ? "bg-vote-for/10" : "bg-vote-mot/10"
          )}>
            {vedtatt ? (
              <CheckCircle className="h-5 w-5 text-vote-for flex-shrink-0" />
            ) : (
              <XCircle className="h-5 w-5 text-vote-mot flex-shrink-0" />
            )}
            <p className={cn(
              "font-semibold",
              vedtatt ? "text-vote-for" : "text-vote-mot"
            )}>
              {vedtatt ? 'Vedtatt' : 'Forkastet'} ({stortingetFor}–{stortingetMot})
            </p>
          </div>

          <ResultBar 
            forCount={stortingetFor || 0}
            motCount={stortingetMot || 0}
            avholdendeCount={stortingetAvholdende || 0}
            size="md"
            showLabels
          />
        </div>
      )}

      {/* Agreement indicator */}
      {agreement !== null && voteStats.total >= 3 && (
        <div className={cn(
          "p-4 rounded-xl mb-4 text-center",
          agreement ? "bg-vote-for/10" : "bg-vote-mot/10"
        )}>
          <p className={cn(
            "font-semibold",
            agreement ? "text-vote-for" : "text-vote-mot"
          )}>
            {agreement 
              ? "Folket er enig med Stortinget ✓" 
              : "Folket er uenig med Stortinget ✗"
            }
          </p>
        </div>
      )}

      {/* Share button */}
      <button
        onClick={onShare}
        className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 ios-press mt-auto"
      >
        <Share2 className="h-5 w-5" />
        Del resultat
      </button>
    </div>
  );
}
