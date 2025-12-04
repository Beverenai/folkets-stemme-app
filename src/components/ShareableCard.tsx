// ShareableCard component for sharing voting cards as images
import { getSakBildeUrl, getKategoriConfig } from '@/lib/kategoriConfig';
import { cn } from '@/lib/utils';
import { Building2 } from 'lucide-react';
import ResultBar from '@/components/ResultBar';

interface ShareableCardProps {
  sakId: string;
  spoersmaal: string | null;
  tittel: string;
  kortTittel: string | null;
  kategori: string | null;
  stortingetFor: number | null;
  stortingetMot: number | null;
  folkeFor: number;
  folkeMot: number;
}

export default function ShareableCard({
  sakId,
  spoersmaal,
  tittel,
  kortTittel,
  kategori,
  stortingetFor,
  stortingetMot,
  folkeFor,
  folkeMot,
}: ShareableCardProps) {
  const bildeUrl = getSakBildeUrl(kategori, sakId);
  const kategoriConfig = getKategoriConfig(kategori);
  const displayQuestion = spoersmaal || kortTittel || tittel;

  // Check if Stortinget has voted
  const stortingetTotal = (stortingetFor || 0) + (stortingetMot || 0);
  const hasStortingetVote = stortingetTotal > 0;

  // Check if folket has voted
  const folkeTotal = folkeFor + folkeMot;
  const hasFolkeVotes = folkeTotal > 0;

  // Calculate agreement
  const stortingetForPercent = hasStortingetVote ? (stortingetFor || 0) / stortingetTotal * 100 : 0;
  const folkeForPercent = hasFolkeVotes ? folkeFor / folkeTotal * 100 : 0;
  const stortingetVotedFor = stortingetForPercent > 50;
  const folkeVotedFor = folkeForPercent > 50;
  const isEnig = hasStortingetVote && hasFolkeVotes && stortingetVotedFor === folkeVotedFor;

  return (
    <div 
      className="relative w-[340px] h-[480px] rounded-[2rem] overflow-hidden bg-black"
      style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}
    >
      {/* Background image */}
      <div className="absolute inset-0">
        <img 
          src={bildeUrl} 
          alt="" 
          className="w-full h-full object-cover"
          crossOrigin="anonymous"
        />
        {/* Category gradient overlay */}
        <div className={cn(
          "absolute inset-0 bg-gradient-to-t",
          kategoriConfig.gradient,
          "opacity-70"
        )} />
        {/* Dark gradient for text */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col p-5">
        {/* Top metadata */}
        <div className="flex items-center gap-2 text-white/70 mb-4">
          <Building2 className="h-4 w-4" />
          <span className="text-xs font-medium">Stortinget</span>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Category badge */}
        {kategori && (
          <span className="inline-flex self-start px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-sm text-white text-xs font-semibold border border-white/20 mb-3">
            {kategori}
          </span>
        )}

        {/* Question */}
        <h2 className="text-xl font-bold text-white leading-tight mb-4 line-clamp-3">
          {displayQuestion}
        </h2>

        {/* Stortingets vedtak */}
        {hasStortingetVote && (
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-medium text-white/70">🏛️ Stortingets vedtak</span>
            </div>
            <ResultBar
              forCount={stortingetFor || 0}
              motCount={stortingetMot || 0}
              avholdendeCount={0}
              showLabels={false}
              showPercentages
              size="sm"
            />
          </div>
        )}

        {/* Folkets mening */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-medium text-white/70">👥 Folkets mening</span>
            {hasFolkeVotes && (
              <span className="text-xs text-white/50">({folkeTotal} stemmer)</span>
            )}
          </div>
          {hasFolkeVotes ? (
            <ResultBar
              forCount={folkeFor}
              motCount={folkeMot}
              avholdendeCount={0}
              showLabels={false}
              showPercentages
              size="sm"
            />
          ) : (
            <p className="text-xs text-white/50 italic">Bli den første til å stemme!</p>
          )}
        </div>

        {/* Agreement indicator + CTA */}
        <div className="flex items-center justify-between">
          {hasStortingetVote && hasFolkeVotes ? (
            <div className={cn(
              "px-3 py-1.5 rounded-full text-xs font-semibold",
              isEnig 
                ? "bg-green-500/20 text-green-300 border border-green-500/30" 
                : "bg-red-500/20 text-red-300 border border-red-500/30"
            )}>
              {isEnig ? '✓ Folket er enig' : '✗ Folket er uenig'}
            </div>
          ) : (
            <div />
          )}
          <div className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-sm">
            Stem på Folketinget
          </div>
        </div>
      </div>
    </div>
  );
}
