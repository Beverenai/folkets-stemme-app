import { ExternalLink } from 'lucide-react';
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
      <div className="relative z-10 h-full flex flex-col px-5 pt-5 pb-8">
        <p className="text-[11px] font-medium text-white/60 uppercase tracking-wide mb-3">Sett deg inn i saken</p>
        
        <div className="flex-1 flex flex-col justify-end min-h-0">
          {/* Kategori badge */}
          {kategori && (
            <span className="inline-flex self-start px-2.5 py-1 rounded-full bg-primary/20 backdrop-blur-sm text-primary text-[11px] font-semibold mb-3">
              {kategori}
            </span>
          )}

          {/* Spørsmål som hovedtittel */}
          <h1 className="text-[22px] font-bold leading-tight text-white mb-4">
            {spoersmaal || kortTittel || tittel}
          </h1>

          {/* Oppsummering */}
          <p className="text-[15px] leading-relaxed text-white/85 line-clamp-4 mb-4">
            {oppsummering || beskrivelse || 'Ingen beskrivelse tilgjengelig.'}
          </p>
          
          {primaryForslagsstiller && (
            <p className="text-xs text-white/50 mb-4">
              <span className="font-medium text-white/70">Foreslått av:</span> {primaryForslagsstiller.navn} ({primaryForslagsstiller.parti})
            </p>
          )}

          {/* Link til Stortinget */}
          <a
            href={stortingetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-white text-sm font-medium ios-press hover:bg-white/15 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.2)]"
          >
            <ExternalLink className="h-4 w-4" />
            Les forslaget på Stortinget.no
          </a>
        </div>
      </div>
    </div>
  );
}
