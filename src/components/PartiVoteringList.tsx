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
    .filter(p => p.parti_forkortelse !== 'Uav')
    .map((parti) => {
      const config = getPartiConfig(parti.parti_forkortelse);
      
      // Determine stance based on majority
      let stance: 'for' | 'mot' | 'delt' = 'delt';
      if (parti.stemmer_for > parti.stemmer_mot) {
        stance = 'for';
      } else if (parti.stemmer_mot > parti.stemmer_for) {
        stance = 'mot';
      }
      
      return {
        ...parti,
        config,
        stance,
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

  // Calculate totals for the header
  const totalFor = forParties.reduce((sum, p) => sum + p.stemmer_for, 0);
  const totalMot = motParties.reduce((sum, p) => sum + p.stemmer_mot, 0);

  return (
    <div className="space-y-6">
      {/* NRK-inspired grouped view */}
      <div className="flex items-stretch gap-4">
        {/* For side */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg font-bold text-vote-for">{totalFor}</span>
            <span className="text-xs font-semibold text-vote-for uppercase tracking-wide">
              For
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {forParties.map(p => (
              <div
                key={p.parti_forkortelse}
                className="flex flex-col items-center"
              >
                <div
                  className="h-10 w-10 rounded-lg flex items-center justify-center text-[11px] font-bold shadow-sm"
                  style={{ backgroundColor: p.config.farge, color: p.config.tekstFarge }}
                  title={p.config.navn}
                >
                  {p.config.forkortelse}
                </div>
                <span className="text-[10px] font-semibold text-vote-for mt-1">
                  {p.stemmer_for}
                </span>
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
        <div className="flex-1">
          <div className="flex items-center justify-end gap-2 mb-3">
            <span className="text-xs font-semibold text-vote-mot uppercase tracking-wide">
              Mot
            </span>
            <span className="text-lg font-bold text-vote-mot">{totalMot}</span>
          </div>
          <div className="flex flex-wrap gap-1.5 justify-end">
            {motParties.map(p => (
              <div
                key={p.parti_forkortelse}
                className="flex flex-col items-center"
              >
                <div
                  className="h-10 w-10 rounded-lg flex items-center justify-center text-[11px] font-bold shadow-sm"
                  style={{ backgroundColor: p.config.farge, color: p.config.tekstFarge }}
                  title={p.config.navn}
                >
                  {p.config.forkortelse}
                </div>
                <span className="text-[10px] font-semibold text-vote-mot mt-1">
                  {p.stemmer_mot}
                </span>
              </div>
            ))}
            {motParties.length === 0 && (
              <span className="text-xs text-muted-foreground">Ingen</span>
            )}
          </div>
        </div>
      </div>

      {/* Note about multiple voteringer */}
      {voteringCount && voteringCount > 1 && (
        <p className="text-[11px] text-muted-foreground text-center">
          Viser stemmer fra hovedvoteringen. Se alle {voteringCount} voteringer nedenfor.
        </p>
      )}

      {/* Detailed breakdown - compact list */}
      <div className="space-y-1 pt-2 border-t border-border/50">
        <p className="text-xs font-medium text-muted-foreground mb-2">Detaljert oversikt</p>
        {partiesWithStance.sort(sortByOrder).map((parti) => (
          <div 
            key={parti.parti_forkortelse}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/30 transition-colors"
          >
            {/* Party badge */}
            <div
              className="h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
              style={{ backgroundColor: parti.config.farge, color: parti.config.tekstFarge }}
            >
              {parti.config.forkortelse}
            </div>

            {/* Party name */}
            <span className="flex-1 text-sm font-medium truncate">{parti.config.navn}</span>

            {/* Vote counts */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-vote-for font-semibold w-6 text-right">{parti.stemmer_for}</span>
              <span className="text-muted-foreground">-</span>
              <span className="text-vote-mot font-semibold w-6">{parti.stemmer_mot}</span>
            </div>

            {/* Stance badge */}
            <span
              className={cn(
                'text-[10px] px-2 py-0.5 rounded font-semibold shrink-0 w-10 text-center',
                parti.stance === 'for' && 'bg-vote-for/20 text-vote-for',
                parti.stance === 'mot' && 'bg-vote-mot/20 text-vote-mot',
                parti.stance === 'delt' && 'bg-vote-avholdende/20 text-vote-avholdende'
              )}
            >
              {parti.stance === 'for' ? 'For' : parti.stance === 'mot' ? 'Mot' : 'Delt'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
