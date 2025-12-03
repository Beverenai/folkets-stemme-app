import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Vote, BarChart3, Clock, ChevronRight, RefreshCw, Sparkles, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import SakCard from '@/components/SakCard';

interface Sak {
  id: string;
  stortinget_id: string;
  tittel: string;
  kort_tittel: string | null;
  beskrivelse: string | null;
  tema: string | null;
  status: string;
  oppsummering: string | null;
  kategori: string | null;
  bilde_url: string | null;
  folke_stemmer?: { stemme: string }[];
}

interface Stats {
  totalSaker: number;
  totalStemmer: number;
  aktiveSaker: number;
}

export default function Index() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [aktiveSaker, setAktiveSaker] = useState<Sak[]>([]);
  const [featuredSak, setFeaturedSak] = useState<Sak | null>(null);
  const [stats, setStats] = useState<Stats>({ totalSaker: 0, totalStemmer: 0, aktiveSaker: 0 });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const fetchData = async () => {
    try {
      // Fetch featured sak (most voted active case)
      const { data: featured } = await supabase
        .from('stortinget_saker')
        .select(`*, folke_stemmer(stemme)`)
        .eq('status', 'pågående')
        .limit(1)
        .maybeSingle();

      if (featured) {
        setFeaturedSak(featured);
      }

      // Fetch active cases
      const { data: saker } = await supabase
        .from('stortinget_saker')
        .select(`*, folke_stemmer(stemme)`)
        .eq('status', 'pågående')
        .limit(5);

      setAktiveSaker(saker || []);

      // Fetch stats
      const { count: totalSaker } = await supabase.from('stortinget_saker').select('*', { count: 'exact', head: true });
      const { count: totalStemmer } = await supabase.from('folke_stemmer').select('*', { count: 'exact', head: true });
      const { count: aktiveSakerCount } = await supabase.from('stortinget_saker').select('*', { count: 'exact', head: true }).eq('status', 'pågående');

      setStats({ totalSaker: totalSaker || 0, totalStemmer: totalStemmer || 0, aktiveSaker: aktiveSakerCount || 0 });
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const syncFromStortinget = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-stortinget');
      
      if (error) throw error;
      
      toast({
        title: 'Synkronisering fullført',
        description: `${data.inserted} nye saker lagt til, ${data.updated} oppdatert`,
      });
      
      await fetchData();
    } catch (error) {
      console.error('Sync error:', error);
      toast({
        title: 'Synkronisering feilet',
        description: 'Kunne ikke hente saker fra Stortinget',
        variant: 'destructive',
      });
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <Layout title="Hjem">
      <div className="px-4 py-6 space-y-6 animate-ios-fade">
        {/* Hero Card */}
        <div className="premium-card-glow p-6 text-center animate-ios-spring">
          <div className="inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 mb-4 animate-float">
            <span className="text-4xl">🏛️</span>
          </div>
          <h1 className="text-2xl font-bold mb-2 gradient-text">
            Folkets Storting
          </h1>
          <p className="text-muted-foreground text-sm mb-6 max-w-xs mx-auto">
            Stem på de samme sakene som politikerne og se hvordan folket mener
          </p>
          
          {!user && (
            <Button asChild className="w-full h-12 text-base font-semibold ios-press rounded-xl">
              <Link to="/auth">
                <Sparkles className="mr-2 h-5 w-5" />
                Kom i gang
              </Link>
            </Button>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="premium-card p-4 text-center animate-ios-slide-up stagger-1">
            <div className="h-11 w-11 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto mb-3">
              <Vote className="h-5 w-5 text-primary" />
            </div>
            <p className="text-2xl font-bold">{stats.totalStemmer}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Stemmer</p>
          </div>
          
          <div className="premium-card p-4 text-center animate-ios-slide-up stagger-2">
            <div className="h-11 w-11 rounded-2xl bg-vote-for/15 flex items-center justify-center mx-auto mb-3">
              <Clock className="h-5 w-5 text-vote-for" />
            </div>
            <p className="text-2xl font-bold">{stats.aktiveSaker}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Aktive</p>
          </div>
          
          <div className="premium-card p-4 text-center animate-ios-slide-up stagger-3">
            <div className="h-11 w-11 rounded-2xl bg-ios-orange/15 flex items-center justify-center mx-auto mb-3">
              <BarChart3 className="h-5 w-5 text-ios-orange" />
            </div>
            <p className="text-2xl font-bold">{stats.totalSaker}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Totalt</p>
          </div>
        </div>

        {/* Featured Case */}
        {featuredSak && (
          <div className="animate-ios-slide-up stagger-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Aktuelt nå</h2>
            </div>
            <SakCard sak={featuredSak} variant="featured" />
          </div>
        )}

        {/* Active Cases */}
        <div className="animate-ios-slide-up stagger-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Aktive saker</h2>
            <div className="flex items-center gap-3">
              <button 
                onClick={syncFromStortinget}
                disabled={syncing}
                className="text-muted-foreground ios-touch p-1"
                title="Oppdater fra Stortinget"
              >
                <RefreshCw className={cn('h-4 w-4', syncing && 'animate-spin')} />
              </button>
              <Link to="/saker" className="text-primary text-sm font-medium ios-touch flex items-center gap-1">
                Se alle
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="premium-card overflow-hidden divide-y divide-border/30">
            {loading ? (
              <div className="p-12 text-center">
                <div className="h-10 w-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : aktiveSaker.length > 0 ? (
              aktiveSaker.slice(0, 4).map((sak, index) => (
                <SakCard key={sak.id} sak={sak} index={index} variant="compact" />
              ))
            ) : (
              <div className="p-12 text-center text-muted-foreground">
                <Vote className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p className="text-sm mb-4">Ingen aktive saker</p>
                <Button 
                  onClick={syncFromStortinget} 
                  disabled={syncing}
                  variant="outline"
                  className="ios-press"
                >
                  <RefreshCw className={cn('h-4 w-4 mr-2', syncing && 'animate-spin')} />
                  {syncing ? 'Henter...' : 'Hent fra Stortinget'}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Explore Politicians */}
        <div className="animate-ios-slide-up" style={{ animationDelay: '0.3s' }}>
          <Link 
            to="/representanter" 
            className="premium-card p-4 flex items-center gap-4 ios-press"
          >
            <div className="h-12 w-12 rounded-2xl bg-ios-purple/15 flex items-center justify-center">
              <Users className="h-6 w-6 text-ios-purple" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-[15px]">Utforsk politikere</p>
              <p className="text-[13px] text-muted-foreground">Se representanter og partier</p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </Link>
        </div>

        {/* How it works */}
        <div className="animate-ios-slide-up" style={{ animationDelay: '0.35s' }}>
          <h2 className="text-lg font-semibold mb-3">Slik fungerer det</h2>
          <div className="premium-card overflow-hidden divide-y divide-border/30">
            {[
              { num: 1, title: 'Registrer deg', desc: 'Anonymt og sikkert', color: 'bg-primary text-primary-foreground' },
              { num: 2, title: 'Les argumentene', desc: 'For og mot saken', color: 'bg-vote-for text-vote-for-foreground' },
              { num: 3, title: 'Stem', desc: 'For, mot eller avstå', color: 'bg-ios-orange text-white' },
              { num: 4, title: 'Sammenlign', desc: 'Folket vs. Stortinget', color: 'bg-ios-purple text-white' },
            ].map((step, index) => (
              <div key={step.num} className="flex items-center gap-4 p-4" style={{ animationDelay: `${0.4 + index * 0.05}s` }}>
                <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center text-sm font-bold', step.color)}>
                  {step.num}
                </div>
                <div>
                  <p className="font-medium text-[15px]">{step.title}</p>
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