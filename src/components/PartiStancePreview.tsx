import { getPartiConfig, PARTI_CONFIG } from '@/lib/partiConfig';
import { PartiVote } from '@/types';

interface PartiStancePreviewProps {
  partiVoteringer: PartiVote[];
  compact?: boolean;
}

// Fixed party order for consistent display
const PARTY_ORDER = ['A', 'H', 'SP', 'FRP', 'SV', 'R', 'MDG', 'KRF', 'V', 'PF'];

export default function PartiStancePreview({ partiVoteringer, compact = true }: PartiStancePreviewProps) {
  if (!partiVoteringer || partiVoteringer.length === 0) {
    return null;
  }

  // Determine stance for each party
  const partyStances = partiVoteringer.map(pv => {
    const total = pv.stemmer_for + pv.stemmer_mot + pv.stemmer_avholdende;
    let stance: 'for' | 'mot' | 'delt' = 'delt';
    
    if (total > 0) {
      if (pv.stemmer_for > pv.stemmer_mot && pv.stemmer_for > pv.stemmer_avholdende) {
        stance = 'for';
      } else if (pv.stemmer_mot > pv.stemmer_for && pv.stemmer_mot > pv.stemmer_avholdende) {
        stance = 'mot';
      }
    }
    
    return {
      parti: pv.parti_forkortelse.toUpperCase(),
      stance,
      config: getPartiConfig(pv.parti_forkortelse),
    };
  });

  // Sort by defined order
  partyStances.sort((a, b) => {
    const aIndex = PARTY_ORDER.indexOf(a.parti);
    const bIndex = PARTY_ORDER.indexOf(b.parti);
    return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex);
  });

  const forParties = partyStances.filter(p => p.stance === 'for');
  const motParties = partyStances.filter(p => p.stance === 'mot');

  if (compact) {
    return (
      <div className="flex items-center gap-3 text-[10px]">
        {forParties.length > 0 && (
          <div className="flex items-center gap-1">
            <span className="text-vote-for font-medium">For:</span>
            <div className="flex items-center gap-0.5">
              {forParties.slice(0, 5).map(p => (
                <span
                  key={p.parti}
                  className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[8px] font-bold"
                  style={{ backgroundColor: p.config.farge, color: p.config.tekstFarge }}
                  title={p.config.navn}
                >
                  {p.config.forkortelse.charAt(0)}
                </span>
              ))}
              {forParties.length > 5 && (
                <span className="text-muted-foreground ml-0.5">+{forParties.length - 5}</span>
              )}
            </div>
          </div>
        )}
        {motParties.length > 0 && (
          <div className="flex items-center gap-1">
            <span className="text-vote-mot font-medium">Mot:</span>
            <div className="flex items-center gap-0.5">
              {motParties.slice(0, 5).map(p => (
                <span
                  key={p.parti}
                  className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[8px] font-bold"
                  style={{ backgroundColor: p.config.farge, color: p.config.tekstFarge }}
                  title={p.config.navn}
                >
                  {p.config.forkortelse.charAt(0)}
                </span>
              ))}
              {motParties.length > 5 && (
                <span className="text-muted-foreground ml-0.5">+{motParties.length - 5}</span>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Non-compact version for featured cards
  return (
    <div className="space-y-2">
      {forParties.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-vote-for font-semibold w-8">For</span>
          <div className="flex items-center gap-1 flex-wrap">
            {forParties.map(p => (
              <span
                key={p.parti}
                className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-semibold"
                style={{ backgroundColor: p.config.farge, color: p.config.tekstFarge }}
              >
                {p.config.forkortelse}
              </span>
            ))}
          </div>
        </div>
      )}
      {motParties.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-vote-mot font-semibold w-8">Mot</span>
          <div className="flex items-center gap-1 flex-wrap">
            {motParties.map(p => (
              <span
                key={p.parti}
                className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-semibold"
                style={{ backgroundColor: p.config.farge, color: p.config.tekstFarge }}
              >
                {p.config.forkortelse}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
