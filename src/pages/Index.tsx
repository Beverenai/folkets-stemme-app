import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { ArrowRight, Vote, BarChart3, Clock, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Sak {
  id: string;
  stortinget_id: string;
  tittel: string;
  kort_tittel: string | null;
  beskrivelse: string | null;
  tema: string | null;
  status: string;
  folke_stemmer?: { stemme: string }[];
}

interface Stats {
  totalSaker: number;
  totalStemmer: number;
  aktiveSaker: number;
}

export default function Index() {
  const { user } = useAuth();
  const [aktiveSaker, setAktiveSaker] = useState<Sak[]>([]);
  const [stats, setStats] = useState<Stats>({ totalSaker: 0, totalStemmer: 0, aktiveSaker: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: saker } = await supabase
          .from('stortinget_saker')
          .select(`*, folke_stemmer(stemme)`)
          .eq('status', 'pågående')
          .limit(5);

        setAktiveSaker(saker || []);

        const { count: totalSaker } = await supabase.from('stortinget_saker').select('*', { count: 'exact', head: true });
        const { count: totalStemmer } = await supabase.from('folke_stemmer').select('*', { count: 'exact', head: true });
        const { count: aktiveSakerCount } = await supabase.from('stortinget_saker').select('*', { count: 'exact', head: true }).eq('status', 'pågående');

        setStats({ totalSaker: totalSaker || 0, totalStemmer: totalStemmer || 0, aktiveSaker: aktiveSakerCount || 0 });
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <Layout title="Hjem">
      <div className="px-4 py-6 space-y-6 animate-ios-fade">
        {/* Hero Card */}
        <div className="ios-card p-6 text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary mb-4">
            <span className="text-3xl">🏛️</span>
          </div>
          <h1 className="text-2xl font-bold mb-2">
            Folkets Storting
          </h1>
          <p className="text-muted-foreground text-sm mb-6">
            Stem på de samme sakene som politikerne
          </p>
          
          {!user && (
            <Button asChild className="w-full h-12 text-base font-semibold ios-press">
              <Link to="/auth">
                Kom i gang
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="ios-card p-4 text-center animate-ios-slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-2">
              <Vote className="h-5 w-5 text-primary" />
            </div>
            <p className="text-xl font-bold">{stats.totalStemmer}</p>
            <p className="text-[11px] text-muted-foreground">Stemmer</p>
          </div>
          
          <div className="ios-card p-4 text-center animate-ios-slide-up" style={{ animationDelay: '0.15s' }}>
            <div className="h-10 w-10 rounded-xl bg-ios-green/10 flex items-center justify-center mx-auto mb-2">
              <Clock className="h-5 w-5 text-ios-green" />
            </div>
            <p className="text-xl font-bold">{stats.aktiveSaker}</p>
            <p className="text-[11px] text-muted-foreground">Aktive</p>
          </div>
          
          <div className="ios-card p-4 text-center animate-ios-slide-up" style={{ animationDelay: '0.2s' }}>
            <div className="h-10 w-10 rounded-xl bg-ios-orange/10 flex items-center justify-center mx-auto mb-2">
              <BarChart3 className="h-5 w-5 text-ios-orange" />
            </div>
            <p className="text-xl font-bold">{stats.totalSaker}</p>
            <p className="text-[11px] text-muted-foreground">Totalt</p>
          </div>
        </div>

        {/* Active Cases */}
        <div className="animate-ios-slide-up" style={{ animationDelay: '0.25s' }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Aktive avstemninger</h2>
            <Link to="/saker" className="text-primary text-sm font-medium ios-touch">
              Se alle
            </Link>
          </div>

          <div className="ios-card overflow-hidden divide-y divide-border">
            {loading ? (
              <div className="p-8 text-center">
                <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : aktiveSaker.length > 0 ? (
              aktiveSaker.map((sak, index) => {
                const voteCount = sak.folke_stemmer?.length || 0;
                return (
                  <Link
                    key={sak.id}
                    to={`/sak/${sak.id}`}
                    className="ios-list-item ios-touch"
                    style={{ animationDelay: `${0.3 + index * 0.05}s` }}
                  >
                    <div className={cn(
                      'h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0',
                      index % 4 === 0 ? 'bg-primary/10' : 
                      index % 4 === 1 ? 'bg-ios-green/10' :
                      index % 4 === 2 ? 'bg-ios-orange/10' : 'bg-ios-purple/10'
                    )}>
                      <Vote className={cn(
                        'h-5 w-5',
                        index % 4 === 0 ? 'text-primary' :
                        index % 4 === 1 ? 'text-ios-green' :
                        index % 4 === 2 ? 'text-ios-orange' : 'text-ios-purple'
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[15px] truncate">
                        {sak.kort_tittel || sak.tittel}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {voteCount} {voteCount === 1 ? 'stemme' : 'stemmer'}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground/50" />
                  </Link>
                );
              })
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                <Vote className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Ingen aktive saker</p>
              </div>
            )}
          </div>
        </div>

        {/* How it works */}
        <div className="animate-ios-slide-up" style={{ animationDelay: '0.35s' }}>
          <h2 className="text-lg font-semibold mb-3">Slik fungerer det</h2>
          <div className="ios-card overflow-hidden divide-y divide-border">
            <div className="ios-list-item">
              <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                1
              </div>
              <div>
                <p className="font-medium text-[15px]">Registrer deg</p>
                <p className="text-xs text-muted-foreground">Anonym og sikker</p>
              </div>
            </div>
            <div className="ios-list-item">
              <div className="h-8 w-8 rounded-full bg-ios-green text-white flex items-center justify-center text-sm font-semibold">
                2
              </div>
              <div>
                <p className="font-medium text-[15px]">Stem på saker</p>
                <p className="text-xs text-muted-foreground">For, mot eller avholdende</p>
              </div>
            </div>
            <div className="ios-list-item">
              <div className="h-8 w-8 rounded-full bg-ios-orange text-white flex items-center justify-center text-sm font-semibold">
                3
              </div>
              <div>
                <p className="font-medium text-[15px]">Sammenlign</p>
                <p className="text-xs text-muted-foreground">Se folket vs. Stortinget</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
