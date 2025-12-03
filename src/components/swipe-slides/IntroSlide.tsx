import { ExternalLink, ChevronRight } from 'lucide-react';

interface IntroSlideProps {
  tittel: string;
  kortTittel: string | null;
  kategori: string | null;
  oppsummering: string | null;
  beskrivelse: string | null;
  stortingetId: string;
}

export default function IntroSlide({ 
  tittel, 
  kortTittel, 
  kategori, 
  oppsummering, 
  beskrivelse,
  stortingetId 
}: IntroSlideProps) {
  return (
    <div className="h-full flex flex-col px-4 pt-6 pb-20">
      <h2 className="text-xl font-bold text-primary mb-6">Sett deg inn i saken</h2>
      
      <div className="premium-card p-5 flex-1 flex flex-col min-h-0">
        <h3 className="text-lg font-semibold leading-tight mb-4">
          {kortTittel || tittel}
        </h3>
        
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs text-muted-foreground">Kilde: Stortinget</span>
          {kategori && (
            <>
              <span className="text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground capitalize">{kategori}</span>
            </>
          )}
        </div>
        
        {/* Scrollable text area with fade */}
        <div className="relative flex-1 min-h-0">
          <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-card to-transparent z-10 pointer-events-none" />
          <div className="h-full overflow-y-auto ios-scroll py-2">
            <p className="text-[15px] leading-relaxed text-foreground/90">
              {oppsummering || beskrivelse || 'Ingen oppsummering tilgjengelig.'}
            </p>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-card to-transparent z-10 pointer-events-none" />
        </div>
        
        <a
          href={`https://www.stortinget.no/no/Saker-og-publikasjoner/Saker/Sak/?p=${stortingetId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 ios-press flex-shrink-0"
        >
          <ExternalLink className="h-4 w-4" />
          Les forslaget her
        </a>
      </div>
      
      <div className="flex items-center justify-center gap-2 mt-6 text-primary animate-pulse">
        <span className="text-sm font-medium">Sveip for argumenter</span>
        <ChevronRight className="h-4 w-4" />
      </div>
    </div>
  );
}
