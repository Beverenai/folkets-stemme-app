import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { User, Vote, LogIn, ThumbsUp, ThumbsDown, Minus, ChevronRight, LogOut } from 'lucide-react';
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
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [votes, setVotes] = useState<UserVote[]>([]);
  const [stats, setStats] = useState<UserStats>({ totalVotes: 0, forVotes: 0, motVotes: 0, avholdendeVotes: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUserData() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await supabase
          .from('folke_stemmer')
          .select(`id, stemme, created_at, stortinget_saker!inner(id, tittel, kort_tittel, status)`)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        const typedData = data as unknown as UserVote[];
        setVotes(typedData || []);

        setStats({
          totalVotes: typedData?.length || 0,
          forVotes: typedData?.filter(v => v.stemme === 'for').length || 0,
          motVotes: typedData?.filter(v => v.stemme === 'mot').length || 0,
          avholdendeVotes: typedData?.filter(v => v.stemme === 'avholdende').length || 0,
        });
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading) fetchUserData();
  }, [user, authLoading]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (authLoading || loading) {
    return (
      <Layout title="Profil">
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout title="Profil">
        <div className="px-4 py-16 text-center animate-ios-fade">
          <div className="h-20 w-20 rounded-full bg-secondary flex items-center justify-center mx-auto mb-6">
            <User className="h-10 w-10 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-bold mb-2">Logg inn</h1>
          <p className="text-muted-foreground text-sm mb-6">
            Se dine stemmer og statistikk
          </p>
          <Button asChild className="ios-press">
            <Link to="/auth">
              <LogIn className="h-4 w-4 mr-2" />
              Logg inn
            </Link>
          </Button>
        </div>
      </Layout>
    );
  }

  const getVoteIcon = (stemme: string) => {
    if (stemme === 'for') return ThumbsUp;
    if (stemme === 'mot') return ThumbsDown;
    return Minus;
  };

  const getVoteColor = (stemme: string) => {
    if (stemme === 'for') return 'bg-vote-for text-vote-for-foreground';
    if (stemme === 'mot') return 'bg-vote-mot text-vote-mot-foreground';
    return 'bg-vote-avholdende text-vote-avholdende-foreground';
  };

  return (
    <Layout title="Profil">
      <div className="px-4 py-4 space-y-4 animate-ios-fade">
        {/* User Card */}
        <div className="ios-card p-6 text-center">
          <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center mx-auto mb-4">
            <User className="h-8 w-8 text-primary-foreground" />
          </div>
          <p className="text-sm text-muted-foreground mb-4">{user.email}</p>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-vote-for/10 rounded-xl p-3">
              <p className="text-lg font-bold text-vote-for">{stats.forVotes}</p>
              <p className="text-[10px] text-muted-foreground">For</p>
            </div>
            <div className="bg-vote-avholdende/10 rounded-xl p-3">
              <p className="text-lg font-bold text-vote-avholdende">{stats.avholdendeVotes}</p>
              <p className="text-[10px] text-muted-foreground">Avholdende</p>
            </div>
            <div className="bg-vote-mot/10 rounded-xl p-3">
              <p className="text-lg font-bold text-vote-mot">{stats.motVotes}</p>
              <p className="text-[10px] text-muted-foreground">Mot</p>
            </div>
          </div>
        </div>

        {/* Vote History */}
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Vote className="h-5 w-5" />
            Dine stemmer ({stats.totalVotes})
          </h2>

          <div className="ios-card overflow-hidden divide-y divide-border">
            {votes.length > 0 ? (
              votes.slice(0, 10).map((vote, index) => {
                const Icon = getVoteIcon(vote.stemme);
                return (
                  <Link
                    key={vote.id}
                    to={`/sak/${vote.stortinget_saker.id}`}
                    className="ios-list-item ios-touch animate-ios-slide-up"
                    style={{ animationDelay: `${index * 0.03}s` }}
                  >
                    <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center', getVoteColor(vote.stemme))}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[15px] truncate">
                        {vote.stortinget_saker.kort_tittel || vote.stortinget_saker.tittel}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(vote.created_at).toLocaleDateString('nb-NO')}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground/50" />
                  </Link>
                );
              })
            ) : (
              <div className="p-8 text-center">
                <Vote className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">Ingen stemmer ennå</p>
              </div>
            )}
          </div>
        </div>

        {/* Sign Out */}
        <button
          onClick={handleSignOut}
          className="ios-card w-full p-4 flex items-center justify-center gap-2 text-destructive font-medium ios-touch"
        >
          <LogOut className="h-5 w-5" />
          Logg ut
        </button>
      </div>
    </Layout>
  );
}
