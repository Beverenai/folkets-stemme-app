import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { BarChart3, Users, CheckCircle, XCircle, Share2, PartyPopper } from 'lucide-react';
import { cn } from '@/lib/utils';
import ResultBar from '@/components/ResultBar';
import useEmblaCarousel from 'embla-carousel-react';
import { Button } from '@/components/ui/button';

interface VoteringResult {
  id: string;
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
}

async function fetchResultater() {
  const sb = supabase as any;
  
  const [voteringerRes, stemmerRes] = await Promise.all([
    sb.from('voteringer')
      .select(`
        id, oppsummering, forslag_tekst, vedtatt, resultat_for, resultat_mot, resultat_avholdende, votering_dato,
        stortinget_saker(tittel, kategori)
      `)
      .eq('status', 'avsluttet')
      .order('votering_dato', { ascending: false })
      .limit(30),
    sb.from('folke_stemmer').select('stemme, votering_id')
  ]);

  if (voteringerRes.error) throw voteringerRes.error;

  const voteringer = voteringerRes.data || [];
  const stemmer = stemmerRes.data || [];

  return voteringer.map((v: any) => ({
    ...v,
    folke_stemmer: stemmer.filter((s: any) => s.votering_id === v.id)
  })) as VoteringResult[];
}

function ResultCardSkeleton() {
  return (
    <div className="h-full flex flex-col items-center justify-center px-6">
      <Skeleton className="h-6 w-3/4 mb-4" />
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-2/3 mb-6" />
      <Skeleton className="h-3 w-full rounded-full mb-4" />
      <Skeleton className="h-3 w-full rounded-full" />
    </div>
  );
}

