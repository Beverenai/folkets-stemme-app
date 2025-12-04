import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import useEmblaCarousel from 'embla-carousel-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import Layout from '@/components/Layout';
import StemKort from '@/components/StemKort';
import StemModal from '@/components/StemModal';
import { triggerHaptic } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Vote } from 'lucide-react';
import { SakWithVotes, PartiVote, RepresentantVote, Forslagsstiller } from '@/types';
import { Json } from '@/integrations/supabase/types';

interface Sak {
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
  stengt_dato?: string | null;
  userVote?: string | null;
  voteStats?: { for: number; mot: number; avholdende: number };
}

// Fetch saker for voting - prioritize cases with actual Stortinget voting data
async function fetchSakerForStemming(userId: string | null) {
  const { data: saker, error } = await supabase
    .from('stortinget_saker')
    .select(`
      id,
      stortinget_id,
      tittel,
      kort_tittel,
      spoersmaal,
      kategori,
      oppsummering,
      beskrivelse,
      argumenter_for,
      argumenter_mot,
      stortinget_votering_for,
      stortinget_votering_mot,
      stortinget_votering_avholdende,
      komite_navn,
      forslagsstiller,
      stengt_dato
    `)
    .eq('er_viktig', true)
    .not('oppsummering', 'is', null)
    .not('spoersmaal', 'is', null)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;

  // Sort to prioritize cases with actual voting data from Stortinget
  const sortedSaker = [...(saker || [])].sort((a, b) => {
    const aHasVotes = (a.stortinget_votering_for ?? 0) > 0;
    const bHasVotes = (b.stortinget_votering_for ?? 0) > 0;
    if (aHasVotes && !bHasVotes) return -1;
    if (!aHasVotes && bHasVotes) return 1;
    return 0;
  }).slice(0, 25);

  // Fetch user votes if logged in
  let userVotesMap: Record<string, string> = {};
  if (userId) {
    const { data: userVotes } = await supabase
      .from('folke_stemmer')
      .select('sak_id, stemme')
      .eq('user_id', userId)
      .in('sak_id', sortedSaker.map(s => s.id));
    
    if (userVotes) {
      userVotesMap = userVotes.reduce((acc, v) => {
        if (v.sak_id) acc[v.sak_id] = v.stemme;
        return acc;
      }, {} as Record<string, string>);
    }
  }

  // Fetch vote counts
  const { data: voteCounts } = await supabase
    .from('folke_stemmer')
    .select('sak_id, stemme')
    .in('sak_id', sortedSaker.map(s => s.id));

  const voteCountsMap: Record<string, { for: number; mot: number; avholdende: number }> = {};
  voteCounts?.forEach(v => {
    if (!v.sak_id) return;
    if (!voteCountsMap[v.sak_id]) {
      voteCountsMap[v.sak_id] = { for: 0, mot: 0, avholdende: 0 };
    }
    if (v.stemme === 'for') voteCountsMap[v.sak_id].for++;
    else if (v.stemme === 'mot') voteCountsMap[v.sak_id].mot++;
    else voteCountsMap[v.sak_id].avholdende++;
  });

  return sortedSaker.map(s => ({
    ...s,
    forslagsstiller: (s.forslagsstiller as unknown) as Forslagsstiller[] | null,
    userVote: userVotesMap[s.id] || null,
    voteStats: voteCountsMap[s.id] || { for: 0, mot: 0, avholdende: 0 }
  }));
}

