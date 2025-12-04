import { ExternalLink, ChevronRight } from 'lucide-react';
import { getSakBildeUrl, getKategoriConfig } from '@/lib/kategoriConfig';
import { cn } from '@/lib/utils';

interface Forslagsstiller {
  navn: string;
  parti: string;
}

interface IntroSlideProps {
  sakId?: string;
  tittel: string;
  kortTittel: string | null;
  spoersmaal: string | null;
  kategori: string | null;
  oppsummering: string | null;
  beskrivelse: string | null;
  stortingetId: string;
  komiteNavn?: string | null;
  forslagsstiller?: Forslagsstiller[] | null;
}

export default function IntroSlide({ 
  sakId,
  tittel, 
  kortTittel,
  spoersmaal,
  kategori, 
  oppsummering, 
  beskrivelse,
  stortingetId,
  komiteNavn,
  forslagsstiller,
}: IntroSlideProps) {
  const primaryForslagsstiller = forslagsstiller?.[0];
  const stortingetUrl = `https://www.stortinget.no/no/Saker-og-publikasjoner/Saker/Sak/?p=${stortingetId}`;
  
  const bildeUrl = getSakBildeUrl(kategori, sakId);
  const kategoriConfig = getKategoriConfig(kategori);

  return (
    <div className="h-full flex flex-col relative overflow-hidden">
      {/* Background image with gradient overlay */}
      <div className="absolute inset-0">
        <img 
          src={bildeUrl} 
          alt="" 
          className="w-full h-full object-cover"
          loading="eager"
        />
        {/* Dark gradient overlay for readability */}
        <div className={cn(
          "absolute inset-0 bg-gradient-to-t",
          kategoriConfig.gradient,
          "opacity-85"
        )} />
        {/* Extra bottom gradient for text area */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col px-4 pt-6 pb-12">
        <h2 className="text-sm font-medium text-white/70 mb-4">Sett deg inn i saken</h2>
        
        <div className="flex-1 flex flex-col justify-end">
          {/* Kategori badge */}
          {kategori && (
            <span className="inline-flex self-start px-3 py-1 rounded-full bg-primary/20 backdrop-blur-sm text-primary text-xs font-semibold mb-3">
              {kategori}
            </span>
          )}

          {/* Spørsmål som hovedtittel */}
          <h1 className="text-2xl font-bold leading-tight text-white mb-4">
            {spoersmaal || kortTittel || tittel}
          </h1>

          {/* Oppsummering */}
          <p className="text-[15px] leading-relaxed text-white/80 line-clamp-4 mb-4">
            {oppsummering || beskrivelse || 'Ingen beskrivelse tilgjengelig.'}
          </p>
          
          {primaryForslagsstiller && (
            <p className="text-sm text-white/60 mb-4">
              <span className="font-medium text-white/80">Foreslått av:</span> {primaryForslagsstiller.navn} ({primaryForslagsstiller.parti})
            </p>
          )}

          {/* Link til Stortinget */}
          <a
            href={stortingetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white font-medium ios-press hover:bg-white/20 transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            Les forslaget på Stortinget.no
          </a>
        </div>

        {/* Sveip-hint */}
        <div className="flex items-center justify-center gap-1 mt-6 text-primary">
          <span className="text-sm font-medium">Sveip for argumenter</span>
          <ChevronRight className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}
