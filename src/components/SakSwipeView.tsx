import { useState, useCallback, useEffect } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { cn } from '@/lib/utils';
import IntroSlide from './swipe-slides/IntroSlide';
import ArgumentsSlide from './swipe-slides/ArgumentsSlide';
import VoteSlide from './swipe-slides/VoteSlide';
import ResultSlide from './swipe-slides/ResultSlide';
import { Json } from '@/integrations/supabase/types';

interface Forslagsstiller {
  navn: string;
  parti: string;
}

interface PartiVote {
  parti_forkortelse: string;
  parti_navn: string;
  stemmer_for: number;
  stemmer_mot: number;
  stemmer_avholdende: number;
}

interface RepresentantVote {
  id: string;
  stemme: string;
  representant: {
    id: string;
    fornavn: string;
    etternavn: string;
    parti_forkortelse: string | null;
    bilde_url: string | null;
  };
}

interface SakSwipeViewProps {
  sak: {
    id: string;
    stortinget_id: string;
    tittel: string;
    kort_tittel: string | null;
    spoersmaal: string | null;
    kategori: string | null;
    oppsummering: string | null;
    beskrivelse: string | null;
    argumenter_for: Json;
    argumenter_mot: Json;
    stortinget_votering_for: number | null;
    stortinget_votering_mot: number | null;
    stortinget_votering_avholdende: number | null;
    komite_navn?: string | null;
    forslagsstiller?: Forslagsstiller[] | null;
    prosess_steg?: number | null;
  };
  isLoggedIn: boolean;
  userVote: string | null;
  voteStats: {
    for: number;
    mot: number;
    avholdende: number;
    total: number;
  };
  partiVotes?: PartiVote[];
  representantVotes?: RepresentantVote[];
  onVote: (vote: 'for' | 'mot' | 'avholdende') => Promise<void>;
  onShare: () => void;
  showDotsOutside?: boolean;
}

export default function SakSwipeView({
  sak,
  isLoggedIn,
  userVote,
  voteStats,
  partiVotes = [],
  representantVotes = [],
  onVote,
  onShare,
  showDotsOutside = true
}: SakSwipeViewProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    watchDrag: true,
    skipSnaps: false 
  });
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const argumenterFor = Array.isArray(sak.argumenter_for) ? sak.argumenter_for as string[] : [];
  const argumenterMot = Array.isArray(sak.argumenter_mot) ? sak.argumenter_mot as string[] : [];

  // Haptic feedback function
  const triggerHaptic = useCallback(() => {
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  }, []);

  // Handle slide change
  useEffect(() => {
    if (!emblaApi) return;

    const onSelect = () => {
      const newSlide = emblaApi.selectedScrollSnap();
      if (newSlide !== currentSlide) {
        triggerHaptic();
        setCurrentSlide(newSlide);
      }
    };

    emblaApi.on('select', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, currentSlide, triggerHaptic]);

  // Handle vote and go to result slide
  const handleVote = async (vote: 'for' | 'mot') => {
    setIsSubmitting(true);
    try {
      await onVote(vote);
      // After voting, go to result slide
      setTimeout(() => {
        emblaApi?.scrollTo(3);
        triggerHaptic();
      }, 300);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Parse forslagsstiller from JSON
  const forslagsstillerData = sak.forslagsstiller as Forslagsstiller[] | null;

  const slides = [
    <IntroSlide
      key="intro"
      sakId={sak.id}
      tittel={sak.tittel}
      kortTittel={sak.kort_tittel}
      spoersmaal={sak.spoersmaal}
      kategori={sak.kategori}
      oppsummering={sak.oppsummering}
      beskrivelse={sak.beskrivelse}
      stortingetId={sak.stortinget_id}
      komiteNavn={sak.komite_navn}
      forslagsstiller={forslagsstillerData}
    />,
    <ArgumentsSlide
      key="arguments"
      argumenterFor={argumenterFor}
      argumenterMot={argumenterMot}
    />,
    <VoteSlide
      key="vote"
      spoersmaal={sak.spoersmaal}
      tittel={sak.tittel}
      kortTittel={sak.kort_tittel}
      isLoggedIn={isLoggedIn}
      userVote={userVote}
      onVote={handleVote}
      isSubmitting={isSubmitting}
    />,
    <ResultSlide
      key="result"
      userVote={userVote}
      voteStats={voteStats}
      stortingetFor={sak.stortinget_votering_for}
      stortingetMot={sak.stortinget_votering_mot}
      stortingetAvholdende={sak.stortinget_votering_avholdende}
      partiVotes={partiVotes}
      representantVotes={representantVotes}
      onShare={onShare}
    />
  ];

  return (
    <div className="relative h-full">
      {/* Carousel - absolute positioning for proper height */}
      <div className="absolute inset-0 overflow-hidden" ref={emblaRef}>
        <div className="flex h-full">
          {slides.map((slide, index) => (
            <div key={index} className="flex-[0_0_100%] min-w-0 h-full">
              {slide}
            </div>
          ))}
        </div>
      </div>

      {/* Dot indicators - outside card (for Stem page) */}
      {showDotsOutside && (
        <div className="absolute -bottom-12 left-0 right-0 flex items-center justify-center gap-2 safe-bottom">
          {[0, 1, 2, 3].map((i) => (
            <button
              key={i}
              onClick={() => {
                emblaApi?.scrollTo(i);
                triggerHaptic();
              }}
              className={cn(
                'h-2 rounded-full transition-all duration-300',
                currentSlide === i 
                  ? 'w-6 bg-primary' 
                  : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50'
              )}
            />
          ))}
        </div>
      )}
      
      {/* Dot indicators inside card (for modal) */}
      {!showDotsOutside && (
        <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center z-20">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-sm">
            {[0, 1, 2, 3].map((i) => (
              <button
                key={i}
                onClick={() => {
                  emblaApi?.scrollTo(i);
                  triggerHaptic();
                }}
                className={cn(
                  'h-2 rounded-full transition-all duration-300',
                  currentSlide === i 
                    ? 'w-6 bg-primary shadow-sm' 
                    : 'w-2 bg-white/60 hover:bg-white/80'
                )}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
