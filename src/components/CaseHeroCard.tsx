import { Users, Building2, Check, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import ResultBar from './ResultBar';
import KategoriBadge from './KategoriBadge';

interface CaseHeroCardProps {
  title: string;
  kategori?: string | null;
  imageUrl?: string | null;
  forCount: number;
  motCount: number;
  avholdendeCount?: number;
  stortingetFor?: number | null;
  stortingetMot?: number | null;
  stortingetAvholdende?: number | null;
  vedtatt?: boolean | null;
  className?: string;
  compact?: boolean;
}

export default function CaseHeroCard({
  title,
  kategori,
  imageUrl,
  forCount,
  motCount,
  avholdendeCount = 0,
  stortingetFor,
  stortingetMot,
  stortingetAvholdende,
  vedtatt,
  className,
  compact = false,
}: CaseHeroCardProps) {
  // Public votes
  const folkTotal = forCount + motCount + avholdendeCount;
  const folkForPercent = folkTotal > 0 ? Math.round((forCount / folkTotal) * 100) : 0;
  const folkMotPercent = folkTotal > 0 ? Math.round((motCount / folkTotal) * 100) : 0;
  const folkMajority = folkForPercent > folkMotPercent ? 'for' : folkForPercent < folkMotPercent ? 'mot' : 'likt';

  // Parliament votes
  const hasStortingetVotes = stortingetFor != null && stortingetMot != null && (stortingetFor > 0 || stortingetMot > 0);
  const stortingetMajority = hasStortingetVotes 
    ? (stortingetFor! > stortingetMot! ? 'for' : 'mot')
    : null;
  const isVedtatt = vedtatt ?? (stortingetFor != null && stortingetMot != null && stortingetFor > stortingetMot);

  // Agreement check
  const isAgreement = folkTotal > 0 && hasStortingetVotes && folkMajority === stortingetMajority;

  // Default gradient background based on category
  const getCategoryGradient = (kat?: string | null) => {
    switch (kat?.toLowerCase()) {
      case 'helse': return 'from-red-900/40 to-red-950/60';
      case 'justis': return 'from-blue-900/40 to-blue-950/60';
      case 'økonomi': return 'from-amber-900/40 to-amber-950/60';
      case 'miljø': return 'from-green-900/40 to-green-950/60';
      case 'utdanning': return 'from-purple-900/40 to-purple-950/60';
      default: return 'from-slate-900/40 to-slate-950/60';
    }
  };

  return (
    <div className={cn(
      "bg-card rounded-3xl overflow-hidden border border-border/50",
      className
    )}>
      {/* Hero Image / Gradient Background */}
      <div className={cn(
        "relative",
        compact ? "h-32" : "h-48"
      )}>
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className={cn(
            "w-full h-full bg-gradient-to-br",
            getCategoryGradient(kategori)
          )} />
        )}
        
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent" />
        
        {/* Category badge */}
        {kategori && (
          <div className="absolute top-4 left-4">
            <KategoriBadge kategori={kategori} />
          </div>
        )}
        
        {/* Vedtatt/Forkastet badge */}
        {hasStortingetVotes && (
          <div className={cn(
            "absolute top-4 right-4 px-3 py-1.5 rounded-full text-xs font-semibold",
            isVedtatt 
              ? "bg-vote-for/20 text-vote-for" 
              : "bg-vote-mot/20 text-vote-mot"
          )}>
            {isVedtatt ? 'Vedtatt' : 'Forkastet'}
          </div>
        )}
      </div>

      {/* Content */}
      <div className={cn(
        "p-5 space-y-4",
        compact && "p-4 space-y-3"
      )}>
        {/* Title */}
        <h2 className={cn(
          "font-bold leading-tight",
          compact ? "text-lg" : "text-xl"
        )}>
          {title}
        </h2>

        {/* Vote sections */}
        <div className={cn(
          "grid gap-4",
          hasStortingetVotes && !compact ? "grid-cols-2" : "grid-cols-1"
        )}>
          {/* Folket */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>Folket</span>
            </div>
            {folkTotal > 0 ? (
              <>
                <ResultBar 
                  forCount={forCount} 
                  motCount={motCount} 
                  avholdendeCount={avholdendeCount}
                  size={compact ? "sm" : "md"}
                  showPercentages={false}
                />
                <div className="flex justify-between text-sm font-semibold">
                  <span className="text-vote-for">For {folkForPercent}%</span>
                  <span className="text-vote-mot">Mot {folkMotPercent}%</span>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Ingen stemmer ennå</p>
            )}
          </div>

          {/* Stortinget */}
          {hasStortingetVotes && !compact && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Building2 className="h-4 w-4" />
                <span>Stortinget</span>
              </div>
              <ResultBar 
                forCount={stortingetFor!} 
                motCount={stortingetMot!} 
                avholdendeCount={stortingetAvholdende || 0}
                size="md"
                showPercentages={false}
              />
              <div className="flex justify-between text-sm font-semibold">
                <span className="text-vote-for">For {stortingetFor}</span>
                <span className="text-vote-mot">Mot {stortingetMot}</span>
              </div>
            </div>
          )}
        </div>

        {/* Agreement indicator */}
        {folkTotal > 0 && hasStortingetVotes && !compact && (
          <div className={cn(
            "flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold",
            isAgreement 
              ? "bg-vote-for/10 text-vote-for" 
              : "bg-vote-mot/10 text-vote-mot"
          )}>
            {isAgreement ? (
              <>
                <Check className="h-4 w-4" />
                <span>Folket er ENIG med Stortinget</span>
              </>
            ) : (
              <>
                <AlertTriangle className="h-4 w-4" />
                <span>Folket er UENIG med Stortinget</span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}