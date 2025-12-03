import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Vote, Scale, CheckCircle, TrendingUp, Building2, BarChart3, Calendar, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import PartiSamsvarsChart from '@/components/charts/PartiSamsvarsChart';
import KategoriAvvikChart from '@/components/charts/KategoriAvvikChart';
import MånedligAktivitetChart from '@/components/charts/MånedligAktivitetChart';

interface StatsData {
  totalSaker: number;
  totalStemmer: number;
  samsvarsgrad: number;
  avsluttedeSaker: number;
  saksMedSamsvar: number;
  avvikSaker: number;
}

export default function Statistikk() {
  const [stats, setStats] = useState<StatsData>({
    totalSaker: 0, totalStemmer: 0, samsvarsgrad: 0, avsluttedeSaker: 0, saksMedSamsvar: 0, avvikSaker: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const sb = supabase as any;
        const { count: totalSaker } = await sb.from('stortinget_saker').select('*', { count: 'exact', head: true }).eq('er_viktig', true);
        const { count: totalStemmer } = await sb.from('folke_stemmer').select('*', { count: 'exact', head: true });

        const { data: avsluttedeSaker } = await sb
          .from('stortinget_saker')
          .select(`id, stortinget_votering_for, stortinget_votering_mot, folke_stemmer(stemme)`)
          .eq('status', 'avsluttet')
          .eq('er_viktig', true)
          .not('stortinget_votering_for', 'is', null);

        let saksMedSamsvar = 0;
        if (avsluttedeSaker) {
          avsluttedeSaker.forEach((sak: any) => {
            const folkeFor = sak.folke_stemmer?.filter((s: any) => s.stemme === 'for').length || 0;
            const folkeMot = sak.folke_stemmer?.filter((s: any) => s.stemme === 'mot').length || 0;
            const folkeTotal = sak.folke_stemmer?.length || 0;
            
            if (folkeTotal > 0) {
              const folkeMajority = folkeFor > folkeMot ? 'for' : 'mot';
              const stortingetMajority = (sak.stortinget_votering_for || 0) > (sak.stortinget_votering_mot || 0) ? 'for' : 'mot';
              if (folkeMajority === stortingetMajority) saksMedSamsvar++;
            }
          });
        }

        const avsluttetCount = avsluttedeSaker?.length || 0;
        const samsvarsgrad = avsluttetCount > 0 ? Math.round((saksMedSamsvar / avsluttetCount) * 100) : 0;

        setStats({
          totalSaker: totalSaker || 0,
          totalStemmer: totalStemmer || 0,
          samsvarsgrad,
          avsluttedeSaker: avsluttetCount,
          saksMedSamsvar,
          avvikSaker: avsluttetCount - saksMedSamsvar,
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
    { icon: Vote, label: 'Stemmer', value: stats.totalStemmer, color: 'bg-primary/15 text-primary' },
    { icon: Scale, label: 'Viktige saker', value: stats.totalSaker, color: 'bg-ios-purple/15 text-ios-purple' },
    { icon: CheckCircle, label: 'Avsluttet', value: stats.avsluttedeSaker, color: 'bg-vote-for/15 text-vote-for' },
    { icon: TrendingUp, label: 'Samsvar', value: `${stats.samsvarsgrad}%`, color: 'bg-ios-orange/15 text-ios-orange' },
  ];

  return (
    <Layout title="Statistikk">
      <div className="px-4 py-4 space-y-5 animate-ios-fade">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="nrk-stat-card animate-ios-slide-up"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center mb-3 mx-auto', stat.color.split(' ')[0])}>
                  <Icon className={cn('h-5 w-5', stat.color.split(' ')[1])} />
                </div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            );
          })}
        </div>

        {/* Samsvar Overview */}
        <div className="nrk-card animate-ios-slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="nrk-section-header">
            <Scale className="h-5 w-5 text-primary" />
            Samsvar: Folket vs. Stortinget
          </div>
          
          {stats.avsluttedeSaker > 0 ? (
            <>
              <div className="relative h-36 w-36 mx-auto mb-4">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <circle
                    cx="18" cy="18" r="15"
                    fill="none"
                    stroke="hsl(var(--secondary))"
                    strokeWidth="3"
                  />
                  <circle
                    cx="18" cy="18" r="15"
                    fill="none"
                    stroke="hsl(var(--vote-for))"
                    strokeWidth="3"
                    strokeDasharray={`${stats.samsvarsgrad} 100`}
                    strokeLinecap="round"
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-bold">{stats.samsvarsgrad}%</span>
                  <span className="text-xs text-muted-foreground">samsvar</span>
                </div>
              </div>

              <div className="flex justify-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-vote-for" />
                  <span>Enige ({stats.saksMedSamsvar})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-vote-mot" />
                  <span>Uenige ({stats.avvikSaker})</span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground text-center mt-4">
                Basert på {stats.avsluttedeSaker} avsluttede saker med folkeavstemning
              </p>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Scale className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Ingen avsluttede saker med stemmer ennå</p>
            </div>
          )}
        </div>

        {/* Parti Samsvar */}
        <div className="nrk-card animate-ios-slide-up" style={{ animationDelay: '0.25s' }}>
          <div className="nrk-section-header">
            <Building2 className="h-5 w-5 text-primary" />
            Partienes enighet med folket
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Hvor ofte stemmer hvert parti likt som folkets flertall
          </p>
          <PartiSamsvarsChart />
        </div>

        {/* Kategori Avvik */}
        <div className="nrk-card animate-ios-slide-up" style={{ animationDelay: '0.3s' }}>
          <div className="nrk-section-header">
            <AlertTriangle className="h-5 w-5 text-vote-avholdende" />
            Avvik per sakskategori
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Hvilke type saker har størst uenighet mellom folk og Stortinget
          </p>
          <KategoriAvvikChart />
        </div>

        {/* Månedlig Aktivitet */}
        <div className="nrk-card animate-ios-slide-up" style={{ animationDelay: '0.35s' }}>
          <div className="nrk-section-header">
            <Calendar className="h-5 w-5 text-primary" />
            Månedlig aktivitet
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Antall viktige saker de siste 12 månedene
          </p>
          <MånedligAktivitetChart />
        </div>

        {/* Info */}
        <div className="nrk-card animate-ios-slide-up" style={{ animationDelay: '0.4s' }}>
          <div className="nrk-section-header">
            <BarChart3 className="h-5 w-5 text-primary" />
            Om statistikken
          </div>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              <strong className="text-foreground">Samsvarsgrad:</strong> Viser hvor ofte folkets flertall stemmer likt som Stortingets flertall. Høy samsvarsgrad betyr at politikerne følger folkeviljen.
            </p>
            <p>
              <strong className="text-foreground">Parti-enighet:</strong> Beregnes ved å sammenligne hvert partis flertall med folkets flertall på hver sak.
            </p>
            <p>
              <strong className="text-foreground">Avvik per kategori:</strong> Viser hvilke typer saker (lovendringer, budsjett, etc.) som har størst uenighet mellom folk og politikere.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
