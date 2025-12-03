import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Vote, BarChart3, Clock, ChevronRight, Sparkles, Users, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import KategoriBadge from '@/components/KategoriBadge';
import { formatDistanceToNow } from 'date-fns';
import { nb } from 'date-fns/locale';
import { useState } from 'react';

interface ViktigSak {
  id: string;
  tittel: string;
  kort_tittel: string | null;
  oppsummering: string | null;
  kategori: string | null;
  status: string;
  stortinget_votering_for: number | null;
  stortinget_votering_mot: number | null;
  stortinget_votering_avholdende: number | null;
  vedtak_resultat: string | null;
  folke_stemmer?: { stemme: string; user_id: string }[];
}

interface Stats {
  totalVoteringer: number;
  totalStemmer: number;
  aktiveVoteringer: number;
}

type KategoriFilter = 'alle' | 'lovendring' | 'budsjett' | 'grunnlov';

async function fetchHomeData() {
  const sb = supabase as any;
  
  // Parallel fetch all data
  const [sakerRes, statsRes, syncRes] = await Promise.all([
    // Fetch viktige saker
    sb
      .from('stortinget_saker')
      .select('id, tittel, kort_tittel, oppsummering, kategori, status, stortinget_votering_for, stortinget_votering_mot, stortinget_votering_avholdende, vedtak_resultat, argumenter_for')
      .eq('er_viktig', true)
      .not('oppsummering', 'is', null)
      .not('argumenter_for', 'eq', '[]')
      .in('behandlet_sesjon', ['2024-2025', '2025-2026'])
      .order('updated_at', { ascending: false })
      .limit(12),
    
    // Fetch all stats in parallel
    Promise.all([
      sb.from('voteringer').select('*', { count: 'exact', head: true }),
      sb.from('folke_stemmer').select('*', { count: 'exact', head: true }),
      sb.from('stortinget_saker').select('*', { count: 'exact', head: true }).eq('status', 'pågående').eq('er_viktig', true)
    ]),
    
    // Fetch last sync
    sb
      .from('sync_log')
      .select('completed_at')
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(1)
      .single()
  ]);

  const saker = sakerRes.data || [];
  const sakIds = saker.map((s: any) => s.id);
  
  // Fetch folk votes if we have saker
  let folkeData: any[] = [];
  if (sakIds.length > 0) {
    const { data: stemmer } = await sb
      .from('folke_stemmer')
      .select('stemme, user_id, sak_id')
      .in('sak_id', sakIds);
    folkeData = stemmer || [];
  }

  // Merge folk votes with saker
  const sakerWithStemmer = saker.map((s: any) => ({
    ...s,
    folke_stemmer: folkeData.filter((st: any) => st.sak_id === s.id)
  }));

  const [voteringRes, stemmerRes, aktiveRes] = statsRes;
  
  return {
    viktigeSaker: sakerWithStemmer as ViktigSak[],
    stats: {
      totalVoteringer: voteringRes.count || 0,
      totalStemmer: stemmerRes.count || 0,
      aktiveVoteringer: aktiveRes.count || 0
    } as Stats,
    lastSync: syncRes.data?.completed_at || null
  };
}

function StatCardSkeleton() {
  return (
    <div className="premium-card p-4 text-center">
      <Skeleton className="h-11 w-11 rounded-2xl mx-auto mb-3" />
      <Skeleton className="h-7 w-12 mx-auto mb-1" />
      <Skeleton className="h-3 w-16 mx-auto" />
    </div>
  );
}

function SakCardSkeleton() {
  return (
    <div className="relative nrk-card glass-shine card-glow overflow-hidden">
      <div className="absolute inset-0 glass-gradient rounded-2xl" />
      <div className="relative z-[1]">
        <div className="flex items-center justify-between mb-3">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="h-5 w-3/4 mb-2" />
        <Skeleton className="h-4 w-full mb-1" />
        <Skeleton className="h-4 w-2/3 mb-4" />
        <Skeleton className="h-2.5 w-full rounded-full mb-3" />
        <Skeleton className="h-2.5 w-full rounded-full" />
      </div>
    </div>
  );
}

