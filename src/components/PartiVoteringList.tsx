import { getPartiConfig } from '@/lib/partiConfig';

interface PartiVote {
  parti_forkortelse: string;
  parti_navn: string;
  stemmer_for: number;
  stemmer_mot: number;
  stemmer_avholdende: number;
}

interface PartiVoteringListProps {
  partiVotes: PartiVote[];
}

export default function PartiVoteringList({ partiVotes }: PartiVoteringListProps) {
  if (!partiVotes || partiVotes.length === 0) {
    return null;
  }

  // Sort by total votes descending
  const sorted = [...partiVotes].sort((a, b) => {
    const totalA = a.stemmer_for + a.stemmer_mot + a.stemmer_avholdende;
    const totalB = b.stemmer_for + b.stemmer_mot + b.stemmer_avholdende;
    return totalB - totalA;
  });

  return (
    <div className="space-y-3">
      {sorted.map((parti) => {
        const config = getPartiConfig(parti.parti_forkortelse);
        const total = parti.stemmer_for + parti.stemmer_mot + parti.stemmer_avholdende;
        const majorityVote = parti.stemmer_for >= parti.stemmer_mot ? 'for' : 'mot';
        
        return (
          <div 
            key={parti.parti_forkortelse} 
            className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50"
          >
            {/* Party badge */}
            <div 
              className="h-10 w-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
              style={{ backgroundColor: config.farge, color: config.tekstFarge }}
            >
              {config.forkortelse}
            </div>
            
            {/* Party name and votes */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm truncate">{config.navn}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  majorityVote === 'for' 
                    ? 'bg-vote-for/20 text-vote-for' 
                    : 'bg-vote-mot/20 text-vote-mot'
                }`}>
                  {majorityVote === 'for' ? 'For' : 'Mot'}
                </span>
              </div>
              
              {/* Vote breakdown */}
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                <span className="text-vote-for">{parti.stemmer_for} for</span>
                <span className="text-vote-mot">{parti.stemmer_mot} mot</span>
                {parti.stemmer_avholdende > 0 && (
                  <span className="text-vote-avholdende">{parti.stemmer_avholdende} avstår</span>
                )}
              </div>
            </div>
            
            {/* Vote ratio bar */}
            <div className="w-16 h-2 bg-secondary rounded-full overflow-hidden flex">
              {total > 0 && (
                <>
                  <div 
                    className="h-full bg-vote-for" 
                    style={{ width: `${(parti.stemmer_for / total) * 100}%` }}
                  />
                  <div 
                    className="h-full bg-vote-mot" 
                    style={{ width: `${(parti.stemmer_mot / total) * 100}%` }}
                  />
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