export default function Resultater() {
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

  // Subscribe to embla events
  useState(() => {
    if (emblaApi) {
      emblaApi.on('select', onSelect);
      onSelect();
    }
  });

  const getEnighet = (votering: VoteringResult) => {
    const stemmer = votering.folke_stemmer || [];
    const folkeFor = stemmer.filter(s => s.stemme === 'for').length;
    const folkeMot = stemmer.filter(s => s.stemme === 'mot').length;
    const total = folkeFor + folkeMot;
    if (total === 0) return null;

    const folkFlertallFor = folkeFor > folkeMot;
    const stortingetFor = votering.vedtatt === true;
    
    return folkFlertallFor === stortingetFor;
  };

  const handleShare = async (votering: VoteringResult) => {
    const displayText = votering.oppsummering || votering.forslag_tekst || votering.stortinget_saker?.tittel || 'Votering';
    const enighet = getEnighet(votering);
    const enighetText = enighet === null ? '' : enighet ? '✅ Stortinget stemte som folket' : '❌ Stortinget stemte mot folket';
    
    const shareText = `${displayText}\n\n${enighetText}\n\nSe resultatene på Folkets Storting`;
    
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

  const isAtEnd = currentIndex >= resultater.length;

  return (
    <Layout title="Resultater" hideNav>
      <div className="h-[calc(100vh-60px)] flex flex-col animate-ios-fade">
        {/* Header */}
        <div className="px-4 pt-4 pb-2">
          <h1 className="text-xl font-bold text-foreground">Resultater</h1>
          <p className="text-sm text-muted-foreground">
            Swipe for å se avstemningsresultater
          </p>
        </div>

        {/* Carousel */}
        <div className="flex-1 overflow-hidden" ref={emblaRef}>
          <div className="flex h-full">
            {isLoading ? (
              <div className="flex-[0_0_100%] min-w-0 h-full">
                <ResultCardSkeleton />
              </div>
            ) : resultater.length > 0 ? (
              <>
                {resultater.map((votering, index) => {
                  const stemmer = votering.folke_stemmer || [];
                  const folkeFor = stemmer.filter(s => s.stemme === 'for').length;
                  const folkeMot = stemmer.filter(s => s.stemme === 'mot').length;
                  const folkeAvholdende = stemmer.filter(s => s.stemme === 'avholdende').length;
                  const totalFolke = folkeFor + folkeMot + folkeAvholdende;
                  const enighet = getEnighet(votering);
                  const displayText = votering.oppsummering || votering.forslag_tekst || votering.stortinget_saker?.tittel || 'Votering';

                  return (
                    <div key={votering.id} className="flex-[0_0_100%] min-w-0 h-full px-4 py-4">
                      <div className="h-full flex flex-col bg-card border border-border/50 rounded-3xl p-6 shadow-lg overflow-hidden">
                        {/* Enighet badge */}
                        {enighet !== null && (
                          <div className={cn(
                            'self-start px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 mb-4',
                            enighet ? 'bg-vote-for/20 text-vote-for' : 'bg-vote-mot/20 text-vote-mot'
                          )}>
                            {enighet ? <CheckCircle className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                            {enighet ? 'Enig med folket' : 'Uenig med folket'}
                          </div>
                        )}

                        {/* Title */}
                        <h2 className="text-lg font-bold leading-snug mb-4 line-clamp-4 flex-shrink-0">
                          {displayText}
                        </h2>

                        {/* Results */}
                        <div className="flex-1 flex flex-col justify-center space-y-6">
                          {/* Folket */}
                          {totalFolke > 0 && (
                            <div>
                              <div className="flex items-center justify-between text-sm mb-2">
                                <span className="text-muted-foreground flex items-center gap-1.5">
                                  <Users className="h-4 w-4" />
                                  Folket ({totalFolke} stemmer)
                                </span>
                              </div>
                              <ResultBar
                                forCount={folkeFor}
                                motCount={folkeMot}
                                avholdendeCount={folkeAvholdende}
                                showPercentages
                              />
                            </div>
                          )}

                          {/* Stortinget */}
                          <div>
                            <div className="flex items-center justify-between text-sm mb-2">
                              <span className="text-muted-foreground">Stortinget</span>
                              <span className={cn(
                                'font-semibold',
                                votering.vedtatt ? 'text-vote-for' : 'text-vote-mot'
                              )}>
                                {votering.vedtatt ? 'Vedtatt' : 'Ikke vedtatt'}
                              </span>
                            </div>
                            <ResultBar
                              forCount={votering.resultat_for}
                              motCount={votering.resultat_mot}
                              avholdendeCount={votering.resultat_avholdende}
                              showPercentages
                            />
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 mt-6 pt-4 border-t border-border/30">
                          <Button
                            variant="outline"
                            className="flex-1 h-12 rounded-xl"
                            onClick={() => handleShare(votering)}
                          >
                            <Share2 className="h-4 w-4 mr-2" />
                            Del resultat
                          </Button>
                          <Button asChild className="flex-1 h-12 rounded-xl">
                            <Link to={`/votering/${votering.id}`}>
                              Se detaljer
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* End slide */}
                <div className="flex-[0_0_100%] min-w-0 h-full px-4 py-4">
                  <div className="h-full flex flex-col items-center justify-center bg-card border border-border/50 rounded-3xl p-6">
                    <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                      <PartyPopper className="h-10 w-10 text-primary" />
                    </div>
                    <h2 className="text-xl font-bold mb-2 text-center">Du har sett alle!</h2>
                    <p className="text-muted-foreground text-center mb-6">
                      Kom tilbake senere for nye resultater
                    </p>
                    <Button asChild variant="outline" className="rounded-xl">
                      <Link to="/">Tilbake til forsiden</Link>
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-[0_0_100%] min-w-0 h-full flex items-center justify-center">
                <div className="text-center px-6">
                  <BarChart3 className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">Ingen avsluttede voteringer ennå</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Dot indicators */}
        {resultater.length > 0 && (
          <div className="flex justify-center gap-1.5 py-4">
            {[...resultater, null].map((_, index) => (
              <div
                key={index}
                className={cn(
                  'h-2 rounded-full transition-all duration-300',
                  index === currentIndex 
                    ? 'w-6 bg-primary' 
                    : 'w-2 bg-muted-foreground/30'
                )}
              />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
