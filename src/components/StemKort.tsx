import { getSakBildeUrl, getKategoriConfig } from '@/lib/kategoriConfig';
import { cn } from '@/lib/utils';
import { triggerHaptic } from '@/lib/haptics';
import { Clock, Building2, Share2 } from 'lucide-react';
import ResultBar from '@/components/ResultBar';

interface StemKortProps {
  sakId: string;
  spoersmaal: string | null;
  tittel: string;
  kortTittel: string | null;
  kategori: string | null;
  stengtDato: string | null;
  stortingetFor: number | null;
  stortingetMot: number | null;
  stortingetAvholdende: number | null;
  folkeFor: number;
  folkeMot: number;
  folkeAvholdende: number;
  onStemNå: () => void;
  onShare: () => void;
  isActive?: boolean;
}

export default function StemKort({
  sakId,
  spoersmaal,
  tittel,
  kortTittel,
  kategori,
  stengtDato,
  stortingetFor,
  stortingetMot,
  stortingetAvholdende,
  folkeFor,
  folkeMot,
  folkeAvholdende,
  onStemNå,
  onShare,
  isActive = false,
}: StemKortProps) {
  const bildeUrl = getSakBildeUrl(kategori, sakId);
  const kategoriConfig = getKategoriConfig(kategori);
  const displayQuestion = spoersmaal || kortTittel || tittel;

  // Check if Stortinget has voted
  const stortingetTotal = (stortingetFor || 0) + (stortingetMot || 0) + (stortingetAvholdende || 0);
  const hasStortingetVote = stortingetTotal > 0;

  // Check if folket has voted
  const folkeTotal = folkeFor + folkeMot + folkeAvholdende;
  const hasFolkeVotes = folkeTotal > 0;

  // Calculate days remaining
  const getDaysText = () => {
    if (!stengtDato) return 'Åpen for stemming';
    const now = new Date();
    const stengDato = new Date(stengtDato);
    const diffTime = stengDato.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Avstemning stengt';
    if (diffDays === 0) return 'Siste dag!';
    if (diffDays === 1) return '1 dag igjen';
    return `${diffDays} dager igjen`;
  };

  const handleStemNå = () => {
    triggerHaptic('medium');
    onStemNå();
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('light');
    onShare();
  };

  return (
    <div 
      className={cn(
        "relative h-full w-full rounded-[2.5rem] overflow-hidden transition-all duration-300 ease-out",
        isActive 
          ? "scale-100 opacity-100" 
          : "scale-[0.92] opacity-40"
      )}
    >
      {/* Background image */}
      <div className="absolute inset-0">
        <img 
          src={bildeUrl} 
          alt="" 
          className="w-full h-full object-cover"
          loading="eager"
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
      <div className="relative z-10 h-full flex flex-col p-4">
        {/* Top metadata */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-white/70">
            <Building2 className="h-3.5 w-3.5" />
            <span className="text-[11px] font-medium">Stortinget</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/15 backdrop-blur-sm text-white text-[11px] font-semibold">
            <Clock className="h-3 w-3" />
            <span>{getDaysText()}</span>
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1 min-h-0" />

        {/* Category badge */}
        {kategori && (
          <span className="inline-flex self-start px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-sm text-white text-[11px] font-semibold border border-white/20 mb-2">
            {kategori}
          </span>
        )}

        {/* Question */}
        <h2 className="text-lg font-bold text-white leading-tight mb-3 line-clamp-3">
          {displayQuestion}
        </h2>

        {/* Stortingets vedtak */}
        {hasStortingetVote && (
          <div className="mb-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-medium text-white/70">🏛️ Stortingets vedtak</span>
            </div>
            <ResultBar
              forCount={stortingetFor || 0}
              motCount={stortingetMot || 0}
              avholdendeCount={stortingetAvholdende || 0}
              showLabels={false}
              showPercentages
              size="sm"
            />
          </div>
        )}

        {/* Folkets mening */}
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-medium text-white/70">👥 Folkets mening</span>
            {hasFolkeVotes && (
              <span className="text-[11px] text-white/50">({folkeTotal} stemmer)</span>
            )}
          </div>
          {hasFolkeVotes ? (
            <ResultBar
              forCount={folkeFor}
              motCount={folkeMot}
              avholdendeCount={folkeAvholdende}
              showLabels={false}
              showPercentages
              size="sm"
            />
          ) : (
            <p className="text-[11px] text-white/50 italic">Vær den første til å stemme!</p>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleStemNå}
            className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm ios-press hover:brightness-110 transition-all shadow-lg shadow-primary/30"
          >
            Stem her
          </button>
          <button
            onClick={handleShare}
            className="px-4 py-3 rounded-xl bg-white/15 backdrop-blur-sm text-white font-semibold text-sm ios-press hover:bg-white/25 transition-all border border-white/20"
          >
            <Share2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
