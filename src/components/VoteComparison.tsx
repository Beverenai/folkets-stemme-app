import { Users, Building2, CheckCircle, XCircle, Scale } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoteStats {
  for: number;
  mot: number;
  avholdende: number;
}

interface VoteComparisonProps {
  folkeStats: VoteStats & { total: number };
  stortingetStats: VoteStats;
  vedtak?: string | null;
}

export default function VoteComparison({ folkeStats, stortingetStats, vedtak }: VoteComparisonProps) {
  const stortingetTotal = stortingetStats.for + stortingetStats.mot + stortingetStats.avholdende;
  
  const folkeForPercent = folkeStats.total > 0 ? (folkeStats.for / folkeStats.total) * 100 : 0;
  const folkeMotPercent = folkeStats.total > 0 ? (folkeStats.mot / folkeStats.total) * 100 : 0;
  
  const stortingetForPercent = stortingetTotal > 0 ? (stortingetStats.for / stortingetTotal) * 100 : 0;
  const stortingetMotPercent = stortingetTotal > 0 ? (stortingetStats.mot / stortingetTotal) * 100 : 0;

  const folkeMajority = folkeForPercent > folkeMotPercent ? 'for' : folkeMotPercent > folkeForPercent ? 'mot' : 'likt';
  const stortingetMajority = stortingetForPercent > stortingetMotPercent ? 'for' : stortingetMotPercent > stortingetForPercent ? 'mot' : 'likt';
  
  const isAligned = folkeMajority === stortingetMajority;

  return (
    <div className="bg-card rounded-2xl border border-border p-6 animate-slide-up" style={{ animationDelay: '0.15s' }}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-xl font-semibold">
          Sammenligning
        </h2>
        <div
          className={cn(
            'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium',
            isAligned
              ? 'bg-success/10 text-success'
              : 'bg-destructive/10 text-destructive'
          )}
        >
          {isAligned ? (
            <>
              <CheckCircle className="h-4 w-4" />
              Samsvar
            </>
          ) : (
            <>
              <XCircle className="h-4 w-4" />
              Avvik
            </>
          )}
        </div>
      </div>

      {/* Vedtak */}
      {vedtak && (
        <div className="bg-muted/50 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 text-sm font-medium mb-2">
            <Scale className="h-4 w-4" />
            Stortingets vedtak
          </div>
          <p className="text-sm text-muted-foreground">{vedtak}</p>
        </div>
      )}

      {/* Side by side comparison */}
      <div className="grid grid-cols-2 gap-6">
        {/* Folket */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="h-10 w-10 rounded-xl gradient-hero flex items-center justify-center">
              <Users className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold">Folket</h3>
              <p className="text-xs text-muted-foreground">{folkeStats.total} stemmer</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>For</span>
                <span className="font-medium">{Math.round(folkeForPercent)}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-vote-for transition-all"
                  style={{ width: `${folkeForPercent}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Mot</span>
                <span className="font-medium">{Math.round(folkeMotPercent)}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-vote-mot transition-all"
                  style={{ width: `${folkeMotPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Stortinget */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="h-10 w-10 rounded-xl gradient-secondary flex items-center justify-center">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold">Stortinget</h3>
              <p className="text-xs text-muted-foreground">{stortingetTotal} stemmer</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>For</span>
                <span className="font-medium">{Math.round(stortingetForPercent)}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-vote-for transition-all"
                  style={{ width: `${stortingetForPercent}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Mot</span>
                <span className="font-medium">{Math.round(stortingetMotPercent)}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-vote-mot transition-all"
                  style={{ width: `${stortingetMotPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Difference indicator */}
      <div className="mt-6 pt-6 border-t border-border">
        <div className="flex items-center justify-center gap-2 text-sm">
          <span className="text-muted-foreground">Forskjell i «For»-stemmer:</span>
          <span
            className={cn(
              'font-semibold',
              Math.abs(folkeForPercent - stortingetForPercent) < 10
                ? 'text-success'
                : Math.abs(folkeForPercent - stortingetForPercent) < 25
                ? 'text-warning'
                : 'text-destructive'
            )}
          >
            {Math.abs(Math.round(folkeForPercent - stortingetForPercent))} prosentpoeng
          </span>
        </div>
      </div>
    </div>
  );
}
