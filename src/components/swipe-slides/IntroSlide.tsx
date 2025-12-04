import { ExternalLink, ChevronRight } from 'lucide-react';

interface Forslagsstiller {
  navn: string;
  parti: string;
}

interface IntroSlideProps {
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

  return (
    <div className="h-full flex flex-col px-4 pt-6 pb-20">
      <h2 className="text-sm font-medium text-muted-foreground mb-4">Sett deg inn i saken</h2>
      
      <div className="premium-card p-5 flex-1 flex flex-col overflow-hidden">
        {/* Spørsmål som hovedtittel */}
        <h1 className="text-xl font-bold leading-tight mb-4">
          {spoersmaal || kortTittel || tittel}
        </h1>

        {/* Metadata */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <span>Stortinget</span>
          {kategori && (
            <>
              <span>•</span>
              <span className="text-primary">{kategori}</span>
            </>
          )}
        </div>

        {/* Oppsummering */}
        <div className="flex-1 overflow-y-auto mb-4 ios-scroll">
          <p className="text-[15px] leading-relaxed text-muted-foreground">
            {oppsummering || beskrivelse || 'Ingen beskrivelse tilgjengelig.'}
          </p>
          
          {primaryForslagsstiller && (
            <p className="text-sm text-muted-foreground mt-4">
              <span className="font-medium text-foreground">Foreslått av:</span> {primaryForslagsstiller.navn} ({primaryForslagsstiller.parti})
            </p>
          )}
        </div>

        {/* Link til Stortinget */}
        <a
          href={stortingetUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 py-3 rounded-xl bg-primary/10 text-primary font-medium ios-press"
        >
          <ExternalLink className="h-4 w-4" />
          Les forslaget her
        </a>
      </div>

      {/* Sveip-hint */}
      <div className="flex items-center justify-center gap-1 mt-4 text-primary">
        <span className="text-sm font-medium">Sveip for argumenter</span>
        <ChevronRight className="h-4 w-4" />
      </div>
    </div>
  );
}