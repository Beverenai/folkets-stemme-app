import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { User, Vote, LogIn, ThumbsUp, ThumbsDown, Minus, Clock, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UserVote {
  id: string;
  stemme: string;
  created_at: string;
  stortinget_saker: {
    id: string;
    tittel: string;
    kort_tittel: string | null;
    status: string;
  };
}

interface UserStats {
  totalVotes: number;
  forVotes: number;
  motVotes: number;
  avholdendeVotes: number;
}

export default function Profil() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [votes, setVotes] = useState<UserVote[]>([]);
  const [stats, setStats] = useState<UserStats>({
    totalVotes: 0,
    forVotes: 0,
    motVotes: 0,
    avholdendeVotes: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUserData() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('folke_stemmer')
          .select(`
            id,
            stemme,
            created_at,
            stortinget_saker!inner (
              id,
              tittel,
              kort_tittel,
              status
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const typedData = data as unknown as UserVote[];
        setVotes(typedData || []);

        // Calculate stats
        const forVotes = typedData?.filter(v => v.stemme === 'for').length || 0;
        const motVotes = typedData?.filter(v => v.stemme === 'mot').length || 0;
        const avholdendeVotes = typedData?.filter(v => v.stemme === 'avholdende').length || 0;

        setStats({
          totalVotes: typedData?.length || 0,
          forVotes,
          motVotes,
          avholdendeVotes,
        });
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading) {
      fetchUserData();
    }
  }, [user, authLoading]);

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-32 bg-muted rounded-2xl" />
            <div className="h-64 bg-muted rounded-2xl" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-md mx-auto text-center">
            <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
              <User className="h-10 w-10 text-muted-foreground" />
            </div>
            <h1 className="font-display text-2xl font-bold mb-4">
              Logg inn for å se din profil
            </h1>
            <p className="text-muted-foreground mb-6">
              Se dine avgitte stemmer og personlig statistikk
            </p>
            <Button asChild className="gradient-hero text-white hover:opacity-90">
              <Link to="/auth">
                <LogIn className="h-4 w-4 mr-2" />
                Logg inn
              </Link>
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  const getVoteIcon = (stemme: string) => {
    switch (stemme) {
      case 'for':
        return <ThumbsUp className="h-4 w-4" />;
      case 'mot':
        return <ThumbsDown className="h-4 w-4" />;
      default:
        return <Minus className="h-4 w-4" />;
    }
  };

  const getVoteColor = (stemme: string) => {
    switch (stemme) {
      case 'for':
        return 'bg-vote-for text-vote-for-foreground';
      case 'mot':
        return 'bg-vote-mot text-vote-mot-foreground';
      default:
        return 'bg-vote-avholdende text-vote-avholdende-foreground';
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-card rounded-2xl border border-border p-6 mb-8 animate-slide-up">
          <div className="flex items-center gap-4 mb-6">
            <div className="h-16 w-16 rounded-full gradient-hero flex items-center justify-center shadow-glow-primary">
              <User className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold">
                Min profil
              </h1>
              <p className="text-muted-foreground">{user.email}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-muted/50 rounded-xl p-4 text-center">
              <p className="text-2xl font-display font-bold">{stats.totalVotes}</p>
              <p className="text-sm text-muted-foreground">Totalt</p>
            </div>
            <div className="bg-vote-for/10 rounded-xl p-4 text-center">
              <p className="text-2xl font-display font-bold text-vote-for">{stats.forVotes}</p>
              <p className="text-sm text-muted-foreground">For</p>
            </div>
            <div className="bg-vote-avholdende/10 rounded-xl p-4 text-center">
              <p className="text-2xl font-display font-bold text-vote-avholdende">{stats.avholdendeVotes}</p>
              <p className="text-sm text-muted-foreground">Avholdende</p>
            </div>
            <div className="bg-vote-mot/10 rounded-xl p-4 text-center">
              <p className="text-2xl font-display font-bold text-vote-mot">{stats.motVotes}</p>
              <p className="text-sm text-muted-foreground">Mot</p>
            </div>
          </div>
        </div>

        {/* Vote History */}
        <div className="bg-card rounded-2xl border border-border p-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
            <Vote className="h-5 w-5" />
            Dine stemmer
          </h2>

          {votes.length > 0 ? (
            <div className="space-y-3">
              {votes.map((vote) => (
                <Link
                  key={vote.id}
                  to={`/sak/${vote.stortinget_saker.id}`}
                  className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors group"
                >
                  <div
                    className={cn(
                      'h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0',
                      getVoteColor(vote.stemme)
                    )}
                  >
                    {getVoteIcon(vote.stemme)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate group-hover:text-primary transition-colors">
                      {vote.stortinget_saker.kort_tittel || vote.stortinget_saker.tittel}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {new Date(vote.created_at).toLocaleDateString('nb-NO')}
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded text-xs',
                          vote.stortinget_saker.status === 'pågående'
                            ? 'bg-success/10 text-success'
                            : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {vote.stortinget_saker.status === 'pågående' ? 'Pågående' : 'Avsluttet'}
                      </span>
                    </div>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Vote className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">Ingen stemmer ennå</h3>
              <p className="text-muted-foreground mb-4">
                Du har ikke avgitt noen stemmer ennå
              </p>
              <Button asChild variant="outline">
                <Link to="/saker">Se aktive saker</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
