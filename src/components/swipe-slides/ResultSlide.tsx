import { Link } from 'react-router-dom';
import { Share2, Users, Building2, CheckCircle, XCircle, TrendingUp, TrendingDown, ChevronRight } from 'lucide-react';
import PartiVoteringList from '@/components/PartiVoteringList';
import RepresentantVoteList from '@/components/RepresentantVoteList';
import { cn } from '@/lib/utils';
import { PartiVote, RepresentantVote, VoteStats } from '@/types';

interface ResultSlideProps {
  sakId: string;
  userVote: string | null;
  voteStats: VoteStats;
  stortingetFor: number | null;
  stortingetMot: number | null;
  stortingetAvholdende: number | null;
  partiVotes?: PartiVote[];
  representantVotes?: RepresentantVote[];
  onShare: () => void;
}

// Animated progress bar component
function AnimatedBar({ 
  percentage, 
  color, 
  delay = 0 
}: { 
  percentage: number; 
  color: 'for' | 'mot'; 
  delay?: number;
}) {
  return (
    <div 
      className={cn(
        "h-2 rounded-full transition-all duration-700 ease-out",
        color === 'for' ? 'bg-vote-for' : 'bg-vote-mot'
      )}
      style={{ 
        width: `${percentage}%`,
        transitionDelay: `${delay}ms`
      }}
    />
  );
}

// Stat display component
function StatDisplay({ 
  label, 
  value, 
  percentage, 
  color,
  icon: Icon
}: { 
  label: string; 
  value: number; 
  percentage: number;
  color: 'for' | 'mot' | 'neutral';
  icon?: React.ElementType;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {Icon && (
          <div className={cn(
            "h-8 w-8 rounded-full flex items-center justify-center",
            color === 'for' ? 'bg-vote-for/20' : color === 'mot' ? 'bg-vote-mot/20' : 'bg-muted'
          )}>
            <Icon className={cn(
              "h-4 w-4",
              color === 'for' ? 'text-vote-for' : color === 'mot' ? 'text-vote-mot' : 'text-muted-foreground'
            )} />
          </div>
        )}
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={cn(
          "text-xl font-bold tabular-nums",
          color === 'for' ? 'text-vote-for' : color === 'mot' ? 'text-vote-mot' : 'text-foreground'
        )}>
          {percentage}%
        </span>
        <span className="text-xs text-muted-foreground">({value})</span>
      </div>
    </div>
  );
}

