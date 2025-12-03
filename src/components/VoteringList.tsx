import { CheckCircle, XCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

interface Votering {
  id: string;
  stortinget_votering_id: string;
  forslag_tekst: string | null;
  votering_dato: string | null;
  vedtatt: boolean | null;
  resultat_for: number | null;
  resultat_mot: number | null;
  resultat_avholdende: number | null;
}

interface VoteringListProps {
  voteringer: Votering[];
  mainVoteringId?: string;
}

export default function VoteringList({ voteringer, mainVoteringId }: VoteringListProps) {
  if (!voteringer || voteringer.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {voteringer.map((votering) => {
        const isMain = votering.id === mainVoteringId;
        const forCount = votering.resultat_for || 0;
        const motCount = votering.resultat_mot || 0;
        const total = forCount + motCount;
        const forPercent = total > 0 ? Math.round((forCount / total) * 100) : 0;
        
        return (
          <Link
            key={votering.id}
            to={`/votering/${votering.id}`}
            className={cn(
              "block p-4 rounded-xl transition-all ios-press",
              isMain 
                ? "bg-primary/10 border border-primary/20" 
                : "bg-secondary/50 hover:bg-secondary"
            )}
          >
            <div className="flex items-start gap-3">
              {/* Status icon */}
              <div className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                votering.vedtatt === true && "bg-vote-for/20 text-vote-for",
                votering.vedtatt === false && "bg-vote-mot/20 text-vote-mot",
                votering.vedtatt === null && "bg-secondary text-muted-foreground"
              )}>
                {votering.vedtatt === true && <CheckCircle className="h-4 w-4" />}
                {votering.vedtatt === false && <XCircle className="h-4 w-4" />}
                {votering.vedtatt === null && <Clock className="h-4 w-4" />}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {isMain && (
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-primary bg-primary/10 px-2 py-0.5 rounded">
                      Hovedvotering
                    </span>
                  )}
                  <span className={cn(
                    "text-[10px] font-medium px-2 py-0.5 rounded",
                    votering.vedtatt === true && "bg-vote-for/20 text-vote-for",
                    votering.vedtatt === false && "bg-vote-mot/20 text-vote-mot",
                    votering.vedtatt === null && "bg-secondary text-muted-foreground"
                  )}>
                    {votering.vedtatt === true ? 'Vedtatt' : votering.vedtatt === false ? 'Forkastet' : 'Ukjent'}
                  </span>
                </div>
                
                <p className="text-sm font-medium line-clamp-2 mb-2">
                  {votering.forslag_tekst || 'Ingen beskrivelse'}
                </p>

                {/* Vote counts */}
                {total > 0 && (
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-vote-for font-semibold">{forCount} for</span>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-vote-mot font-semibold">{motCount} mot</span>
                    
                    {/* Mini bar */}
                    <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden max-w-20">
                      <div 
                        className="h-full bg-vote-for"
                        style={{ width: `${forPercent}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
