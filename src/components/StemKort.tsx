import { getSakBildeUrl, getKategoriConfig } from '@/lib/kategoriConfig';
import { cn } from '@/lib/utils';
import { triggerHaptic } from '@/lib/haptics';
import { Clock, Building2 } from 'lucide-react';

interface StemKortProps {
  sakId: string;
  spoersmaal: string | null;
  tittel: string;
  kortTittel: string | null;
  kategori: string | null;
  stengtDato: string | null;
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

  return (
    <div 
      className={cn(
        "relative h-full w-full rounded-3xl overflow-hidden transition-all duration-300",
        isActive ? "scale-100" : "scale-[0.97] opacity-90"
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