export default function Index() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<KategoriFilter>('alle');

  const { data, isLoading } = useQuery({
    queryKey: ['home-data'],
    queryFn: fetchHomeData,
    staleTime: 1000 * 60 * 5, // 5 min cache
  });

  const viktigeSaker = data?.viktigeSaker || [];
  const stats = data?.stats || { totalVoteringer: 0, totalStemmer: 0, aktiveVoteringer: 0 };
  const lastSync = data?.lastSync;

  const getFolkeCounts = (sak: ViktigSak) => {
    const stemmer = sak.folke_stemmer || [];
    return {
      for: stemmer.filter(s => s.stemme === 'for').length,
      mot: stemmer.filter(s => s.stemme === 'mot').length,
      avholdende: stemmer.filter(s => s.stemme === 'avholdende').length,
      total: stemmer.length,
    };
  };

  const filteredSaker = viktigeSaker.filter(sak => {
    if (filter === 'alle') return true;
    return (sak.kategori || '').toLowerCase() === filter;
  });

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
          {isLoading ? (
            <>
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </>
          ) : (
            <>
              <div className="relative nrk-stat-card animate-ios-slide-up stagger-1 glass-shine card-glow overflow-hidden">
                <div className="absolute inset-0 glass-gradient rounded-3xl" />
                <div className="relative z-[1]">
                  <div className="h-11 w-11 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto mb-3">
                    <Vote className="h-5 w-5 text-primary" />
                  </div>
                  <p className="text-2xl font-bold">{stats.totalStemmer}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Stemmer</p>
                </div>
              </div>
              
              <div className="relative nrk-stat-card animate-ios-slide-up stagger-2 glass-shine card-glow overflow-hidden">
                <div className="absolute inset-0 glass-gradient rounded-3xl" />
                <div className="relative z-[1]">
                  <div className="h-11 w-11 rounded-2xl bg-vote-for/15 flex items-center justify-center mx-auto mb-3">
                    <Clock className="h-5 w-5 text-vote-for" />
                  </div>
                  <p className="text-2xl font-bold">{stats.aktiveVoteringer}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Aktive</p>
                </div>
              </div>
              
              <div className="relative nrk-stat-card animate-ios-slide-up stagger-3 glass-shine card-glow overflow-hidden">
                <div className="absolute inset-0 glass-gradient rounded-3xl" />
                <div className="relative z-[1]">
                  <div className="h-11 w-11 rounded-2xl bg-ios-orange/15 flex items-center justify-center mx-auto mb-3">
                    <BarChart3 className="h-5 w-5 text-ios-orange" />
                  </div>
                  <p className="text-2xl font-bold">{stats.totalVoteringer}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Totalt</p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Viktige Saker Nå - NRK Style */}
        <div className="animate-ios-slide-up stagger-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold">Viktige saker nå</h2>
            </div>
            <Link to="/saker" className="text-primary text-sm font-medium ios-touch flex items-center gap-1">
              Se alle
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Category filters */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2 -mx-4 px-4">
            {[
              { key: 'alle', label: 'Alle' },
              { key: 'lovendring', label: 'Lovendring' },
              { key: 'budsjett', label: 'Budsjett' },
              { key: 'grunnlov', label: 'Grunnlov' },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => setFilter(item.key as KategoriFilter)}
                className={cn(
                  'nrk-filter-btn whitespace-nowrap',
                  filter === item.key ? 'nrk-filter-btn-active' : 'nrk-filter-btn-inactive'
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Saker list */}
          <div className="space-y-3">
            {isLoading ? (
              <>
                <SakCardSkeleton />
                <SakCardSkeleton />
                <SakCardSkeleton />
              </>
            ) : filteredSaker.length > 0 ? (
              filteredSaker.slice(0, 5).map((sak, index) => {
                const folkeCounts = getFolkeCounts(sak);
                const hasStortingetVotes = (sak.stortinget_votering_for || 0) > 0 || (sak.stortinget_votering_mot || 0) > 0;
                const isAvsluttet = sak.status === 'avsluttet';
                const stortingetTotal = (sak.stortinget_votering_for || 0) + (sak.stortinget_votering_mot || 0) + (sak.stortinget_votering_avholdende || 0);
                const folkeForPct = folkeCounts.total > 0 ? Math.round((folkeCounts.for / folkeCounts.total) * 100) : 0;
                const stortingetForPct = stortingetTotal > 0 ? Math.round(((sak.stortinget_votering_for || 0) / stortingetTotal) * 100) : 0;

                return (
                  <Link
                    key={sak.id}
                    to={`/sak/${sak.id}`}
                    className="relative nrk-card block ios-press animate-ios-slide-up glass-shine card-glow overflow-hidden"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className="absolute inset-0 glass-gradient rounded-2xl" />
                    <div className="relative z-[1]">
                      {/* Header with kategori and status */}
                      <div className="flex items-center justify-between mb-3">
                        <KategoriBadge kategori={sak.kategori} size="sm" />
                        <span className={cn(
                          'px-2 py-1 rounded-full text-[10px] font-medium',
                          isAvsluttet ? 'bg-secondary text-secondary-foreground' : 'bg-vote-for/20 text-vote-for'
                        )}>
                          {isAvsluttet ? 'Avsluttet' : 'Pågående'}
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="font-semibold text-[15px] leading-snug mb-2 line-clamp-2">
                        {sak.kort_tittel || sak.tittel}
                      </h3>

                      {/* Summary */}
                      {sak.oppsummering && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                          {sak.oppsummering}
                        </p>
                      )}

                      {/* Results */}
                      <div className="space-y-3">
                        {/* Folket */}
                        {folkeCounts.total > 0 && (
                          <div>
                            <div className="flex items-center justify-between text-xs mb-1.5">
                              <span className="text-muted-foreground flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                Folket
                              </span>
                              <span className="font-semibold text-vote-for">{folkeForPct}% for</span>
                            </div>
                            <div className="nrk-progress-bar">
                              <div className="flex h-full">
                                <div 
                                  className="bg-vote-for h-full transition-all duration-500"
                                  style={{ width: `${folkeForPct}%` }}
                                />
                                <div 
                                  className="bg-vote-mot h-full transition-all duration-500"
                                  style={{ width: `${folkeCounts.total > 0 ? Math.round((folkeCounts.mot / folkeCounts.total) * 100) : 0}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Stortinget */}
                        {hasStortingetVotes && (
                          <div>
                            <div className="flex items-center justify-between text-xs mb-1.5">
                              <span className="text-muted-foreground">Stortinget</span>
                              <span className="font-semibold">{stortingetForPct}% for</span>
                            </div>
                            <div className="nrk-progress-bar">
                              <div className="flex h-full">
                                <div 
                                  className="bg-vote-for/70 h-full transition-all duration-500"
                                  style={{ width: `${stortingetForPct}%` }}
                                />
                                <div 
                                  className="bg-vote-mot/70 h-full transition-all duration-500"
                                  style={{ width: `${stortingetTotal > 0 ? Math.round(((sak.stortinget_votering_mot || 0) / stortingetTotal) * 100) : 0}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/30">
                        <span className="text-xs text-muted-foreground">
                          {folkeCounts.total} stemmer fra folket
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </Link>
                );
              })
            ) : (
              <div className="premium-card p-12 text-center text-muted-foreground">
                <Filter className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p className="text-sm">Ingen saker i denne kategorien</p>
              </div>
            )}
          </div>
          
          {/* Last sync indicator */}
          {lastSync && (
            <p className="text-xs text-muted-foreground text-center mt-4">
              Oppdatert {formatDistanceToNow(new Date(lastSync), { addSuffix: true, locale: nb })}
            </p>
          )}
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-2 gap-3 animate-ios-slide-up" style={{ animationDelay: '0.3s' }}>
          <Link 
            to="/representanter" 
            className="relative premium-card p-4 ios-press glass-shine card-glow overflow-hidden"
          >
            <div className="absolute inset-0 glass-gradient rounded-3xl" />
            <div className="relative z-[1]">
              <div className="h-10 w-10 rounded-xl bg-ios-purple/15 flex items-center justify-center mb-2">
                <Users className="h-5 w-5 text-ios-purple" />
              </div>
              <p className="font-semibold text-sm">Politikere</p>
              <p className="text-xs text-muted-foreground">Utforsk representanter</p>
            </div>
          </Link>
          
          <Link 
            to="/statistikk" 
            className="relative premium-card p-4 ios-press glass-shine card-glow overflow-hidden"
          >
            <div className="absolute inset-0 glass-gradient rounded-3xl" />
            <div className="relative z-[1]">
              <div className="h-10 w-10 rounded-xl bg-ios-orange/15 flex items-center justify-center mb-2">
                <BarChart3 className="h-5 w-5 text-ios-orange" />
              </div>
              <p className="font-semibold text-sm">Statistikk</p>
              <p className="text-xs text-muted-foreground">Se analyser</p>
            </div>
          </Link>
        </div>

        {/* How it works */}
        <div className="animate-ios-slide-up" style={{ animationDelay: '0.35s' }}>
          <h2 className="text-lg font-semibold mb-3">Slik fungerer det</h2>
          <div className="relative premium-card overflow-hidden divide-y divide-border/30 glass-shine">
            <div className="absolute inset-0 glass-gradient rounded-3xl" />
            {[
              { num: 1, title: 'Registrer deg', desc: 'Anonymt og sikkert', color: 'bg-primary text-primary-foreground' },
              { num: 2, title: 'Les argumentene', desc: 'For og mot saken', color: 'bg-vote-for text-vote-for-foreground' },
              { num: 3, title: 'Stem', desc: 'For, mot eller avstå', color: 'bg-ios-orange text-white' },
              { num: 4, title: 'Sammenlign', desc: 'Folket vs. Stortinget', color: 'bg-ios-purple text-white' },
            ].map((step, index) => (
              <div key={step.num} className="relative z-[1] flex items-center gap-4 p-4" style={{ animationDelay: `${0.4 + index * 0.05}s` }}>
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
