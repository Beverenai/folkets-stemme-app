import { getSakBildeUrl, getKategoriConfig } from '@/lib/kategoriConfig';
import { cn } from '@/lib/utils';
import { triggerHaptic } from '@/lib/haptics';
import { Clock, Building2, Users, TrendingUp } from 'lucide-react';

interface StemKortProps {
  sakId: string;
  spoersmaal: string | null;
  tittel: string;
  kortTittel: string | null;
  kategori: string | null;
  stengtDato: string | null;
  voteCount: number;
  onStemNå: () => void;
  isActive?: boolean;
}

export default function StemKort({
  sakId,
  spoersmaal,
  tittel,
  kortTittel,
  kategori,
  stengtDato,
  voteCount,
  onStemNå,
  isActive = false,
}: StemKortProps) {
  const bildeUrl = getSakBildeUrl(kategori, sakId);
  const kategoriConfig = getKategoriConfig(kategori);
  const displayQuestion = spoersmaal || kortTittel || tittel;

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

  // Format vote count
  const formatVoteCount = (count: number) => {
    if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
    return count.toString();
  };

  // Get engagement level
  const getEngagementLevel = (count: number) => {
    if (count >= 100) return { label: 'Høyt engasjement', color: 'text-[hsl(var(--ios-green))]' };
    if (count >= 20) return { label: 'Aktivt', color: 'text-[hsl(var(--ios-yellow))]' };
    return { label: 'Ny sak', color: 'text-muted-foreground' };
  };

  const engagement = getEngagementLevel(voteCount);

  return (
    <div 
      className={cn(
        "relative h-full w-full rounded-3xl overflow-hidden transition-all duration-500",
        isActive 
          ? "scale-100 stem-card-active" 
          : "scale-[0.88] opacity-60"
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
      <div className="relative z-10 h-full flex flex-col p-5">
        {/* Top metadata */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-white/70">
            <Building2 className="h-4 w-4" />
            <span className="text-xs font-medium">Stortinget</span>
          </div>
          <div className="flex items-center gap-1.5 text-primary text-xs font-semibold">
            <Clock className="h-3.5 w-3.5" />
            <span>{getDaysText()}</span>
          </div>
        </div>

        {/* Vote count badge */}
        {voteCount > 0 && (
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-sm">
              <Users className="h-3.5 w-3.5 text-white/80" />
              <span className="text-xs font-semibold text-white">{formatVoteCount(voteCount)} stemmer</span>
            </div>
            <div className={cn("flex items-center gap-1 text-xs font-medium", engagement.color)}>
              <TrendingUp className="h-3 w-3" />
              <span>{engagement.label}</span>
            </div>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Category badge */}
        {kategori && (
          <span className="inline-flex self-start px-3 py-1 rounded-full bg-primary/20 backdrop-blur-sm text-primary text-xs font-semibold mb-3">
            {kategori}
          </span>
        )}

        {/* Question */}
        <h2 className="text-xl font-bold text-white leading-tight mb-5 line-clamp-4">
          {displayQuestion}
        </h2>

        {/* STEM NÅ button */}
        <button
          onClick={handleStemNå}
          className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-lg ios-press hover:brightness-110 transition-all shadow-lg shadow-primary/30"
        >
          STEM NÅ
        </button>
      </div>
    </div>
  );
}
