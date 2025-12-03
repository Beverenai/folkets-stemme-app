import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import { useToast } from '@/hooks/use-toast';
import { ChevronLeft, Share2 } from 'lucide-react';
import ShareCard from '@/components/ShareCard';
import SakSwipeView from '@/components/SakSwipeView';
import { Json } from '@/integrations/supabase/types';

interface Sak {
  id: string;
  stortinget_id: string;
  tittel: string;
  kort_tittel: string | null;
  beskrivelse: string | null;
  tema: string | null;
  status: string;
  oppsummering: string | null;
  bilde_url: string | null;
  argumenter_for: Json;
  argumenter_mot: Json;
  kategori: string | null;
  stortinget_votering_for: number | null;
  stortinget_votering_mot: number | null;
  stortinget_votering_avholdende: number | null;
  stortinget_vedtak: string | null;
}

interface VoteStats {
  for: number;
  mot: number;
  avholdende: number;
  total: number;
}

interface PartiVote {
  parti_forkortelse: string;
  parti_navn: string;
  stemmer_for: number;
  stemmer_mot: number;
  stemmer_avholdende: number;
}

interface Votering {
  id: string;
  stortinget_votering_id: string;
  forslag_tekst: string | null;
  votering_dato: string | null;
  vedtatt: boolean | null;
  resultat_for: number | null;
  resultat_mot: number | null;
  resultat_avholdende: number | null;
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

export default function SakDetalj() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [sak, setSak] = useState<Sak | null>(null);
  const [loading, setLoading] = useState(true);
  const [userVote, setUserVote] = useState<string | null>(null);
  const [voteStats, setVoteStats] = useState<VoteStats>({ for: 0, mot: 0, avholdende: 0, total: 0 });
  const [partiVotes, setPartiVotes] = useState<PartiVote[]>([]);
  const [voteringer, setVoteringer] = useState<Votering[]>([]);
  const [mainVoteringId, setMainVoteringId] = useState<string | null>(null);
  const [representantVotes, setRepresentantVotes] = useState<RepresentantVote[]>([]);
  const [shareOpen, setShareOpen] = useState(false);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  useEffect(() => {
    async function fetchData() {
      if (!id) return;

      try {
        const { data: sakData } = await supabase
          .from('stortinget_saker')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (!sakData) {
          navigate('/saker');
          return;
        }
        setSak(sakData);

        const { data: votes } = await supabase
          .from('folke_stemmer')
          .select('stemme')
          .eq('sak_id', id);

        const stats: VoteStats = {
          for: votes?.filter(v => v.stemme === 'for').length || 0,
          mot: votes?.filter(v => v.stemme === 'mot').length || 0,
          avholdende: votes?.filter(v => v.stemme === 'avholdende').length || 0,
          total: votes?.length || 0,
        };
        setVoteStats(stats);

        if (user) {
          const { data: userVoteData } = await supabase
            .from('folke_stemmer')
            .select('stemme')
            .eq('sak_id', id)
            .eq('user_id', user.id)
            .maybeSingle();

          if (userVoteData) {
            setUserVote(userVoteData.stemme);
          }
        }

        const { data: partiData } = await supabase
          .from('parti_voteringer')
          .select('*')
          .eq('sak_id', id);
        
        if (partiData) {
          setPartiVotes(partiData);
        }

        const { data: voteringerData } = await supabase
          .from('voteringer')
          .select('*')
          .eq('sak_id', id)
          .order('votering_dato', { ascending: false });
        
        if (voteringerData && voteringerData.length > 0) {
          setVoteringer(voteringerData);
          
          const mainVotering = voteringerData.find(v => 
            v.resultat_for === sakData.stortinget_votering_for &&
            v.resultat_mot === sakData.stortinget_votering_mot
          ) || voteringerData[0];
          
          setMainVoteringId(mainVotering?.id || null);

          if (mainVotering) {
            const { data: repVoteData } = await supabase
              .from('representant_voteringer')
              .select(`
                id,
                stemme,
                representant:representanter!inner(
                  id, fornavn, etternavn, parti_forkortelse, bilde_url
                )
              `)
              .eq('votering_uuid', mainVotering.id);
            
            if (repVoteData) {
              const transformedVotes = repVoteData.map(v => ({
                id: v.id,
                stemme: v.stemme,
                representant: Array.isArray(v.representant) ? v.representant[0] : v.representant
              }));
              setRepresentantVotes(transformedVotes);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching sak:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [id, user, navigate]);

  const handleVote = async (vote: 'for' | 'mot' | 'avholdende') => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (!sak) return;

    try {
      if (userVote) {
        await supabase
          .from('folke_stemmer')
          .update({ stemme: vote })
          .eq('sak_id', sak.id)
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('folke_stemmer')
          .insert({ sak_id: sak.id, user_id: user.id, stemme: vote });
      }

      const oldVote = userVote;
      setUserVote(vote);

      setVoteStats(prev => ({
        for: prev.for + (vote === 'for' ? 1 : 0) - (oldVote === 'for' ? 1 : 0),
        mot: prev.mot + (vote === 'mot' ? 1 : 0) - (oldVote === 'mot' ? 1 : 0),
        avholdende: prev.avholdende + (vote === 'avholdende' ? 1 : 0) - (oldVote === 'avholdende' ? 1 : 0),
        total: oldVote ? prev.total : prev.total + 1,
      }));

      toast({
        title: 'Stemme registrert!',
        description: `Du stemte ${vote === 'for' ? 'For' : vote === 'mot' ? 'Mot' : 'Avholdende'}`,
      });
    } catch (error) {
      console.error('Error voting:', error);
      toast({ title: 'Feil', description: 'Kunne ikke registrere stemme', variant: 'destructive' });
    }
  };

  const handleShare = () => {
    setShareOpen(true);
  };

  if (loading) {
    return (
      <Layout hideHeader>
        <div className="flex items-center justify-center h-screen bg-background">
          <div className="flex flex-col items-center gap-4">
            <div className="h-10 w-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Laster sak...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!sak) return null;

  return (
    <Layout hideHeader>
      <div className="h-screen flex flex-col bg-background">
        {/* Simple Clean Header */}
        <header className="flex-shrink-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border/50 safe-top">
          <div className="flex items-center justify-between h-14 px-4">
            <button 
              onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/saker')} 
              className="flex items-center gap-0.5 text-primary ios-press -ml-1"
            >
              <ChevronLeft className="h-7 w-7" />
              <span className="text-[17px] font-normal">Tilbake</span>
            </button>
            <button 
              onClick={handleShare}
              className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center ios-press"
            >
              <Share2 className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Swipe View */}
        <div className="flex-1 overflow-hidden">
          <SakSwipeView
            sak={sak}
            isLoggedIn={!!user}
            userVote={userVote}
            voteStats={voteStats}
            onVote={handleVote}
            onShare={handleShare}
          />
        </div>

        {/* Share Modal */}
        <ShareCard
          open={shareOpen}
          onOpenChange={setShareOpen}
          title={sak.kort_tittel || sak.tittel}
          summary={sak.oppsummering || undefined}
          forCount={voteStats.for}
          motCount={voteStats.mot}
          avholdendeCount={voteStats.avholdende}
          stortingetFor={sak.stortinget_votering_for}
          stortingetMot={sak.stortinget_votering_mot}
          stortingetAvholdende={sak.stortinget_votering_avholdende}
          url={window.location.href}
        />
      </div>
    </Layout>
  );
}