export default function Stem() {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [selectedSak, setSelectedSak] = useState<Sak | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'center',
    loop: false,
    skipSnaps: false,
    containScroll: false,
  });

  const { data: saker = [], isLoading } = useQuery({
    queryKey: ['saker-stemming', user?.id],
    queryFn: () => fetchSakerForStemming(user?.id || null),
    staleTime: 1000 * 60 * 5,
  });

  // Handle carousel selection
  useEffect(() => {
    if (!emblaApi) return;
    
    const onSelect = () => {
      const index = emblaApi.selectedScrollSnap();
      if (index !== currentIndex) {
        triggerHaptic('light');
        setCurrentIndex(index);
      }
    };
    
    emblaApi.on('select', onSelect);
    return () => { emblaApi.off('select', onSelect); };
  }, [emblaApi, currentIndex]);

  // Vote mutation
  const voteMutation = useMutation({
    mutationFn: async ({ sakId, vote }: { sakId: string; vote: 'for' | 'mot' | 'avholdende' }) => {
      if (!user?.id) throw new Error('Must be logged in');

      // Check for existing vote
      const { data: existing } = await supabase
        .from('folke_stemmer')
        .select('id')
        .eq('user_id', user.id)
        .eq('sak_id', sakId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('folke_stemmer')
          .update({ stemme: vote })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('folke_stemmer')
          .insert({ user_id: user.id, sak_id: sakId, stemme: vote });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      triggerHaptic('success');
      queryClient.invalidateQueries({ queryKey: ['saker-stemming'] });
      toast.success('Din stemme er registrert!');
    },
    onError: () => {
      triggerHaptic('error');
      toast.error('Kunne ikke registrere stemmen');
    },
  });

  const handleOpenModal = (sak: Sak) => {
    triggerHaptic('medium');
    setSelectedSak(sak);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedSak(null);
  };

  const handleVote = async (vote: 'for' | 'mot' | 'avholdende') => {
    if (!selectedSak || !user) return;
    await voteMutation.mutateAsync({ sakId: selectedSak.id, vote });
  };

  const handleShare = useCallback(async (sak?: Sak) => {
    const sakToShare = sak || selectedSak;
    if (!sakToShare) return;
    
    triggerHaptic('light');
    const shareData = {
      title: sakToShare.spoersmaal || sakToShare.kort_tittel || sakToShare.tittel,
      text: `Stem på denne saken på Folketinget!`,
      url: `${window.location.origin}/sak/${sakToShare.id}`,
    };

    if (navigator.share) {
      await navigator.share(shareData);
    } else {
      await navigator.clipboard.writeText(shareData.url);
      toast.success('Link kopiert!');
    }
  }, [selectedSak]);

  const getVoteStats = (sak: Sak) => {
    const stats = sak.voteStats || { for: 0, mot: 0, avholdende: 0 };
    return { ...stats, total: stats.for + stats.mot + stats.avholdende };
  };

  if (isLoading || authLoading) {
    return (
      <Layout hideHeader>
        <div className="flex flex-col items-center justify-center h-[calc(100vh-80px)] px-4">
          <Skeleton className="h-[70vh] w-full rounded-3xl" />
          <div className="flex gap-1.5 mt-6">
            <Skeleton className="h-1.5 w-1.5 rounded-full" />
            <Skeleton className="h-1.5 w-5 rounded-full" />
            <Skeleton className="h-1.5 w-1.5 rounded-full" />
          </div>
        </div>
      </Layout>
    );
  }

  if (saker.length === 0) {
    return (
      <Layout hideHeader>
        <div className="flex flex-col items-center justify-center h-[calc(100vh-80px)] px-4 text-center">
          <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-4">
            <Vote className="h-10 w-10 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-bold mb-2">Ingen saker å stemme på</h2>
          <p className="text-muted-foreground">
            Kom tilbake senere for nye saker.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout hideHeader>
      <div className="flex flex-col h-[calc(100vh-80px)] pt-2">
        {/* Compact Card Carousel - 70vh */}
        <div className="flex-1 overflow-hidden relative flex items-center justify-center" ref={emblaRef}>
          <div className="flex h-[65vh] max-h-[550px] py-1">
            {saker.map((sak, index) => (
              <div 
                key={sak.id} 
                className="flex-[0_0_85vw] max-w-[340px] min-w-0 h-full mx-2"
              >
                <StemKort
                  sakId={sak.id}
                  spoersmaal={sak.spoersmaal}
                  tittel={sak.tittel}
                  kortTittel={sak.kort_tittel}
                  kategori={sak.kategori}
                  stengtDato={sak.stengt_dato || null}
                  stortingetFor={sak.stortinget_votering_for}
                  stortingetMot={sak.stortinget_votering_mot}
                  stortingetAvholdende={sak.stortinget_votering_avholdende}
                  folkeFor={sak.voteStats?.for || 0}
                  folkeMot={sak.voteStats?.mot || 0}
                  folkeAvholdende={sak.voteStats?.avholdende || 0}
                  onStemNå={() => handleOpenModal(sak)}
                  onShare={() => handleShare(sak)}
                  isActive={index === currentIndex}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Swipe indicator - only show when modal is closed */}
        {!isModalOpen && (
        <div className="flex flex-col items-center justify-center py-4 safe-bottom gap-2">
          {/* Progress dots */}
          <div className="flex items-center gap-2">
            {saker.slice(0, 8).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "rounded-full transition-all duration-300",
                  i === currentIndex 
                    ? "w-6 h-2 bg-primary shadow-lg shadow-primary/30" 
                    : i < currentIndex
                      ? "w-2 h-2 bg-primary/50"
                      : "w-2 h-2 bg-muted-foreground/30"
                )}
              />
            ))}
            {saker.length > 8 && (
              <span className="text-xs text-muted-foreground font-medium ml-1">
                +{saker.length - 8}
              </span>
            )}
          </div>
          
          {/* Swipe hint text */}
          {currentIndex < saker.length - 1 && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <span>Sveip for flere</span>
              <span className="animate-pulse">→</span>
            </p>
          )}
        </div>
        )}
      </div>

      {/* Modal */}
      <StemModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        sak={selectedSak}
        isLoggedIn={!!user}
        userVote={selectedSak?.userVote || null}
        voteStats={selectedSak ? getVoteStats(selectedSak) : { for: 0, mot: 0, avholdende: 0, total: 0 }}
        onVote={handleVote}
        isSubmitting={voteMutation.isPending}
        onShare={handleShare}
      />
    </Layout>
  );
}
