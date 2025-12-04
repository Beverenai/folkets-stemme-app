import { useState, useCallback, useEffect } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { cn } from '@/lib/utils';
import IntroSlide from './swipe-slides/IntroSlide';
import ArgumentsSlide from './swipe-slides/ArgumentsSlide';
import VoteSlide from './swipe-slides/VoteSlide';
import ResultSlide from './swipe-slides/ResultSlide';
import { Sak, PartiVote, RepresentantVote, VoteStats, Forslagsstiller } from '@/types';

interface SakSwipeViewProps {
  sak: Sak & { prosess_steg?: number | null };
  isLoggedIn: boolean;
  userVote: string | null;
  voteStats: VoteStats;
  partiVotes?: PartiVote[];
  representantVotes?: RepresentantVote[];
  onVote: (vote: 'for' | 'mot' | 'avholdende') => Promise<void>;
  onShare: () => void;
}

export default function SakSwipeView({
  sak,
  isLoggedIn,
  userVote,
  voteStats,
  partiVotes = [],
  representantVotes = [],
  onVote,
  onShare
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
      sakId={sak.id}
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

      {/* Dot indicators - always outside card */}
      <div className="absolute -bottom-10 left-0 right-0 flex items-center justify-center gap-2">
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
                : 'w-2 bg-white/40 hover:bg-white/60'
            )}
          />
        ))}
      </div>
      
    </div>
  );
}
