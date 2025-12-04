import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { User, Vote, LogIn, ThumbsUp, ThumbsDown, Minus, ChevronRight, LogOut, TrendingUp, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { triggerHaptic } from '@/lib/haptics';

interface UserVote {
  id: string;
  stemme: string;
  created_at: string;
  stortinget_saker: {
    id: string;
    tittel: string;
    kort_tittel: string | null;
    status: string;
    stortinget_votering_for: number | null;
    stortinget_votering_mot: number | null;
  };
}

interface UserStats {
  totalVotes: number;
  forVotes: number;
  motVotes: number;
  avholdendeVotes: number;
  agreementWithStortinget: number;
  comparableVotes: number;
}

export default function Profil() {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [votes, setVotes] = useState<UserVote[]>([]);
  const [stats, setStats] = useState<UserStats>({ 
    totalVotes: 0, 
    forVotes: 0, 
    motVotes: 0, 
    avholdendeVotes: 0,
    agreementWithStortinget: 0,
    comparableVotes: 0
  });
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
          .select(`id, stemme, created_at, stortinget_saker!inner(id, tittel, kort_tittel, status, stortinget_votering_for, stortinget_votering_mot)`)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        const typedData = data as unknown as UserVote[];
        setVotes(typedData || []);

        // Calculate agreement with Stortinget
        let agreements = 0;
        let comparableCount = 0;
        
        typedData?.forEach(vote => {
          const stFor = vote.stortinget_saker.stortinget_votering_for || 0;
          const stMot = vote.stortinget_saker.stortinget_votering_mot || 0;
          
          if (stFor > 0 || stMot > 0) {
            const stortingetVedtatt = stFor > stMot;
            const userVotedFor = vote.stemme === 'for';
            const userVotedMot = vote.stemme === 'mot';
            
            if (userVotedFor || userVotedMot) {
              comparableCount++;
              if ((stortingetVedtatt && userVotedFor) || (!stortingetVedtatt && userVotedMot)) {
                agreements++;
              }
            }
          }
        });

        setStats({
          totalVotes: typedData?.length || 0,
          forVotes: typedData?.filter(v => v.stemme === 'for').length || 0,
          motVotes: typedData?.filter(v => v.stemme === 'mot').length || 0,
          avholdendeVotes: typedData?.filter(v => v.stemme === 'avholdende').length || 0,
          agreementWithStortinget: comparableCount > 0 ? Math.round((agreements / comparableCount) * 100) : 0,
          comparableVotes: comparableCount,
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
    triggerHaptic('medium');
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
        <div className="px-4 py-12 animate-ios-fade">
          <div className="text-center mb-10">
            <div className="h-20 w-20 rounded-full bg-secondary/80 flex items-center justify-center mx-auto mb-5">
              <User className="h-10 w-10 text-muted-foreground" />
            </div>
            <h1 className="text-xl font-bold mb-2">Logg inn for å se din profil</h1>
            <p className="text-muted-foreground text-sm mb-6">
              Se dine stemmer og hvordan du matcher med Stortinget
            </p>
            <Button asChild className="ios-press rounded-xl px-8">
              <Link to="/auth">
                <LogIn className="h-4 w-4 mr-2" />
                Logg inn
              </Link>
            </Button>
          </div>

          {/* Slik fungerer det */}
          <div>
            <h2 className="text-base font-semibold mb-3">Slik fungerer det</h2>
            <div className="rounded-2xl bg-secondary/80 backdrop-blur-sm border border-border/50 overflow-hidden divide-y divide-border/30 shadow-[0_2px_8px_rgba(0,0,0,0.1)]">
              {[
                { num: 1, title: 'Registrer deg', desc: 'Anonymt og sikkert', color: 'bg-primary' },
                { num: 2, title: 'Les argumentene', desc: 'For og mot saken', color: 'bg-vote-for' },
                { num: 3, title: 'Stem', desc: 'For, mot eller avstå', color: 'bg-ios-orange' },
                { num: 4, title: 'Sammenlign', desc: 'Folket vs. Stortinget', color: 'bg-ios-purple' },
              ].map((step) => (
                <div key={step.num} className="flex items-center gap-4 p-4">
                  <div className={cn('h-9 w-9 rounded-xl flex items-center justify-center text-sm font-bold text-white', step.color)}>
                    {step.num}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{step.title}</p>
                    <p className="text-xs text-muted-foreground">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
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
    if (stemme === 'for') return 'bg-vote-for text-white';
    if (stemme === 'mot') return 'bg-vote-mot text-white';
    return 'bg-muted text-muted-foreground';
  };

  // Calculate percentage for visual ring
  const agreementPct = stats.agreementWithStortinget;
  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (agreementPct / 100) * circumference;

  return (
    <Layout title="Profil">
      <div className="px-4 py-5 space-y-5 animate-ios-fade">
        {/* User Header */}
        <div className="rounded-2xl bg-secondary/80 backdrop-blur-sm border border-border/50 p-5 shadow-[0_2px_8px_rgba(0,0,0,0.1)]">
          <div className="flex items-center gap-4 mb-5">
            <div className="h-14 w-14 rounded-full bg-primary flex items-center justify-center">
              <User className="h-7 w-7 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{user.email?.split('@')[0]}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>
          
          {/* Quick Stats Row */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-vote-for/10 border border-vote-for/20 p-3 text-center">
              <p className="text-xl font-bold text-vote-for tabular-nums">{stats.forVotes}</p>
              <p className="text-[10px] text-muted-foreground font-medium">For</p>
            </div>
            <div className="rounded-xl bg-muted/50 border border-border/50 p-3 text-center">
              <p className="text-xl font-bold tabular-nums">{stats.avholdendeVotes}</p>
              <p className="text-[10px] text-muted-foreground font-medium">Avholdende</p>
            </div>
            <div className="rounded-xl bg-vote-mot/10 border border-vote-mot/20 p-3 text-center">
              <p className="text-xl font-bold text-vote-mot tabular-nums">{stats.motVotes}</p>
              <p className="text-[10px] text-muted-foreground font-medium">Mot</p>
            </div>
          </div>
        </div>

        {/* Agreement with Stortinget */}
        {stats.comparableVotes >= 3 && (
          <div className="rounded-2xl bg-secondary/80 backdrop-blur-sm border border-border/50 p-5 shadow-[0_2px_8px_rgba(0,0,0,0.1)]">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Enighet med Stortinget</h3>
            </div>
            
            <div className="flex items-center gap-5">
              {/* Circular progress */}
              <div className="relative">
                <svg width="96" height="96" className="-rotate-90">
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    className="text-muted/30"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    className={cn(
                      "transition-all duration-1000 ease-out",
                      agreementPct >= 60 ? "text-vote-for" : agreementPct <= 40 ? "text-vote-mot" : "text-primary"
                    )}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={cn(
                    "text-2xl font-bold tabular-nums",
                    agreementPct >= 60 ? "text-vote-for" : agreementPct <= 40 ? "text-vote-mot" : "text-foreground"
                  )}>
                    {agreementPct}%
                  </span>
                </div>
              </div>
              
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-2">
                  Du er {agreementPct >= 50 ? 'enig' : 'uenig'} med Stortingets flertall i {agreementPct}% av sakene du har stemt på.
                </p>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
                  <TrendingUp className="h-3 w-3" />
                  <span>Basert på {stats.comparableVotes} saker</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Vote History */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Vote className="h-4 w-4 text-primary" />
              Dine stemmer
            </h2>
            <span className="text-xs text-muted-foreground">{stats.totalVotes} totalt</span>
          </div>

          <div className="rounded-2xl bg-secondary/80 backdrop-blur-sm border border-border/50 overflow-hidden divide-y divide-border/50 shadow-[0_2px_8px_rgba(0,0,0,0.1)]">
            {votes.length > 0 ? (
              votes.slice(0, 8).map((vote, index) => {
                const Icon = getVoteIcon(vote.stemme);
                return (
                  <Link
                    key={vote.id}
                    to={`/sak/${vote.stortinget_saker.id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors animate-ios-slide-up"
                    style={{ animationDelay: `${index * 0.03}s` }}
                  >
                    <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center', getVoteColor(vote.stemme))}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {vote.stortinget_saker.kort_tittel || vote.stortinget_saker.tittel}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {new Date(vote.created_at).toLocaleDateString('nb-NO')}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                  </Link>
                );
              })
            ) : (
              <div className="p-10 text-center">
                <Vote className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">Ingen stemmer ennå</p>
                <Link to="/stem" className="text-xs text-primary mt-2 inline-block hover:underline">
                  Gå til stemming →
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Sign Out */}
        <button
          onClick={handleSignOut}
          className="w-full py-3.5 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive font-semibold text-sm flex items-center justify-center gap-2 ios-press hover:bg-destructive/15 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Logg ut
        </button>
      </div>
    </Layout>
  );
}