export default function ResultSlide({ 
  sakId,
  userVote, 
  voteStats, 
  stortingetFor,
  stortingetMot,
  stortingetAvholdende,
  partiVotes = [],
  representantVotes = [],
  onShare 
}: ResultSlideProps) {
  const hasStortingetVotes = (stortingetFor || 0) > 0 || (stortingetMot || 0) > 0;
  const vedtatt = (stortingetFor || 0) > (stortingetMot || 0);

  // Calculate percentages
  const folketForPct = voteStats.total > 0 ? Math.round((voteStats.for / voteStats.total) * 100) : 0;
  const folketMotPct = voteStats.total > 0 ? Math.round((voteStats.mot / voteStats.total) * 100) : 0;
  
  const stortingetTotal = (stortingetFor || 0) + (stortingetMot || 0) + (stortingetAvholdende || 0);
  const stortingetForPct = stortingetTotal > 0 ? Math.round(((stortingetFor || 0) / stortingetTotal) * 100) : 0;
  const stortingetMotPct = stortingetTotal > 0 ? Math.round(((stortingetMot || 0) / stortingetTotal) * 100) : 0;

  // Calculate if public agrees with Stortinget
  const folketVedtatt = voteStats.for > voteStats.mot;
  const agreement = hasStortingetVotes && voteStats.total > 0 
    ? folketVedtatt === vedtatt 
    : null;

  return (
    <div className="h-full flex flex-col px-4 pt-5 pb-16 overflow-y-auto ios-scroll">
      {/* Success header */}
      {userVote && (
        <div className="text-center mb-5">
          <div className="h-12 w-12 rounded-full bg-vote-for/20 flex items-center justify-center mx-auto mb-2 animate-ios-spring">
            <CheckCircle className="h-6 w-6 text-vote-for" />
          </div>
          <h2 className="text-lg font-bold">Takk for din stemme!</h2>
          <p className="text-xs text-muted-foreground">
            Du stemte <span className={userVote === 'for' ? 'text-vote-for font-semibold' : 'text-vote-mot font-semibold'}>
              {userVote === 'for' ? 'Enig' : 'Uenig'}
            </span>
          </p>
        </div>
      )}

      {/* Combined results card */}
      <div className="rounded-2xl bg-secondary/80 backdrop-blur-sm border border-border/50 p-4 mb-4 shadow-[0_2px_8px_rgba(0,0,0,0.1)]">
        {/* Folket section */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Folket</span>
            <span className="text-xs text-muted-foreground ml-auto">{voteStats.total} stemmer</span>
          </div>
          
          {voteStats.total > 0 ? (
            <>
              <div className="flex gap-1 h-3 rounded-full overflow-hidden bg-muted/50 mb-2">
                <AnimatedBar percentage={folketForPct} color="for" delay={100} />
                <AnimatedBar percentage={folketMotPct} color="mot" delay={200} />
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-vote-for font-semibold">{folketForPct}% Enig</span>
                <span className="text-vote-mot font-semibold">{folketMotPct}% Uenig</span>
              </div>
            </>
          ) : (
            <p className="text-center text-muted-foreground text-xs py-2">
              Ingen har stemt ennå
            </p>
          )}
        </div>

        {/* Divider */}
        {hasStortingetVotes && (
          <div className="border-t border-border/50 my-4" />
        )}

        {/* Stortinget section */}
        {hasStortingetVotes && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Stortinget</span>
              <div className={cn(
                "ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide",
                vedtatt ? "bg-vote-for/20 text-vote-for" : "bg-vote-mot/20 text-vote-mot"
              )}>
                {vedtatt ? 'Vedtatt' : 'Avvist'}
              </div>
            </div>
            
            <div className="flex gap-1 h-3 rounded-full overflow-hidden bg-muted/50 mb-2">
              <AnimatedBar percentage={stortingetForPct} color="for" delay={300} />
              <AnimatedBar percentage={stortingetMotPct} color="mot" delay={400} />
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-vote-for font-semibold">{stortingetFor} for</span>
              <span className="text-vote-mot font-semibold">{stortingetMot} mot</span>
            </div>
          </div>
        )}
      </div>

      {/* Agreement indicator */}
      {agreement !== null && voteStats.total >= 3 && (
        <div className={cn(
          "flex items-center justify-center gap-2 p-3 rounded-2xl mb-4 border",
          agreement 
            ? "bg-vote-for/10 border-vote-for/30" 
            : "bg-vote-mot/10 border-vote-mot/30"
        )}>
          {agreement ? (
            <TrendingUp className="h-4 w-4 text-vote-for" />
          ) : (
            <TrendingDown className="h-4 w-4 text-vote-mot" />
          )}
          <p className={cn(
            "text-sm font-semibold",
            agreement ? "text-vote-for" : "text-vote-mot"
          )}>
            {agreement 
              ? "Folket enig med Stortinget" 
              : "Folket uenig med Stortinget"
            }
          </p>
        </div>
      )}

      {/* Party votes - collapsed */}
      {partiVotes.length > 0 && (
        <div className="rounded-2xl bg-secondary/80 backdrop-blur-sm border border-border/50 p-4 mb-4 shadow-[0_2px_8px_rgba(0,0,0,0.1)]">
          <h3 className="text-sm font-semibold mb-3">Slik stemte partiene</h3>
          <PartiVoteringList partiVotes={partiVotes} />
        </div>
      )}

      {/* Link to politician votes */}
      <Link
        to={`/sak/${sakId}`}
        className="w-full py-3 rounded-2xl bg-secondary/80 backdrop-blur-sm border border-border/50 font-semibold flex items-center justify-center gap-2 ios-press mb-3 shadow-[0_2px_8px_rgba(0,0,0,0.1)]"
      >
        Se hvordan politikerne stemte
        <ChevronRight className="h-4 w-4" />
      </Link>

      {/* Share button */}
      <button
        onClick={onShare}
        className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 ios-press mt-auto shadow-[0_4px_12px_rgba(0,199,190,0.3)]"
      >
        <Share2 className="h-5 w-5" />
        Del resultat
      </button>
    </div>
  );
}
