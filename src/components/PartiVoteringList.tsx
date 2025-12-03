import { getPartiConfig } from '@/lib/partiConfig';
import { cn } from '@/lib/utils';

interface PartiVote {
  parti_forkortelse: string;
  parti_navn: string;
  stemmer_for: number;
  stemmer_mot: number;
  stemmer_avholdende: number;
}

interface PartiVoteringListProps {
  partiVotes: PartiVote[];
  voteringCount?: number;
}

// Standard party order (by size in Stortinget)
const PARTY_ORDER = ['A', 'H', 'SP', 'FRP', 'SV', 'R', 'V', 'MDG', 'KRF', 'PF'];

export default function PartiVoteringList({ partiVotes, voteringCount }: PartiVoteringListProps) {
  if (!partiVotes || partiVotes.length === 0) {
    return null;
  }

  // Determine stance for each party based on majority vote
  const partiesWithStance = partiVotes
    .filter(p => p.parti_forkortelse !== 'Uav') // Filter out independent
    .map((parti) => {
      const config = getPartiConfig(parti.parti_forkortelse);
      const total = parti.stemmer_for + parti.stemmer_mot + parti.stemmer_avholdende;
      
      // Determine stance based on majority
      let stance: 'for' | 'mot' | 'delt' = 'delt';
      if (parti.stemmer_for > parti.stemmer_mot) {
        stance = 'for';
      } else if (parti.stemmer_mot > parti.stemmer_for) {
        stance = 'mot';
      }
      
      // Calculate percentage
      const forPercent = total > 0 ? Math.round((parti.stemmer_for / total) * 100) : 0;
      const motPercent = total > 0 ? Math.round((parti.stemmer_mot / total) * 100) : 0;
      
      return {
        ...parti,
        config,
        stance,
        total,
        forPercent,
        motPercent,
      };
    });

  // Sort by party order
  const sortByOrder = (a: typeof partiesWithStance[0], b: typeof partiesWithStance[0]) => {
    const aKey = a.parti_forkortelse.toUpperCase();
    const bKey = b.parti_forkortelse.toUpperCase();
    const aIndex = PARTY_ORDER.indexOf(aKey);
    const bIndex = PARTY_ORDER.indexOf(bKey);
    return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex);
  };

  const forParties = partiesWithStance.filter(p => p.stance === 'for').sort(sortByOrder);
  const motParties = partiesWithStance.filter(p => p.stance === 'mot').sort(sortByOrder);

  return (
    <div className="space-y-5">
      {/* Summary - NRK inspired grouped view */}
      <div className="flex items-stretch gap-4 p-4 bg-secondary/30 rounded-2xl">
        {/* For side */}
        <div className="flex-1 flex flex-col">
          <span className="text-xs font-semibold text-vote-for uppercase tracking-wide mb-3">
            Flertall for
          </span>
          <div className="flex flex-wrap gap-2">
            {forParties.map(p => (
              <div
                key={p.parti_forkortelse}
                className="h-11 w-11 rounded-lg flex items-center justify-center text-xs font-bold shadow-sm"
                style={{ backgroundColor: p.config.farge, color: p.config.tekstFarge }}
                title={`${p.config.navn}: ${p.forPercent}% for`}
              >
                {p.config.forkortelse}
              </div>
            ))}
            {forParties.length === 0 && (
              <span className="text-xs text-muted-foreground">Ingen</span>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="w-px bg-border/50 self-stretch" />

        {/* Mot side */}
        <div className="flex-1 flex flex-col items-end">
          <span className="text-xs font-semibold text-vote-mot uppercase tracking-wide mb-3">
            Flertall mot
          </span>
          <div className="flex flex-wrap gap-2 justify-end">
            {motParties.map(p => (
              <div
                key={p.parti_forkortelse}
                className="h-11 w-11 rounded-lg flex items-center justify-center text-xs font-bold shadow-sm"
                style={{ backgroundColor: p.config.farge, color: p.config.tekstFarge }}
                title={`${p.config.navn}: ${p.motPercent}% mot`}
              >
                {p.config.forkortelse}
              </div>
            ))}
            {motParties.length === 0 && (
              <span className="text-xs text-muted-foreground">Ingen</span>
            )}
          </div>
        </div>
      </div>

      {/* Note about data */}
      {voteringCount && voteringCount > 1 && (
        <p className="text-[11px] text-muted-foreground text-center">
          Basert på {voteringCount} voteringer i denne saken
        </p>
      )}

      {/* Detailed breakdown */}
      <div className="space-y-1">
        {partiesWithStance.sort(sortByOrder).map((parti) => (
          <div 
            key={parti.parti_forkortelse}
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/30 transition-colors"
          >
            {/* Party badge */}
            <div
              className="h-12 w-12 rounded-full flex items-center justify-center text-sm font-bold shrink-0 shadow-sm"
              style={{ backgroundColor: parti.config.farge, color: parti.config.tekstFarge }}
            >
              {parti.config.forkortelse}
            </div>

            {/* Party name and stance */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-[15px] truncate">{parti.config.navn}</span>
                <span
                  className={cn(
                    'text-xs px-2 py-0.5 rounded font-semibold shrink-0',
                    parti.stance === 'for' && 'bg-vote-for/20 text-vote-for',
                    parti.stance === 'mot' && 'bg-vote-mot/20 text-vote-mot',
                    parti.stance === 'delt' && 'bg-vote-avholdende/20 text-vote-avholdende'
                  )}
                >
                  {parti.stance === 'for' ? 'For' : parti.stance === 'mot' ? 'Mot' : 'Delt'}
                </span>
              </div>

              {/* Percentage display */}
              <p className="text-xs text-muted-foreground">
                <span className="text-vote-for font-medium">{parti.forPercent}% for</span>
                <span className="mx-2">•</span>
                <span className="text-vote-mot font-medium">{parti.motPercent}% mot</span>
              </p>
            </div>

            {/* Vote ratio bar - wider for better visibility */}
            <div className="w-24 h-3 bg-secondary rounded-full overflow-hidden flex shrink-0">
              {parti.total > 0 && (
                <>
                  <div
                    className="h-full bg-vote-for transition-all"
                    style={{ width: `${parti.forPercent}%` }}
                  />
                  <div
                    className="h-full bg-vote-mot transition-all"
                    style={{ width: `${parti.motPercent}%` }}
                  />
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
