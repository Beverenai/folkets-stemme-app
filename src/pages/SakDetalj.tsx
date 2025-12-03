import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Clock, CheckCircle, Users, ExternalLink, Share2, Sparkles, RefreshCw, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import ArgumentsSection from '@/components/ArgumentsSection';
import ResultBar from '@/components/ResultBar';
import VotingSection from '@/components/VotingSection';
import PartiVoteringList from '@/components/PartiVoteringList';
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

export default function SakDetalj() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [sak, setSak] = useState<Sak | null>(null);
  const [loading, setLoading] = useState(true);
  const [userVote, setUserVote] = useState<string | null>(null);
  const [voteStats, setVoteStats] = useState<VoteStats>({ for: 0, mot: 0, avholdende: 0, total: 0 });
  const [generatingAI, setGeneratingAI] = useState(false);
  const [partiVotes, setPartiVotes] = useState<PartiVote[]>([]);

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

        // Fetch party votes for this sak
        const { data: partiData } = await supabase
          .from('parti_voteringer')
          .select('*')
          .eq('sak_id', id);
        
        if (partiData) {
          setPartiVotes(partiData);
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

  const handleShare = async () => {
    try {
      await navigator.share({
        title: sak?.tittel,
        text: sak?.oppsummering || sak?.beskrivelse || '',
        url: window.location.href,
      });
    } catch {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(window.location.href);
      toast({ title: 'Lenke kopiert!' });
    }
  };

  const generateAIContent = async () => {
    if (!sak || generatingAI) return;
    
    setGeneratingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-sak-ai', {
        body: { sakId: sak.id }
      });

      if (error) throw error;

      if (data?.generated) {
        setSak(prev => prev ? {
          ...prev,
          oppsummering: data.generated.oppsummering,
          kategori: data.generated.kategori,
          argumenter_for: data.generated.argumenter_for,
          argumenter_mot: data.generated.argumenter_mot,
        } : null);

        toast({
          title: 'AI-innhold generert!',
          description: 'Oppsummering og argumenter er nå tilgjengelig',
        });
      }
    } catch (error: any) {
      console.error('Error generating AI content:', error);
      toast({
        title: 'Feil ved AI-generering',
        description: error.message || 'Kunne ikke generere innhold',
        variant: 'destructive',
      });
    } finally {
      setGeneratingAI(false);
    }
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

  const isAvsluttet = sak.status === 'avsluttet';
  const argumenterFor = Array.isArray(sak.argumenter_for) ? sak.argumenter_for as string[] : [];
  const argumenterMot = Array.isArray(sak.argumenter_mot) ? sak.argumenter_mot as string[] : [];

  return (
    <Layout hideHeader>
      {/* Hero Header */}
      <div className="relative">
        {/* Background */}
        <div className="h-56 bg-gradient-to-br from-primary/20 via-primary/5 to-background relative overflow-hidden">
          {sak.bilde_url ? (
            <img 
              src={sak.bilde_url} 
              alt={sak.tittel}
              className="w-full h-full object-cover opacity-50"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-8xl opacity-10">🏛️</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
        </div>

        {/* Floating header */}
        <header className="absolute top-0 left-0 right-0 z-40 safe-top">
          <div className="flex items-center justify-between h-14 px-4">
            <button 
              onClick={() => navigate(-1)} 
              className="h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center ios-press"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              {/* AI Generate button */}
              <button 
                onClick={generateAIContent}
                disabled={generatingAI}
                className={cn(
                  "h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center ios-press",
                  generatingAI && "opacity-50"
                )}
                title="Generer AI-innhold"
              >
                {generatingAI ? (
                  <RefreshCw className="h-5 w-5 animate-spin" />
                ) : (
                  <Sparkles className="h-5 w-5 text-primary" />
                )}
              </button>
              <button 
                onClick={handleShare}
                className="h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center ios-press"
              >
                <Share2 className="h-5 w-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Title overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium',
              isAvsluttet 
                ? 'bg-secondary text-secondary-foreground' 
                : 'bg-vote-for/20 text-vote-for'
            )}>
              {isAvsluttet ? <CheckCircle className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
              {isAvsluttet ? 'Avsluttet' : 'Pågående'}
            </span>
            {sak.kategori && (
              <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                {sak.kategori}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold leading-tight">
            {sak.kort_tittel || sak.tittel}
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6 space-y-6 pb-tab-bar animate-ios-fade">
        {/* AI Generate prompt - show when no AI content */}
        {!sak.oppsummering && argumenterFor.length === 0 && argumenterMot.length === 0 && (
          <button
            onClick={generateAIContent}
            disabled={generatingAI}
            className="w-full premium-card p-5 animate-ios-slide-up text-left ios-press"
          >
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-primary/15 flex items-center justify-center">
                {generatingAI ? (
                  <RefreshCw className="h-6 w-6 text-primary animate-spin" />
                ) : (
                  <Sparkles className="h-6 w-6 text-primary" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-[15px] mb-1">
                  {generatingAI ? 'Genererer innhold...' : 'Generer AI-oppsummering'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {generatingAI 
                    ? 'Vennligst vent mens vi analyserer saken' 
                    : 'Trykk for å få en enkel forklaring og argumenter'}
                </p>
              </div>
            </div>
          </button>
        )}

        {/* Summary card */}
        {(sak.oppsummering || sak.beskrivelse) && (
          <div className="premium-card p-5 animate-ios-slide-up">
            <h2 className="font-semibold text-sm text-primary mb-3">Oppsummering</h2>
            <p className="text-[15px] leading-relaxed text-foreground/90">
              {sak.oppsummering || sak.beskrivelse}
            </p>
            <a
              href={`https://www.stortinget.no/no/Saker-og-publikasjoner/Saker/Sak/?p=${sak.stortinget_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-4 text-sm text-primary ios-touch font-medium"
            >
              <ExternalLink className="h-4 w-4" />
              Les mer på Stortinget.no
            </a>
          </div>
        )}

        {/* Arguments */}
        {(argumenterFor.length > 0 || argumenterMot.length > 0) && (
          <ArgumentsSection 
            argumenterFor={argumenterFor}
            argumenterMot={argumenterMot}
          />
        )}

        {/* Voting section */}
        <VotingSection 
          userVote={userVote}
          onVote={handleVote}
          isLoggedIn={!!user}
        />

        {/* Results */}
        <div className="premium-card p-5 animate-ios-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">Resultat</h3>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{voteStats.total} stemmer</span>
            </div>
          </div>

          {voteStats.total > 0 ? (
            <div className="space-y-4">
              <ResultBar 
                forCount={voteStats.for}
                motCount={voteStats.mot}
                avholdendeCount={voteStats.avholdende}
                size="lg"
                showLabels
              />
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground text-sm">
                Ingen har stemt ennå. Vær den første!
              </p>
            </div>
          )}
        </div>

        {/* Stortinget results (if available) */}
        {(sak.stortinget_votering_for || sak.stortinget_votering_mot) && (
          <div className="premium-card p-5 animate-ios-slide-up">
            <h3 className="font-semibold text-lg mb-4">Stortingets votering</h3>
            <ResultBar 
              forCount={sak.stortinget_votering_for || 0}
              motCount={sak.stortinget_votering_mot || 0}
              avholdendeCount={sak.stortinget_votering_avholdende || 0}
              size="lg"
              showLabels
            />
            {sak.stortinget_vedtak && (
              <div className="mt-4 p-3 rounded-xl bg-secondary">
                <p className="text-sm">
                  <span className="font-medium">Vedtak:</span> {sak.stortinget_vedtak}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Party breakdown */}
        {partiVotes.length > 0 && (
          <div className="premium-card p-5 animate-ios-slide-up">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-lg">Partienes stemmer</h3>
            </div>
            <PartiVoteringList partiVotes={partiVotes} />
          </div>
        )}
      </div>
    </Layout>
  );
}