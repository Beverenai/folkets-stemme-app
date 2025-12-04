import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Vote, ChevronRight, Sparkles, TrendingUp, Users, BarChart3, Clock } from 'lucide-react';
import PolitikereFolketPreview from '@/components/PolitikereFolketPreview';
import { supabase } from '@/integrations/supabase/client';

export default function Index() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ voteringer: 0, stemmer: 0, representanter: 0 });

  useEffect(() => {
    async function fetchStats() {
      try {
        const sb = supabase as any;
        
        const [voteringer, stemmer, representanter] = await Promise.all([
          sb.from('voteringer').select('id', { count: 'exact', head: true }),
          sb.from('folke_stemmer').select('id', { count: 'exact', head: true }),
          sb.from('representanter').select('id', { count: 'exact', head: true }).eq('er_aktiv', true),
        ]);

        setStats({
          voteringer: voteringer.count || 0,
          stemmer: stemmer.count || 0,
          representanter: representanter.count || 0,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    }
    fetchStats();
  }, []);

  return (
    <Layout title="Hjem">
      <div className="px-4 py-6 space-y-8 animate-ios-fade">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            Live stemming
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Folketinget</h1>
          <p className="text-muted-foreground max-w-sm mx-auto">
            Se hvordan politikerne stemmer — og sammenlign med hva folket mener
          </p>
        </div>

        {/* Primary CTA */}
        <Link 
          to="/stem"
          className="block group"
        >
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-6 shadow-lg shadow-primary/20 ios-press">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
            
            <div className="relative flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Vote className="h-5 w-5 text-primary-foreground" />
                  <span className="text-primary-foreground/80 text-sm font-medium">Stem på saker</span>
                </div>
                <h2 className="text-xl font-bold text-primary-foreground">
                  Si din mening nå
                </h2>
                <p className="text-primary-foreground/70 text-sm">
                  Sammenlign din stemme med Stortinget
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ChevronRight className="h-6 w-6 text-primary-foreground" />
              </div>
            </div>
          </div>
        </Link>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-card border border-border p-3 text-center shadow-sm">
            <div className="text-2xl font-bold text-foreground">{stats.voteringer}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Voteringer</div>
          </div>
          <div className="rounded-xl bg-card border border-border p-3 text-center shadow-sm">
            <div className="text-2xl font-bold text-primary">{stats.stemmer.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Folkestemmer</div>
          </div>
          <div className="rounded-xl bg-card border border-border p-3 text-center shadow-sm">
            <div className="text-2xl font-bold text-foreground">{stats.representanter}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Politikere</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link 
            to="/saker"
            className="rounded-xl bg-card border border-border p-4 flex items-start gap-3 ios-press hover:bg-secondary/50 transition-colors shadow-sm"
          >
            <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-sm">Alle saker</div>
              <div className="text-xs text-muted-foreground mt-0.5">Bla gjennom voteringer</div>
            </div>
          </Link>
          
          {!user ? (
            <Link 
              to="/auth"
              className="rounded-xl bg-card border border-border p-4 flex items-start gap-3 ios-press hover:bg-secondary/50 transition-colors shadow-sm"
            >
              <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                <Sparkles className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-sm">Logg inn</div>
                <div className="text-xs text-muted-foreground mt-0.5">Lagre dine stemmer</div>
              </div>
            </Link>
          ) : (
            <Link 
              to="/profil"
              className="rounded-xl bg-card border border-border p-4 flex items-start gap-3 ios-press hover:bg-secondary/50 transition-colors shadow-sm"
            >
              <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                <Users className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-sm">Min profil</div>
                <div className="text-xs text-muted-foreground mt-0.5">Se dine stemmer</div>
              </div>
            </Link>
          )}
        </div>

        {/* Politikerne vs Folket */}
        <div className="animate-ios-slide-up" style={{ animationDelay: '0.1s' }}>
          <PolitikereFolketPreview />
        </div>

        {/* Footer info */}
        <div className="text-center text-xs text-muted-foreground pb-4">
          <p>Data fra Stortingets åpne API</p>
        </div>
      </div>
    </Layout>
  );
}
