import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import { useToast } from '@/hooks/use-toast';
import { useSwipeBack } from '@/hooks/useSwipeBack';
import { ArrowLeft, Clock, CheckCircle, Users, ExternalLink, Share2, ThumbsUp, ThumbsDown, Minus, Building2, UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import ResultBar from '@/components/ResultBar';
import PartiVoteringList from '@/components/PartiVoteringList';
import RepresentantVoteList from '@/components/RepresentantVoteList';
import KategoriBadge from '@/components/KategoriBadge';

interface Votering {
  id: string;
  stortinget_votering_id: string;
  forslag_tekst: string | null;
  oppsummering: string | null;
  votering_dato: string | null;
  status: string;
  resultat_for: number;
  resultat_mot: number;
  resultat_avholdende: number;
  vedtatt: boolean | null;
  sak_id: string | null;
  stortinget_saker?: {
    tittel: string;
    stortinget_id: string;
    kategori: string | null;
  } | null;
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

export default function VoteringDetalj() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [votering, setVotering] = useState<Votering | null>(null);
  const [loading, setLoading] = useState(true);
  const [userVote, setUserVote] = useState<string | null>(null);
  const [voteStats, setVoteStats] = useState<VoteStats>({ for: 0, mot: 0, avholdende: 0, total: 0 });
  const [voting, setVoting] = useState(false);
  const [partiVotes, setPartiVotes] = useState<PartiVote[]>([]);
  const [repVotes, setRepVotes] = useState<RepresentantVote[]>([]);

  useSwipeBack({ targetPath: '/voteringer' });

  useEffect(() => {
    async function fetchData() {
      if (!id) return;

      try {
        // Cast to any to bypass type checking for new table
        const sb = supabase as any;
        const { data: voteringData } = await sb
          .from('voteringer')
          .select(`
            *,
            stortinget_saker(tittel, stortinget_id, kategori)
          `)
          .eq('id', id)
          .maybeSingle();

        if (!voteringData) {
          navigate('/voteringer');
          return;
        }
        setVotering(voteringData as Votering);

        // Get folk votes for this votering
        const { data: votes } = await sb
          .from('folke_stemmer')
          .select('stemme')
          .eq('votering_id', id);

        const stats: VoteStats = {
          for: votes?.filter(v => v.stemme === 'for').length || 0,
          mot: votes?.filter(v => v.stemme === 'mot').length || 0,
          avholdende: votes?.filter(v => v.stemme === 'avholdende').length || 0,
          total: votes?.length || 0,
        };
        setVoteStats(stats);

        if (user) {
          const { data: userVoteData } = await sb
            .from('folke_stemmer')
            .select('stemme')
            .eq('votering_id', id)
            .eq('user_id', user.id)
            .maybeSingle();

          if (userVoteData) {
            setUserVote(userVoteData.stemme);
          }
        }

        // Get party votes if we have a sak_id
        if (voteringData?.sak_id) {
          const { data: partiData } = await sb
            .from('parti_voteringer')
            .select('*')
            .eq('sak_id', voteringData.sak_id);
          
          if (partiData) {
            setPartiVotes(partiData);
          }
        }

        // Get representative votes for this votering
        const { data: repData } = await sb
          .from('representant_voteringer')
          .select(`
            id,
            stemme,
            representant:representanter(id, fornavn, etternavn, parti_forkortelse, bilde_url)
          `)
          .eq('votering_uuid', id);
        
        if (repData) {
          setRepVotes(repData);
        }
      } catch (error) {
        console.error('Error fetching votering:', error);
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

    if (!votering || voting) return;

    setVoting(true);
    try {
      const sb = supabase as any;
      if (userVote) {
        await sb
          .from('folke_stemmer')
          .update({ stemme: vote })
          .eq('votering_id', votering.id)
          .eq('user_id', user.id);
      } else {
        await sb
          .from('folke_stemmer')
          .insert({ 
            votering_id: votering.id, 
            sak_id: votering.sak_id,
            user_id: user.id, 
            stemme: vote 
          });
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
        description: `Du stemte ${vote === 'for' ? 'For' : vote === 'mot' ? 'Mot' : 'Avstår'}`,
      });
    } catch (error) {
      console.error('Error voting:', error);
      toast({ title: 'Feil', description: 'Kunne ikke registrere stemme', variant: 'destructive' });
    } finally {
      setVoting(false);
    }
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: votering?.oppsummering || votering?.forslag_tekst || 'Votering',
        url: window.location.href,
      });
    } catch {
      await navigator.clipboard.writeText(window.location.href);
      toast({ title: 'Lenke kopiert!' });
    }
  };

  if (loading) {
    return (
      <Layout hideHeader>
        <div className="flex items-center justify-center h-screen bg-background">
          <div className="flex flex-col items-center gap-4">
            <div className="h-10 w-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Laster votering...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!votering) return null;

  const isAvsluttet = votering.status === 'avsluttet';
  const displayText = votering.oppsummering || votering.forslag_tekst || votering.stortinget_saker?.tittel || 'Votering';
  const hasStortingetResults = votering.resultat_for > 0 || votering.resultat_mot > 0;
  const stortingetId = votering.stortinget_saker?.stortinget_id;
  const kategori = votering.stortinget_saker?.kategori;

  return (
    <Layout hideHeader>
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50 safe-top">
        <div className="flex items-center justify-between h-14 px-4">
          <button 
            onClick={() => navigate('/voteringer')} 
            className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center ios-press"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-semibold text-sm">Votering</h1>
          <button 
            onClick={handleShare}
            className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center ios-press"
          >
            <Share2 className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div className="px-4 py-6 space-y-6 pb-tab-bar animate-ios-fade">
        {/* Status badges */}
        <div className="flex items-center gap-2 flex-wrap">
          {kategori && <KategoriBadge kategori={kategori} size="md" />}
          <span className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium',
            isAvsluttet 
              ? 'bg-secondary text-secondary-foreground' 
              : 'bg-vote-for/20 text-vote-for'
          )}>
            {isAvsluttet ? <CheckCircle className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
            {isAvsluttet ? 'Avsluttet' : 'Pågående'}
          </span>
          {votering.vedtatt !== null && (
            <span className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium',
              votering.vedtatt ? 'bg-vote-for/20 text-vote-for' : 'bg-vote-mot/20 text-vote-mot'
            )}>
              {votering.vedtatt ? 'Vedtatt' : 'Ikke vedtatt'}
            </span>
          )}
        </div>

        {/* Main content - what they're voting on */}
        <div className="premium-card p-5 animate-ios-slide-up">
          <h2 className="font-semibold text-sm text-primary mb-3">Hva handler det om</h2>
          <p className="text-[15px] leading-relaxed text-foreground/90">
            {displayText}
          </p>
          {stortingetId && (
            <a
              href={`https://www.stortinget.no/no/Saker-og-publikasjoner/Saker/Sak/?p=${stortingetId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-4 text-sm text-primary ios-touch font-medium"
            >
              <ExternalLink className="h-4 w-4" />
              Les mer på Stortinget.no
            </a>
          )}
        </div>

        {/* Voting buttons */}
        <div className="premium-card p-5 animate-ios-slide-up">
          <h3 className="font-semibold text-lg mb-4">Stem</h3>
          
          {user ? (
            <>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => handleVote('for')}
                  disabled={voting}
                  className={cn(
                    'flex flex-col items-center justify-center py-4 px-3 rounded-2xl transition-all ios-press',
                    userVote === 'for'
                      ? 'bg-vote-for text-vote-for-foreground ring-2 ring-vote-for ring-offset-2 ring-offset-background'
                      : 'bg-vote-for/15 text-vote-for hover:bg-vote-for/25'
                  )}
                >
                  <ThumbsUp className="h-6 w-6 mb-1.5" />
                  <span className="text-sm font-semibold">For</span>
                </button>

                <button
                  onClick={() => handleVote('avholdende')}
                  disabled={voting}
                  className={cn(
                    'flex flex-col items-center justify-center py-4 px-3 rounded-2xl transition-all ios-press',
                    userVote === 'avholdende'
                      ? 'bg-vote-avholdende text-vote-avholdende-foreground ring-2 ring-vote-avholdende ring-offset-2 ring-offset-background'
                      : 'bg-vote-avholdende/15 text-vote-avholdende hover:bg-vote-avholdende/25'
                  )}
                >
                  <Minus className="h-6 w-6 mb-1.5" />
                  <span className="text-sm font-semibold">Avstår</span>
                </button>

                <button
                  onClick={() => handleVote('mot')}
                  disabled={voting}
                  className={cn(
                    'flex flex-col items-center justify-center py-4 px-3 rounded-2xl transition-all ios-press',
                    userVote === 'mot'
                      ? 'bg-vote-mot text-vote-mot-foreground ring-2 ring-vote-mot ring-offset-2 ring-offset-background'
                      : 'bg-vote-mot/15 text-vote-mot hover:bg-vote-mot/25'
                  )}
                >
                  <ThumbsDown className="h-6 w-6 mb-1.5" />
                  <span className="text-sm font-semibold">Mot</span>
                </button>
              </div>
              
              {userVote && (
                <p className="text-center text-xs text-muted-foreground mt-3">
                  Du kan endre stemmen din når som helst
                </p>
              )}
            </>
          ) : (
            <div className="text-center py-6">
              <p className="text-muted-foreground mb-4">Logg inn for å stemme</p>
              <button
                onClick={() => navigate('/auth')}
                className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium ios-press"
              >
                Logg inn
              </button>
            </div>
          )}
        </div>

        {/* Folkets resultat */}
        <div className="premium-card p-5 animate-ios-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">Folkets stemme</h3>
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
            <div className="text-center py-6">
              <p className="text-muted-foreground text-sm">
                Ingen har stemt ennå. Vær den første!
              </p>
            </div>
          )}
        </div>

        {/* Stortingets resultat */}
        {hasStortingetResults && (
          <div className="premium-card p-5 animate-ios-slide-up">
            <h3 className="font-semibold text-lg mb-4">Stortingets stemme</h3>
            <ResultBar 
              forCount={votering.resultat_for}
              motCount={votering.resultat_mot}
              avholdendeCount={votering.resultat_avholdende}
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
            <PartiVoteringList partiVotes={partiVotes} />
          </div>
        )}

        {/* Representative votes */}
        {repVotes.length > 0 && (
          <div className="premium-card p-5 animate-ios-slide-up">
            <div className="flex items-center gap-2 mb-4">
              <UserCheck className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-lg">Representantenes stemmer</h3>
            </div>
            <RepresentantVoteList votes={repVotes} />
          </div>
        )}

        {/* Comparison */}
        {voteStats.total > 0 && hasStortingetResults && (
          <div className="premium-card p-5 animate-ios-slide-up">
            <h3 className="font-semibold text-lg mb-4">Sammenligning</h3>
            
            {(() => {
              const folkeForPct = voteStats.total > 0 ? (voteStats.for / voteStats.total) * 100 : 0;
              const stortingetTotal = votering.resultat_for + votering.resultat_mot + votering.resultat_avholdende;
              const stortingetForPct = stortingetTotal > 0 ? (votering.resultat_for / stortingetTotal) * 100 : 0;
              
              const folkeMajority = voteStats.for > voteStats.mot ? 'for' : voteStats.mot > voteStats.for ? 'mot' : 'likt';
              const stortingetMajority = votering.resultat_for > votering.resultat_mot ? 'for' : votering.resultat_mot > votering.resultat_for ? 'mot' : 'likt';
              const samsvar = folkeMajority === stortingetMajority;
              
              return (
                <div className="space-y-4">
                  <div className={cn(
                    'flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium',
                    samsvar ? 'bg-vote-for/20 text-vote-for' : 'bg-vote-mot/20 text-vote-mot'
                  )}>
                    {samsvar ? '✓ Folket og Stortinget er enige' : '⚠️ Folket og Stortinget er uenige'}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Folket</p>
                      <p className="text-2xl font-bold text-vote-for">{Math.round(folkeForPct)}%</p>
                      <p className="text-xs text-muted-foreground">for</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Stortinget</p>
                      <p className="text-2xl font-bold text-vote-for">{Math.round(stortingetForPct)}%</p>
                      <p className="text-xs text-muted-foreground">for</p>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </Layout>
  );
}
