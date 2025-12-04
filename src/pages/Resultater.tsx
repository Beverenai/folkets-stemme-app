import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Skeleton } from '@/components/ui/skeleton';
import { Link, useNavigate } from 'react-router-dom';
import { BarChart3, PartyPopper, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import useEmblaCarousel from 'embla-carousel-react';
import { Button } from '@/components/ui/button';
import ResultatKort from '@/components/ResultatKort';
import { getSakBildeUrl, getKategoriConfig } from '@/lib/kategoriConfig';

interface PartiStemme {
  parti_forkortelse: string;
  stemmer_for: number;
  stemmer_mot: number;
  sak_id: string;
}

interface VoteringResult {
  id: string;
  sak_id: string | null;
  oppsummering: string | null;
  forslag_tekst: string | null;
  vedtatt: boolean | null;
  resultat_for: number;
  resultat_mot: number;
  resultat_avholdende: number;
  votering_dato: string | null;
  stortinget_saker?: {
    tittel: string;
    kategori: string | null;
  } | null;
  folke_stemmer?: { stemme: string }[];
  parti_stemmer?: PartiStemme[];
}

async function fetchResultater() {
  const sb = supabase as any;
  
  const [voteringerRes, stemmerRes, partiRes] = await Promise.all([
    sb.from('voteringer')
      .select(`
        id, sak_id, oppsummering, forslag_tekst, vedtatt, resultat_for, resultat_mot, resultat_avholdende, votering_dato,
        stortinget_saker(tittel, kategori)
      `)
      .eq('status', 'avsluttet')
      .gt('resultat_for', 0)
      .order('votering_dato', { ascending: false })
      .limit(15),
    sb.from('folke_stemmer').select('stemme, votering_id'),
    sb.from('parti_voteringer').select('parti_forkortelse, sak_id, stemmer_for, stemmer_mot')
  ]);

  if (voteringerRes.error) throw voteringerRes.error;

  const voteringer = voteringerRes.data || [];
  const stemmer = stemmerRes.data || [];
  const partiStemmer = partiRes.data || [];

  return voteringer.map((v: any) => ({
    ...v,
    folke_stemmer: stemmer.filter((s: any) => s.votering_id === v.id),
    parti_stemmer: partiStemmer.filter((p: any) => p.sak_id === v.sak_id)
  })) as VoteringResult[];
}

function ResultCardSkeleton() {
  const bildeUrl = getSakBildeUrl(null, 'skeleton');
  const kategoriConfig = getKategoriConfig(null);
  
  return (
    <div className="relative h-full w-full rounded-3xl overflow-hidden">
      <div className="absolute inset-0">
        <img src={bildeUrl} alt="" className="w-full h-full object-cover opacity-50" />
        <div className={cn("absolute inset-0 bg-gradient-to-t", kategoriConfig.gradient, "opacity-70")} />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/20" />
      </div>
      <div className="relative z-10 h-full flex flex-col p-5">
        <div className="flex items-center justify-between mb-3">
          <Skeleton className="h-4 w-20 bg-white/20" />
          <Skeleton className="h-4 w-16 bg-white/20" />
        </div>
        <div className="flex gap-2 mb-3">
          <Skeleton className="h-6 w-20 rounded-full bg-white/20" />
          <Skeleton className="h-6 w-16 rounded-full bg-white/20" />
        </div>
        <Skeleton className="h-6 w-full mb-2 bg-white/20" />
        <Skeleton className="h-6 w-4/5 mb-4 bg-white/20" />
        <div className="flex-1" />
        <div className="flex gap-2">
          <Skeleton className="flex-1 h-11 rounded-xl bg-white/20" />
          <Skeleton className="flex-1 h-11 rounded-xl bg-white/20" />
        </div>
      </div>
    </div>
  );
}

export default function Resultater() {
  const navigate = useNavigate();
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false });
  const [currentIndex, setCurrentIndex] = useState(0);

  const { data: resultater = [], isLoading } = useQuery({
    queryKey: ['resultater'],
    queryFn: fetchResultater,
    staleTime: 1000 * 60 * 5,
  });

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCurrentIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (emblaApi) {
      emblaApi.on('select', onSelect);
      onSelect();
    }
  }, [emblaApi, onSelect]);

  const handleShare = async (votering: VoteringResult) => {
    const displayText = votering.oppsummering || votering.forslag_tekst || votering.stortinget_saker?.tittel || 'Votering';
    const stemmer = votering.folke_stemmer || [];
    const folkeFor = stemmer.filter(s => s.stemme === 'for').length;
    const folkeMot = stemmer.filter(s => s.stemme === 'mot').length;
    const total = folkeFor + folkeMot;
    
    let enighetText = '';
    if (total > 0) {
      const folkFlertallFor = folkeFor > folkeMot;
      const stortingetFor = votering.vedtatt === true;
      const enighet = folkFlertallFor === stortingetFor;
      enighetText = enighet ? '✅ Stortinget stemte som folket' : '❌ Stortinget stemte mot folket';
    }
    
    const shareText = `${displayText}\n\n${enighetText}\n\nSe resultatene på Folketinget`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Avstemningsresultat',
          text: shareText,
          url: window.location.origin + `/votering/${votering.id}`
        });
      } catch (e) {
        // User cancelled
      }
    } else {
      navigator.clipboard.writeText(shareText);
    }
  };

  const totalSlides = resultater.length + 1;

  return (
    <Layout title="Resultater" hideNav>
      <div className="h-[calc(100vh-60px)] flex flex-col animate-ios-fade">
        {/* Header */}
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-0.5 text-primary ios-press -ml-1"
            >
              <ChevronLeft className="h-7 w-7" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-foreground">Resultater</h1>
              <p className="text-xs text-muted-foreground">
                Swipe for å se avstemninger
              </p>
            </div>
          </div>
          {resultater.length > 0 && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{currentIndex + 1}</span>
              <span>av</span>
              <span>{totalSlides}</span>
            </div>
          )}
        </div>

        {/* Carousel */}
        <div className="flex-1 px-4 pb-4">
          <div className="w-full h-full overflow-hidden" ref={emblaRef}>
            <div className="flex touch-pan-y h-full">
              {isLoading ? (
                <div className="flex-[0_0_100%] min-w-0 pr-3">
                  <ResultCardSkeleton />
                </div>
              ) : resultater.length > 0 ? (
                <>
                  {resultater.map((votering, index) => {
                    const displayText = votering.oppsummering || votering.stortinget_saker?.tittel || votering.forslag_tekst || 'Votering';
                    const kategori = votering.stortinget_saker?.kategori;
                    
                    return (
                      <div key={votering.id} className="flex-[0_0_100%] min-w-0 pr-3">
                        <ResultatKort
                          id={votering.id}
                          sakId={votering.sak_id}
                          displayText={displayText}
                          kategori={kategori || null}
                          vedtatt={votering.vedtatt}
                          voteringDato={votering.votering_dato}
                          resultatFor={votering.resultat_for}
                          resultatMot={votering.resultat_mot}
                          resultatAvholdende={votering.resultat_avholdende}
                          folkeStemmer={votering.folke_stemmer || []}
                          partiStemmer={votering.parti_stemmer}
                          isActive={currentIndex === index}
                          onShare={() => handleShare(votering)}
                        />
                      </div>
                    );
                  })}

                  {/* End slide */}
                  <div className="flex-[0_0_100%] min-w-0 pr-3">
                    <div className={cn(
                      "relative h-full w-full rounded-3xl overflow-hidden transition-all duration-500",
                      currentIndex === resultater.length ? "scale-100" : "scale-[0.88] opacity-60"
                    )}>
                      <div className="absolute inset-0 bg-gradient-to-b from-primary/20 to-primary/5" />
                      <div className="relative z-10 h-full flex flex-col items-center justify-center p-6 text-center">
                        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                          <PartyPopper className="h-8 w-8 text-primary" />
                        </div>
                        <h2 className="text-xl font-bold mb-2">Du har sett alle!</h2>
                        <p className="text-sm text-muted-foreground mb-6">
                          Kom tilbake senere for nye resultater
                        </p>
                        <Button asChild variant="outline" className="rounded-xl h-11 px-6">
                          <Link to="/">Tilbake til forsiden</Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-[0_0_100%] min-w-0">
                  <div className="h-full flex flex-col items-center justify-center text-center">
                    <BarChart3 className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">Ingen avsluttede voteringer ennå</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Swipe hint */}
        {resultater.length > 0 && currentIndex < resultater.length && (
          <div className="flex items-center justify-center gap-1 py-3 text-xs text-muted-foreground">
            <span>Swipe for neste</span>
            <ChevronRight className="h-3 w-3" />
          </div>
        )}
      </div>
    </Layout>
  );
}
