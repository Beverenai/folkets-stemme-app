import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Users, Vote, Scale, CheckCircle, XCircle } from 'lucide-react';

interface StatsData {
  totalSaker: number;
  totalStemmer: number;
  samsvarsgrad: number;
  avsluttedeSaker: number;
  saksMedSamsvar: number;
}

interface TemaStats {
  tema: string;
  antall: number;
}

export default function Statistikk() {
  const [stats, setStats] = useState<StatsData>({
    totalSaker: 0,
    totalStemmer: 0,
    samsvarsgrad: 0,
    avsluttedeSaker: 0,
    saksMedSamsvar: 0,
  });
  const [temaStats, setTemaStats] = useState<TemaStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        // Fetch total saker
        const { count: totalSaker } = await supabase
          .from('stortinget_saker')
          .select('*', { count: 'exact', head: true });

        // Fetch total stemmer
        const { count: totalStemmer } = await supabase
          .from('folke_stemmer')
          .select('*', { count: 'exact', head: true });

        // Fetch avsluttede saker med stemmer
        const { data: avsluttedeSaker } = await supabase
          .from('stortinget_saker')
          .select(`
            id,
            stortinget_votering_for,
            stortinget_votering_mot,
            folke_stemmer(stemme)
          `)
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
              
              if (folkeMajority === stortingetMajority) {
                saksMedSamsvar++;
              }
            }
          });
        }

        const samsvarsgrad = avsluttedeSaker && avsluttedeSaker.length > 0
          ? Math.round((saksMedSamsvar / avsluttedeSaker.length) * 100)
          : 0;

        setStats({
          totalSaker: totalSaker || 0,
          totalStemmer: totalStemmer || 0,
          samsvarsgrad,
          avsluttedeSaker: avsluttedeSaker?.length || 0,
          saksMedSamsvar,
        });

        // Fetch tema stats
        const { data: sakerMedTema } = await supabase
          .from('stortinget_saker')
          .select('tema')
          .not('tema', 'is', null);

        if (sakerMedTema) {
          const temaCounts: Record<string, number> = {};
          sakerMedTema.forEach(sak => {
            if (sak.tema) {
              temaCounts[sak.tema] = (temaCounts[sak.tema] || 0) + 1;
            }
          });

          const temaData = Object.entries(temaCounts)
            .map(([tema, antall]) => ({ tema, antall }))
            .sort((a, b) => b.antall - a.antall)
            .slice(0, 6);

          setTemaStats(temaData);
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  const COLORS = ['hsl(0, 75%, 50%)', 'hsl(210, 80%, 55%)', 'hsl(142, 72%, 45%)', 'hsl(45, 95%, 55%)', 'hsl(280, 65%, 60%)', 'hsl(180, 60%, 50%)'];

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-48 bg-muted rounded" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-32 bg-muted rounded-2xl" />
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">
            Statistikk
          </h1>
          <p className="text-muted-foreground">
            Se hvordan folket stemmer sammenlignet med Stortinget
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-card rounded-2xl border border-border p-6 animate-slide-up">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl gradient-primary flex items-center justify-center shadow-glow-primary">
                <Vote className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-display font-bold">{stats.totalStemmer}</p>
                <p className="text-sm text-muted-foreground">Totale stemmer</p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border p-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl gradient-secondary flex items-center justify-center shadow-glow-secondary">
                <Scale className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-display font-bold">{stats.totalSaker}</p>
                <p className="text-sm text-muted-foreground">Totale saker</p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border p-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-success flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-display font-bold">{stats.avsluttedeSaker}</p>
                <p className="text-sm text-muted-foreground">Avsluttede saker</p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border p-6 animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-warning flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-warning-foreground" />
              </div>
              <div>
                <p className="text-2xl font-display font-bold">{stats.samsvarsgrad}%</p>
                <p className="text-sm text-muted-foreground">Samsvarsgrad</p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Samsvarsgrad */}
          <div className="bg-card rounded-2xl border border-border p-6 animate-slide-up" style={{ animationDelay: '0.4s' }}>
            <h2 className="font-display text-xl font-semibold mb-6">
              Samsvar mellom folk og Storting
            </h2>
            
            {stats.avsluttedeSaker > 0 ? (
              <div className="flex items-center justify-center h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Samsvar', value: stats.saksMedSamsvar },
                        { name: 'Avvik', value: stats.avsluttedeSaker - stats.saksMedSamsvar },
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      <Cell fill="hsl(142, 72%, 45%)" />
                      <Cell fill="hsl(0, 75%, 50%)" />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <XCircle className="h-12 w-12 mb-4" />
                <p>Ingen avsluttede saker ennå</p>
              </div>
            )}

            <div className="flex justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-success" />
                <span className="text-sm">Samsvar ({stats.saksMedSamsvar})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-destructive" />
                <span className="text-sm">Avvik ({stats.avsluttedeSaker - stats.saksMedSamsvar})</span>
              </div>
            </div>
          </div>

          {/* Tema-fordeling */}
          <div className="bg-card rounded-2xl border border-border p-6 animate-slide-up" style={{ animationDelay: '0.5s' }}>
            <h2 className="font-display text-xl font-semibold mb-6">
              Saker per tema
            </h2>

            {temaStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={temaStats} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                  <YAxis
                    dataKey="tema"
                    type="category"
                    width={100}
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="antall" radius={[0, 4, 4, 0]}>
                    {temaStats.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <Scale className="h-12 w-12 mb-4" />
                <p>Ingen saker med tema registrert</p>
              </div>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="mt-8 p-6 bg-accent/50 rounded-2xl border border-accent animate-slide-up" style={{ animationDelay: '0.6s' }}>
          <div className="flex items-start gap-4">
            <Users className="h-6 w-6 text-accent-foreground mt-0.5" />
            <div>
              <h3 className="font-semibold mb-1">Om samsvarsgraden</h3>
              <p className="text-sm text-muted-foreground">
                Samsvarsgraden viser hvor ofte folkets flertall stemmer likt som Stortingets flertall.
                En høy samsvarsgrad betyr at politikerne i stor grad følger folkeviljen.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
