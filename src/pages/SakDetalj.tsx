import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Clock, CheckCircle, Users, ExternalLink, ThumbsUp, ThumbsDown, Minus, LogIn } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Sak {
  id: string;
  stortinget_id: string;
  tittel: string;
  kort_tittel: string | null;
  beskrivelse: string | null;
  tema: string | null;
  status: string;
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
    setSubmitting(true);

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
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Layout title="Laster...">
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!sak) return null;

  const isAvsluttet = sak.status === 'avsluttet';

  const voteButtons = [
    { value: 'for' as const, label: 'For', icon: ThumbsUp, color: 'bg-vote-for text-vote-for-foreground' },
    { value: 'avholdende' as const, label: 'Avholdende', icon: Minus, color: 'bg-vote-avholdende text-vote-avholdende-foreground' },
    { value: 'mot' as const, label: 'Mot', icon: ThumbsDown, color: 'bg-vote-mot text-vote-mot-foreground' },
  ];

  return (
    <Layout hideHeader>
      {/* Custom Header */}
      <header className="sticky top-0 z-40 glass border-b border-border safe-top">
        <div className="flex items-center h-12 px-4">
          <button onClick={() => navigate(-1)} className="ios-touch -ml-2 p-2">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="flex-1 text-center font-semibold text-[17px] truncate px-8">
            Sak
          </h1>
          <div className="w-9" />
        </div>
      </header>

      <div className="px-4 py-4 space-y-4 animate-ios-fade pb-tab-bar">
        {/* Status */}
        <div className="flex items-center gap-2">
          <span className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium',
            isAvsluttet ? 'bg-secondary text-muted-foreground' : 'bg-ios-green/10 text-ios-green'
          )}>
            {isAvsluttet ? <CheckCircle className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
            {isAvsluttet ? 'Avsluttet' : 'Pågående'}
          </span>
          {sak.tema && (
            <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-secondary text-muted-foreground">
              {sak.tema}
            </span>
          )}
        </div>

        {/* Title & Description */}
        <div className="ios-card p-4">
          <h2 className="text-xl font-bold mb-3">{sak.tittel}</h2>
          {sak.beskrivelse && (
            <p className="text-sm text-muted-foreground leading-relaxed">{sak.beskrivelse}</p>
          )}
          <a
            href={`https://www.stortinget.no/no/Saker-og-publikasjoner/Saker/Sak/?p=${sak.stortinget_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-4 text-sm text-primary ios-touch"
          >
            <ExternalLink className="h-4 w-4" />
            Se på Stortinget.no
          </a>
        </div>

        {/* Vote Buttons */}
        <div className="ios-card p-4">
          <h3 className="font-semibold mb-4">
            {userVote ? 'Din stemme' : 'Avgi din stemme'}
          </h3>

          {user ? (
            <div className="space-y-2">
              {voteButtons.map((btn) => {
                const Icon = btn.icon;
                const isActive = userVote === btn.value;
                return (
                  <button
                    key={btn.value}
                    onClick={() => handleVote(btn.value)}
                    disabled={submitting}
                    className={cn(
                      'w-full flex items-center justify-center gap-3 h-14 rounded-xl font-semibold text-base transition-all ios-press',
                      btn.color,
                      isActive && 'ring-4 ring-offset-2 ring-offset-background',
                      isActive && btn.value === 'for' && 'ring-vote-for/30',
                      isActive && btn.value === 'mot' && 'ring-vote-mot/30',
                      isActive && btn.value === 'avholdende' && 'ring-vote-avholdende/30',
                      submitting && 'opacity-50'
                    )}
                  >
                    <Icon className={cn('h-5 w-5', isActive && 'animate-ios-bounce')} />
                    {btn.label}
                    {isActive && <span className="text-sm font-normal opacity-80 ml-auto pr-2">✓</span>}
                  </button>
                );
              })}
              {userVote && (
                <p className="text-center text-xs text-muted-foreground mt-3">
                  Du kan endre din stemme
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-muted-foreground mb-4 text-sm">Logg inn for å stemme</p>
              <Button asChild className="ios-press">
                <Link to="/auth">
                  <LogIn className="h-4 w-4 mr-2" />
                  Logg inn
                </Link>
              </Button>
            </div>
          )}
        </div>

        {/* Vote Stats */}
        <div className="ios-card p-4">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {voteStats.total} {voteStats.total === 1 ? 'stemme' : 'stemmer'}
            </span>
          </div>

          {voteStats.total > 0 && (
            <>
              <div className="flex h-3 rounded-full overflow-hidden bg-secondary mb-4">
                {voteStats.for > 0 && (
                  <div className="bg-vote-for transition-all" style={{ width: `${(voteStats.for / voteStats.total) * 100}%` }} />
                )}
                {voteStats.avholdende > 0 && (
                  <div className="bg-vote-avholdende transition-all" style={{ width: `${(voteStats.avholdende / voteStats.total) * 100}%` }} />
                )}
                {voteStats.mot > 0 && (
                  <div className="bg-vote-mot transition-all" style={{ width: `${(voteStats.mot / voteStats.total) * 100}%` }} />
                )}
              </div>

              <div className="space-y-2">
                {[
                  { label: 'For', count: voteStats.for, color: 'bg-vote-for' },
                  { label: 'Avholdende', count: voteStats.avholdende, color: 'bg-vote-avholdende' },
                  { label: 'Mot', count: voteStats.mot, color: 'bg-vote-mot' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span className={cn('h-3 w-3 rounded-full', item.color)} />
                      {item.label}
                    </span>
                    <span className="font-medium">
                      {item.count} ({voteStats.total > 0 ? Math.round((item.count / voteStats.total) * 100) : 0}%)
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
