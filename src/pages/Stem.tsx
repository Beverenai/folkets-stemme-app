import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import SakSwipeView from '@/components/SakSwipeView';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Vote } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';

interface Forslagsstiller {
  navn: string;
  parti: string;
}

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
  komite_navn: string | null;
  forslagsstiller: Forslagsstiller[] | null;
  prosess_steg: number | null;
  folke_stemmer?: { stemme: string; user_id: string }[];
}

async function fetchSakerForStemming() {
  const sb = supabase as any;
  
  // Get sak IDs that have votings with real results
  const { data: voteringData } = await sb
    .from('voteringer')
    .select('sak_id')
    .not('sak_id', 'is', null)
    .gt('resultat_for', 0);
  
  const sakIdsWithVotings = [...new Set((voteringData || []).map((v: any) => v.sak_id))];

  // Fetch saker that are important and have AI summaries
  const { data: saker, error } = await sb
    .from('stortinget_saker')
    .select('id, stortinget_id, tittel, kort_tittel, spoersmaal, kategori, oppsummering, beskrivelse, argumenter_for, argumenter_mot, stortinget_votering_for, stortinget_votering_mot, stortinget_votering_avholdende, komite_navn, forslagsstiller, prosess_steg')
    .eq('er_viktig', true)
    .eq('status', 'pågående')
    .not('oppsummering', 'is', null)
    .not('argumenter_for', 'eq', '[]')
    .in('id', sakIdsWithVotings.length > 0 ? sakIdsWithVotings : ['00000000-0000-0000-0000-000000000000'])
    .order('updated_at', { ascending: false })
    .limit(20);

  if (error) throw error;

  // Fetch folk votes
  const sakIds = (saker || []).map((s: any) => s.id);
  let folkeData: any[] = [];
  if (sakIds.length > 0) {
    const { data: stemmer } = await sb
      .from('folke_stemmer')
      .select('stemme, user_id, sak_id')
      .in('sak_id', sakIds);
    folkeData = stemmer || [];
  }

  return (saker || []).map((s: any) => ({
    ...s,
    folke_stemmer: folkeData.filter((st: any) => st.sak_id === s.id)
  })) as Sak[];
}

export default function Stem() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentIndex, setCurrentIndex] = useState(0);

  const { data: saker = [], isLoading } = useQuery({
    queryKey: ['saker-for-stemming'],
    queryFn: fetchSakerForStemming,
    staleTime: 1000 * 60 * 5,
  });

  const currentSak = saker[currentIndex];

  // Vote mutation
  const voteMutation = useMutation({
    mutationFn: async ({ sakId, stemme }: { sakId: string; stemme: 'for' | 'mot' | 'avholdende' }) => {
      if (!user) throw new Error('Ikke innlogget');

      // Check for existing vote
      const { data: existing } = await supabase
        .from('folke_stemmer')
        .select('id')
        .eq('sak_id', sakId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        // Update existing vote
        const { error } = await supabase
          .from('folke_stemmer')
          .update({ stemme })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        // Insert new vote
        const { error } = await supabase
          .from('folke_stemmer')
          .insert({ sak_id: sakId, user_id: user.id, stemme });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saker-for-stemming'] });
      toast.success('Stemme registrert!');
    },
    onError: (error) => {
      console.error('Vote error:', error);
      toast.error('Kunne ikke registrere stemme');
    }
  });

  const handleVote = useCallback(async (vote: 'for' | 'mot' | 'avholdende') => {
    if (!currentSak) return;
    await voteMutation.mutateAsync({ sakId: currentSak.id, stemme: vote });
  }, [currentSak, voteMutation]);

  const handleShare = useCallback(() => {
    if (!currentSak) return;
    
    if (navigator.share) {
      navigator.share({
        title: currentSak.spoersmaal || currentSak.kort_tittel || currentSak.tittel,
        text: currentSak.oppsummering || '',
        url: `${window.location.origin}/sak/${currentSak.id}`,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(`${window.location.origin}/sak/${currentSak.id}`);
      toast.success('Lenke kopiert!');
    }
  }, [currentSak]);

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex]);

  const goToNext = useCallback(() => {
    if (currentIndex < saker.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  }, [currentIndex, saker.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goToPrevious();
      if (e.key === 'ArrowRight') goToNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToPrevious, goToNext]);

  const getUserVote = (sak: Sak): string | null => {
    if (!user || !sak.folke_stemmer) return null;
    const vote = sak.folke_stemmer.find(v => v.user_id === user.id);
    return vote?.stemme || null;
  };

  const getVoteStats = (sak: Sak) => {
    const stemmer = sak.folke_stemmer || [];
    return {
      for: stemmer.filter(s => s.stemme === 'for').length,
      mot: stemmer.filter(s => s.stemme === 'mot').length,
      avholdende: stemmer.filter(s => s.stemme === 'avholdende').length,
      total: stemmer.length,
    };
  };

  if (isLoading) {
    return (
      <Layout title="Stem" hideNav>
        <div className="h-[calc(100vh-4rem)] flex items-center justify-center">
          <div className="text-center space-y-4">
            <Skeleton className="h-12 w-12 rounded-full mx-auto" />
            <Skeleton className="h-4 w-32 mx-auto" />
          </div>
        </div>
      </Layout>
    );
  }

  if (saker.length === 0) {
    return (
      <Layout title="Stem" hideNav>
        <div className="h-[calc(100vh-4rem)] flex items-center justify-center px-4">
          <div className="text-center space-y-4">
            <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mx-auto">
              <Vote className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-semibold mb-1">Ingen saker å stemme på</h2>
              <p className="text-sm text-muted-foreground">
                Kom tilbake senere for nye saker
              </p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Stem" hideNav>
      <div className="h-[calc(100vh-4rem)] flex flex-col">
        {/* Navigation header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
          <Button
            variant="ghost"
            size="sm"
            onClick={goToPrevious}
            disabled={currentIndex === 0}
            className="ios-press"
          >
            <ChevronLeft className="h-5 w-5" />
            <span className="sr-only">Forrige</span>
          </Button>
          
          <div className="text-center">
            <span className="text-sm font-medium">
              {currentIndex + 1} av {saker.length}
            </span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={goToNext}
            disabled={currentIndex === saker.length - 1}
            className="ios-press"
          >
            <span className="sr-only">Neste</span>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 py-2 px-4 overflow-x-auto">
          {saker.slice(0, 10).map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={cn(
                'h-1.5 rounded-full transition-all duration-200',
                i === currentIndex
                  ? 'w-4 bg-primary'
                  : getUserVote(saker[i])
                    ? 'w-1.5 bg-vote-for'
                    : 'w-1.5 bg-muted-foreground/30'
              )}
            />
          ))}
          {saker.length > 10 && (
            <span className="text-xs text-muted-foreground ml-1">+{saker.length - 10}</span>
          )}
        </div>

        {/* Swipe view */}
        <div className="flex-1 min-h-0">
          {currentSak && (
            <SakSwipeView
              key={currentSak.id}
              sak={currentSak}
              isLoggedIn={!!user}
              userVote={getUserVote(currentSak)}
              voteStats={getVoteStats(currentSak)}
              onVote={handleVote}
              onShare={handleShare}
            />
          )}
        </div>
      </div>
    </Layout>
  );
}
