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
      
      <div className="premium-card p-5 flex-1 flex flex-col">
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
        
        <p className="text-[15px] leading-relaxed text-foreground/90 flex-1">
          {oppsummering || beskrivelse || 'Ingen oppsummering tilgjengelig.'}
        </p>
        
        <a
          href={`https://www.stortinget.no/no/Saker-og-publikasjoner/Saker/Sak/?p=${stortingetId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 ios-press"
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
