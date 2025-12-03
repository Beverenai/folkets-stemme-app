import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Clock, CheckCircle, Users, ExternalLink, Share2, Building2, ListChecks, UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import ArgumentsSection from '@/components/ArgumentsSection';
import ResultBar from '@/components/ResultBar';
import VotingSection from '@/components/VotingSection';
import PartiVoteringList from '@/components/PartiVoteringList';
import VoteringList from '@/components/VoteringList';
import RepresentantVoteList from '@/components/RepresentantVoteList';
import ShareCard from '@/components/ShareCard';
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

  const isAvsluttet = sak.status === 'avsluttet';
  const argumenterFor = Array.isArray(sak.argumenter_for) ? sak.argumenter_for as string[] : [];
  const argumenterMot = Array.isArray(sak.argumenter_mot) ? sak.argumenter_mot as string[] : [];
  
  const hasStortingetVotes = (sak.stortinget_votering_for || 0) > 0 || (sak.stortinget_votering_mot || 0) > 0;
  const vedtatt = (sak.stortinget_votering_for || 0) > (sak.stortinget_votering_mot || 0);

  return (
    <Layout hideHeader>
      <div className="min-h-screen bg-background">
        {/* Simple Clean Header */}
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border/50 safe-top">
          <div className="flex items-center justify-between h-14 px-4">
            <button 
              onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/saker')} 
              className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center ios-press"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <button 
              onClick={handleShare}
              className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center ios-press"
            >
              <Share2 className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="px-4 py-5 space-y-5 pb-tab-bar animate-ios-fade">
          {/* Status badges and title */}
          <div>
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
                <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground capitalize">
                  {sak.kategori}
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold leading-tight">
              {sak.kort_tittel || sak.tittel}
            </h1>
          </div>

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

          {/* Public votes results */}
          <div className="premium-card p-5 animate-ios-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Folkets stemmer</h3>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{voteStats.total} stemmer</span>
              </div>
            </div>

            {voteStats.total > 0 ? (
              <ResultBar 
                forCount={voteStats.for}
                motCount={voteStats.mot}
                avholdendeCount={voteStats.avholdende}
                size="lg"
                showLabels
              />
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground text-sm">
                  Ingen har stemt ennå. Vær den første!
                </p>
              </div>
            )}
          </div>

          {/* Stortinget results */}
          {hasStortingetVotes && (
            <div className="premium-card p-5 animate-ios-slide-up">
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-lg">Stortingets vedtak</h3>
              </div>
              
              <div className={cn(
                "p-4 rounded-xl mb-4",
                vedtatt ? "bg-vote-for/10" : "bg-vote-mot/10"
              )}>
                <p className={cn(
                  "text-lg font-semibold",
                  vedtatt ? "text-vote-for" : "text-vote-mot"
                )}>
                  {vedtatt ? 'Vedtatt' : 'Forkastet'} med {sak.stortinget_votering_for} mot {sak.stortinget_votering_mot} stemmer
                </p>
                {sak.stortinget_vedtak && (
                  <p className="text-sm text-muted-foreground mt-1">{sak.stortinget_vedtak}</p>
                )}
              </div>

              <ResultBar 
                forCount={sak.stortinget_votering_for || 0}
                motCount={sak.stortinget_votering_mot || 0}
                avholdendeCount={sak.stortinget_votering_avholdende || 0}
                size="lg"
                showLabels
              />
            </div>
          )}

          {/* Party breakdown */}
          {partiVotes.length > 0 && (
            <div className="premium-card p-5 animate-ios-slide-up">
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-lg">Partienes stemmer</h3>
              </div>
              <PartiVoteringList partiVotes={partiVotes} voteringCount={voteringer.length} />
            </div>
          )}

          {/* Individual representative votes */}
          {representantVotes.length > 0 && (
            <div className="premium-card p-5 animate-ios-slide-up">
              <div className="flex items-center gap-2 mb-4">
                <UserCheck className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-lg">Representantenes stemmer</h3>
              </div>
              <RepresentantVoteList votes={representantVotes} />
            </div>
          )}

          {/* All voteringer list */}
          {voteringer.length > 1 && (
            <div className="premium-card p-5 animate-ios-slide-up">
              <div className="flex items-center gap-2 mb-4">
                <ListChecks className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-lg">Alle voteringer ({voteringer.length})</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Denne saken hadde {voteringer.length} separate avstemninger.
              </p>
              <VoteringList voteringer={voteringer} mainVoteringId={mainVoteringId || undefined} />
            </div>
          )}

          {/* Prominent Share Button */}
          <button
            onClick={handleShare}
            className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 ios-press animate-ios-slide-up"
          >
            <Share2 className="h-5 w-5" />
            Del resultat
          </button>
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
          url={window.location.href}
        />
      </div>
    </Layout>
  );
}
