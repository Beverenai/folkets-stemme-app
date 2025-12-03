import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import VoteButtons from '@/components/VoteButtons';
import VoteComparison from '@/components/VoteComparison';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Clock, CheckCircle, Users, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Sak {
  id: string;
  stortinget_id: string;
  tittel: string;
  kort_tittel: string | null;
  beskrivelse: string | null;
  tema: string | null;
  status: string;
  dokumentgruppe: string | null;
  behandlet_sesjon: string | null;
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

export default function SakDetalj() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [sak, setSak] = useState<Sak | null>(null);
  const [loading, setLoading] = useState(true);
  const [userVote, setUserVote] = useState<string | null>(null);
  const [voteStats, setVoteStats] = useState<VoteStats>({ for: 0, mot: 0, avholdende: 0, total: 0 });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function fetchData() {
      if (!id) return;

      try {
        // Fetch sak
        const { data: sakData, error: sakError } = await supabase
          .from('stortinget_saker')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (sakError) throw sakError;
        if (!sakData) {
          navigate('/saker');
          return;
        }
        setSak(sakData);

        // Fetch vote stats
        const { data: votes, error: votesError } = await supabase
          .from('folke_stemmer')
          .select('stemme')
          .eq('sak_id', id);

        if (votesError) throw votesError;

        const stats: VoteStats = {
          for: votes?.filter(v => v.stemme === 'for').length || 0,
          mot: votes?.filter(v => v.stemme === 'mot').length || 0,
          avholdende: votes?.filter(v => v.stemme === 'avholdende').length || 0,
          total: votes?.length || 0,
        };
        setVoteStats(stats);

        // Fetch user vote if logged in
        if (user) {
          const { data: userVoteData, error: userVoteError } = await supabase
            .from('folke_stemmer')
            .select('stemme')
            .eq('sak_id', id)
            .eq('user_id', user.id)
            .maybeSingle();

          if (!userVoteError && userVoteData) {
            setUserVote(userVoteData.stemme);
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
      toast({
        title: 'Du må logge inn',
        description: 'Logg inn for å avgi din stemme',
        variant: 'destructive',
      });
      navigate('/auth');
      return;
    }

    if (!sak) return;

    setSubmitting(true);

    try {
      if (userVote) {
        // Update existing vote
        const { error } = await supabase
          .from('folke_stemmer')
          .update({ stemme: vote })
          .eq('sak_id', sak.id)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Insert new vote
        const { error } = await supabase
          .from('folke_stemmer')
          .insert({ sak_id: sak.id, user_id: user.id, stemme: vote });

        if (error) throw error;
      }

      // Update local state
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
      toast({
        title: 'Feil ved stemmegivning',
        description: 'Prøv igjen senere',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-32 bg-muted rounded" />
            <div className="h-12 w-3/4 bg-muted rounded" />
            <div className="h-4 w-full bg-muted rounded" />
            <div className="h-4 w-2/3 bg-muted rounded" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!sak) {
    return null;
  }

  const isAvsluttet = sak.status === 'avsluttet';
  const hasStortingetVoted = sak.stortinget_votering_for !== null || sak.stortinget_votering_mot !== null;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Back button */}
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6 -ml-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Tilbake
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header */}
            <div className="bg-card rounded-2xl border border-border p-6 animate-slide-up">
              <div className="flex items-center gap-3 mb-4">
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium',
                    isAvsluttet
                      ? 'bg-muted text-muted-foreground'
                      : 'bg-success/10 text-success'
                  )}
                >
                  {isAvsluttet ? <CheckCircle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                  {isAvsluttet ? 'Avsluttet' : 'Pågående'}
                </span>
                {sak.tema && (
                  <span className="text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full">
                    {sak.tema}
                  </span>
                )}
              </div>

              <h1 className="font-display text-2xl md:text-3xl font-bold mb-4">
                {sak.tittel}
              </h1>

              {sak.beskrivelse && (
                <p className="text-muted-foreground leading-relaxed">
                  {sak.beskrivelse}
                </p>
              )}

              {/* External link */}
              <a
                href={`https://www.stortinget.no/no/Saker-og-publikasjoner/Saker/Sak/?p=${sak.stortinget_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-4 text-sm text-primary hover:underline"
              >
                <ExternalLink className="h-4 w-4" />
                Se saken på Stortinget.no
              </a>
            </div>

            {/* Comparison (if Stortinget has voted) */}
            {hasStortingetVoted && (
              <VoteComparison
                folkeStats={voteStats}
                stortingetStats={{
                  for: sak.stortinget_votering_for || 0,
                  mot: sak.stortinget_votering_mot || 0,
                  avholdende: sak.stortinget_votering_avholdende || 0,
                }}
                vedtak={sak.stortinget_vedtak}
              />
            )}
          </div>

          {/* Sidebar - Voting */}
          <div className="space-y-6">
            {/* Vote Card */}
            <div className="bg-card rounded-2xl border border-border p-6 sticky top-24 animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <h2 className="font-display text-xl font-semibold mb-4">
                {userVote ? 'Din stemme' : 'Avgi din stemme'}
              </h2>

              <VoteButtons
                currentVote={userVote}
                onVote={handleVote}
                disabled={submitting}
                isLoggedIn={!!user}
              />

              {/* Stats */}
              <div className="mt-6 pt-6 border-t border-border">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {voteStats.total} {voteStats.total === 1 ? 'stemme' : 'stemmer'} avgitt
                  </span>
                </div>

                {voteStats.total > 0 && (
                  <>
                    <div className="flex h-3 rounded-full overflow-hidden bg-muted mb-3">
                      {voteStats.for > 0 && (
                        <div
                          className="bg-vote-for transition-all"
                          style={{ width: `${(voteStats.for / voteStats.total) * 100}%` }}
                        />
                      )}
                      {voteStats.avholdende > 0 && (
                        <div
                          className="bg-vote-avholdende transition-all"
                          style={{ width: `${(voteStats.avholdende / voteStats.total) * 100}%` }}
                        />
                      )}
                      {voteStats.mot > 0 && (
                        <div
                          className="bg-vote-mot transition-all"
                          style={{ width: `${(voteStats.mot / voteStats.total) * 100}%` }}
                        />
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <span className="h-3 w-3 rounded-full bg-vote-for" />
                          For
                        </span>
                        <span className="font-medium">
                          {voteStats.for} ({Math.round((voteStats.for / voteStats.total) * 100)}%)
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <span className="h-3 w-3 rounded-full bg-vote-avholdende" />
                          Avholdende
                        </span>
                        <span className="font-medium">
                          {voteStats.avholdende} ({Math.round((voteStats.avholdende / voteStats.total) * 100)}%)
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <span className="h-3 w-3 rounded-full bg-vote-mot" />
                          Mot
                        </span>
                        <span className="font-medium">
                          {voteStats.mot} ({Math.round((voteStats.mot / voteStats.total) * 100)}%)
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
