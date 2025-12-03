import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { BarChart3, Users, CheckCircle, XCircle, Share2, PartyPopper, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import ResultBar from '@/components/ResultBar';
import useEmblaCarousel from 'embla-carousel-react';
import { Button } from '@/components/ui/button';
import KategoriBadge from '@/components/KategoriBadge';
import PartiBreakdown from '@/components/PartiBreakdown';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';

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
  return (
    <div className="bg-card/60 backdrop-blur-xl border border-border/30 rounded-3xl p-5 shadow-xl">
      <div className="flex items-center justify-between mb-3">
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-4 w-16" />
      </div>
      <Skeleton className="h-5 w-full mb-2" />
      <Skeleton className="h-5 w-4/5 mb-4" />
      <Skeleton className="h-3 w-full rounded-full mb-4" />
      <Skeleton className="h-3 w-full rounded-full mb-4" />
      <Skeleton className="h-12 w-full rounded-2xl mb-3" />
      <div className="flex gap-3 pt-3 border-t border-border/20">
        <Skeleton className="flex-1 h-10 rounded-2xl" />
        <Skeleton className="flex-1 h-10 rounded-2xl" />
      </div>
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

  useEffect(() => {
    if (emblaApi) {
      emblaApi.on('select', onSelect);
      onSelect();
    }
  }, [emblaApi, onSelect]);

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

  const totalSlides = resultater.length + 1; // +1 for end slide

  return (
    <Layout title="Resultater" hideNav>
      <div className="h-[calc(100vh-60px)] flex flex-col animate-ios-fade">
        {/* Header - kompakt med teller */}
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-foreground">Resultater</h1>
            <p className="text-xs text-muted-foreground">
              Swipe for å se avstemninger
            </p>
          </div>
          {resultater.length > 0 && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{currentIndex + 1}</span>
              <span>av</span>
              <span>{totalSlides}</span>
            </div>
          )}
        </div>

        {/* Carousel - riktig struktur for full bredde */}
        <div className="flex-1 flex items-center justify-center px-0">
          <div className="w-full h-full overflow-hidden" ref={emblaRef}>
            <div className="flex touch-pan-y h-full items-center">
              {isLoading ? (
                <div className="flex-[0_0_100%] min-w-0 px-4">
                  <ResultCardSkeleton />
                </div>
              ) : resultater.length > 0 ? (
                <>
                  {resultater.map((votering) => {
                    const stemmer = votering.folke_stemmer || [];
                    const folkeFor = stemmer.filter(s => s.stemme === 'for').length;
                    const folkeMot = stemmer.filter(s => s.stemme === 'mot').length;
                    const folkeAvholdende = stemmer.filter(s => s.stemme === 'avholdende').length;
                    const totalFolke = folkeFor + folkeMot + folkeAvholdende;
                    const enighet = getEnighet(votering);
                    const displayText = votering.oppsummering || votering.forslag_tekst || votering.stortinget_saker?.tittel || 'Votering';
                    const kategori = votering.stortinget_saker?.kategori;
                    return (
                      <div key={votering.id} className="flex-[0_0_100%] min-w-0 px-4">
                        {/* Glassmorphism card - mobiloptimalisert */}
                        <div className="bg-card/60 backdrop-blur-xl border border-border/30 rounded-3xl p-5 shadow-xl">
                          {/* Status badge + kategori + dato øverst */}
                          <div className="flex items-center gap-2 mb-3 flex-wrap">
                            <span className={cn(
                              'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold',
                              votering.vedtatt 
                                ? 'bg-vote-for/15 text-vote-for' 
                                : 'bg-vote-mot/15 text-vote-mot'
                            )}>
                              {votering.vedtatt ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                              {votering.vedtatt ? 'Vedtatt' : 'Ikke vedtatt'}
                            </span>
                            <KategoriBadge kategori={kategori} size="sm" />
                            {votering.votering_dato && (
                              <span className="text-xs text-muted-foreground ml-auto">
                                {format(new Date(votering.votering_dato), 'd. MMM yyyy', { locale: nb })}
                              </span>
                            )}
                          </div>

                          {/* Tittel - mobiltilpasset */}
                          <h2 className="text-base font-semibold leading-snug mb-4 line-clamp-3 break-words">
                            {displayText}
                          </h2>

                          {/* Resultatseksjoner - kompakt */}
                          <div className="space-y-3 mb-4">
                            {/* Folket - alltid vis */}
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  Folket
                                </span>
                                {totalFolke > 0 && (
                                  <span className="text-muted-foreground">({totalFolke} stemmer)</span>
                                )}
                              </div>
                              {totalFolke > 0 ? (
                                <ResultBar
                                  forCount={folkeFor}
                                  motCount={folkeMot}
                                  avholdendeCount={folkeAvholdende}
                                  showPercentages
                                />
                              ) : (
                                <div className="bg-muted/30 rounded-xl px-3 py-2 text-center">
                                  <p className="text-xs text-muted-foreground">Vær den første til å stemme!</p>
                                </div>
                              )}
                            </div>

                            {/* Stortinget - alltid vis */}
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">🏛️ Stortinget</span>
                                {(votering.resultat_for > 0 || votering.resultat_mot > 0) ? (
                                  <span className="text-muted-foreground">
                                    {votering.resultat_for} - {votering.resultat_mot}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground/60 italic text-[11px]">Detaljert resultat utilgjengelig</span>
                                )}
                              </div>
                              {(votering.resultat_for > 0 || votering.resultat_mot > 0) && (
                                <ResultBar
                                  forCount={votering.resultat_for}
                                  motCount={votering.resultat_mot}
                                  avholdendeCount={votering.resultat_avholdende}
                                  showPercentages
                                />
                              )}
                            </div>
                          </div>

                          {/* Parti-breakdown - alltid vis seksjon */}
                          <div className="mb-4 pt-3 border-t border-border/20">
                            {votering.parti_stemmer && votering.parti_stemmer.length > 0 ? (
                              <PartiBreakdown partiStemmer={votering.parti_stemmer} />
                            ) : (
                              <p className="text-xs text-muted-foreground/60 text-center py-1">Partifordeling ikke tilgjengelig</p>
                            )}
                          </div>

                          {/* Enighet badge */}
                          {enighet !== null && (
                            <div className={cn(
                              'flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium mb-4',
                              enighet ? 'bg-vote-for/10 text-vote-for' : 'bg-vote-mot/10 text-vote-mot'
                            )}>
                              {enighet ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                              {enighet ? 'Stortinget stemte som folket' : 'Stortinget stemte mot folket'}
                            </div>
                          )}

                          {/* Knapper - kompakte */}
                          <div className="flex gap-2 pt-3 border-t border-border/20">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 h-10 rounded-xl bg-background/50"
                              onClick={() => handleShare(votering)}
                            >
                              <Share2 className="h-4 w-4 mr-1.5" />
                              Del
                            </Button>
                            <Button asChild size="sm" className="flex-1 h-10 rounded-xl">
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
                  <div className="flex-[0_0_100%] min-w-0 px-4">
                    <div className="bg-card/60 backdrop-blur-xl border border-border/30 rounded-3xl p-5 shadow-xl text-center">
                      <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-3 mx-auto">
                        <PartyPopper className="h-7 w-7 text-primary" />
                      </div>
                      <h2 className="text-base font-bold mb-2">Du har sett alle!</h2>
                      <p className="text-xs text-muted-foreground mb-4">
                        Kom tilbake senere for nye resultater
                      </p>
                      <Button asChild variant="outline" size="sm" className="rounded-xl h-10 w-full bg-background/50">
                        <Link to="/">Tilbake til forsiden</Link>
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-[0_0_100%] min-w-0 px-4">
                  <div className="bg-card/60 backdrop-blur-xl border border-border/30 rounded-3xl p-6 shadow-xl text-center">
                    <BarChart3 className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-sm text-muted-foreground">Ingen avsluttede voteringer ennå</p>
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
