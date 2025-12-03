import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Vote, Scale, CheckCircle, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatsData {
  totalSaker: number;
  totalStemmer: number;
  samsvarsgrad: number;
  avsluttedeSaker: number;
  saksMedSamsvar: number;
}

export default function Statistikk() {
  const [stats, setStats] = useState<StatsData>({
    totalSaker: 0, totalStemmer: 0, samsvarsgrad: 0, avsluttedeSaker: 0, saksMedSamsvar: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const { count: totalSaker } = await supabase.from('stortinget_saker').select('*', { count: 'exact', head: true });
        const { count: totalStemmer } = await supabase.from('folke_stemmer').select('*', { count: 'exact', head: true });

        const { data: avsluttedeSaker } = await supabase
          .from('stortinget_saker')
          .select(`id, stortinget_votering_for, stortinget_votering_mot, folke_stemmer(stemme)`)
          .eq('status', 'avsluttet')
          .not('stortinget_votering_for', 'is', null);

        let saksMedSamsvar = 0;
        if (avsluttedeSaker) {
          avsluttedeSaker.forEach(sak => {
            const folkeFor = sak.folke_stemmer?.filter(s => s.stemme === 'for').length || 0;
            const folkeMot = sak.folke_stemmer?.filter(s => s.stemme === 'mot').length || 0;
            const folkeTotal = sak.folke_stemmer?.length || 0;
            
            if (folkeTotal > 0) {
              const folkeMajority = folkeFor > folkeMot ? 'for' : 'mot';
              const stortingetMajority = (sak.stortinget_votering_for || 0) > (sak.stortinget_votering_mot || 0) ? 'for' : 'mot';
              if (folkeMajority === stortingetMajority) saksMedSamsvar++;
            }
          });
        }

        const samsvarsgrad = avsluttedeSaker && avsluttedeSaker.length > 0
          ? Math.round((saksMedSamsvar / avsluttedeSaker.length) * 100) : 0;

        setStats({
          totalSaker: totalSaker || 0,
          totalStemmer: totalStemmer || 0,
          samsvarsgrad,
          avsluttedeSaker: avsluttedeSaker?.length || 0,
          saksMedSamsvar,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  if (loading) {
    return (
      <Layout title="Statistikk">
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  const statCards = [
    { icon: Vote, label: 'Totale stemmer', value: stats.totalStemmer, color: 'bg-primary/10 text-primary' },
    { icon: Scale, label: 'Totale saker', value: stats.totalSaker, color: 'bg-ios-purple/10 text-ios-purple' },
    { icon: CheckCircle, label: 'Avsluttede', value: stats.avsluttedeSaker, color: 'bg-ios-green/10 text-ios-green' },
    { icon: TrendingUp, label: 'Samsvarsgrad', value: `${stats.samsvarsgrad}%`, color: 'bg-ios-orange/10 text-ios-orange' },
  ];

  return (
    <Layout title="Statistikk">
      <div className="px-4 py-4 space-y-4 animate-ios-fade">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="ios-card p-4 animate-ios-slide-up"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center mb-3', stat.color.split(' ')[0])}>
                  <Icon className={cn('h-5 w-5', stat.color.split(' ')[1])} />
                </div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            );
          })}
        </div>

        {/* Samsvar Section */}
        <div className="ios-card p-4 animate-ios-slide-up" style={{ animationDelay: '0.2s' }}>
          <h3 className="font-semibold mb-4">Samsvar folk vs. Storting</h3>
          
          {stats.avsluttedeSaker > 0 ? (
            <>
              <div className="relative h-32 w-32 mx-auto mb-4">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <circle
                    cx="18" cy="18" r="16"
                    fill="none"
                    stroke="hsl(var(--secondary))"
                    strokeWidth="3"
                  />
                  <circle
                    cx="18" cy="18" r="16"
                    fill="none"
                    stroke="hsl(var(--ios-green))"
                    strokeWidth="3"
                    strokeDasharray={`${stats.samsvarsgrad} 100`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold">{stats.samsvarsgrad}%</span>
                  <span className="text-xs text-muted-foreground">samsvar</span>
                </div>
              </div>

              <div className="flex justify-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-ios-green" />
                  <span>Samsvar ({stats.saksMedSamsvar})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-destructive" />
                  <span>Avvik ({stats.avsluttedeSaker - stats.saksMedSamsvar})</span>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Scale className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Ingen avsluttede saker ennå</p>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="ios-card p-4 animate-ios-slide-up" style={{ animationDelay: '0.25s' }}>
          <h3 className="font-semibold mb-2">Om samsvarsgraden</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Samsvarsgraden viser hvor ofte folkets flertall stemmer likt som Stortingets flertall.
            En høy samsvarsgrad betyr at politikerne følger folkeviljen.
          </p>
        </div>
      </div>
    </Layout>
  );
}
