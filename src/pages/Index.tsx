import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3, ChevronRight, Sparkles, Users, Vote } from 'lucide-react';
import KategoriBadge from '@/components/KategoriBadge';
import { formatDistanceToNow, format } from 'date-fns';
import { nb } from 'date-fns/locale';

interface ViktigSak {
  id: string;
  tittel: string;
  kort_tittel: string | null;
  spoersmaal: string | null;
  oppsummering: string | null;
  kategori: string | null;
  status: string;
  updated_at: string;
  siste_votering_dato: string | null;
  stortinget_votering_for: number | null;
  stortinget_votering_mot: number | null;
  stortinget_votering_avholdende: number | null;
  vedtak_resultat: string | null;
  folke_stemmer?: { stemme: string; user_id: string }[];
}

async function fetchHomeData() {
  const sb = supabase as any;
  
  // First get sak IDs that have votings WITH REAL RESULTS
  const { data: voteringData } = await sb
    .from('voteringer')
    .select('sak_id, votering_dato')
    .not('sak_id', 'is', null)
    .gt('resultat_for', 0)  // Only votings with actual results
    .order('votering_dato', { ascending: false });
  
  // Group by sak_id and get latest votering_dato
  const sakVoteringMap = new Map<string, string>();
  (voteringData || []).forEach((v: any) => {
    if (v.sak_id && !sakVoteringMap.has(v.sak_id)) {
      sakVoteringMap.set(v.sak_id, v.votering_dato);
    }
  });
  const sakIdsWithVotings = Array.from(sakVoteringMap.keys());

  // Parallel fetch saker and sync
  const [sakerRes, syncRes] = await Promise.all([
    sb
      .from('stortinget_saker')
      .select('id, tittel, kort_tittel, spoersmaal, oppsummering, kategori, status, updated_at, stortinget_votering_for, stortinget_votering_mot, stortinget_votering_avholdende, vedtak_resultat, argumenter_for')
      .eq('er_viktig', true)
      .eq('status', 'pågående')
      .not('oppsummering', 'is', null)
      .not('argumenter_for', 'eq', '[]')
      .in('id', sakIdsWithVotings.length > 0 ? sakIdsWithVotings : ['00000000-0000-0000-0000-000000000000'])
      .order('updated_at', { ascending: false })
      .limit(12),
    
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

  // Merge folk votes and votering dates with saker
  const sakerWithStemmer = saker.map((s: any) => ({
    ...s,
    siste_votering_dato: sakVoteringMap.get(s.id) || null,
    folke_stemmer: folkeData.filter((st: any) => st.sak_id === s.id)
  }));
  
  return {
    viktigeSaker: sakerWithStemmer as ViktigSak[],
    lastSync: syncRes.data?.completed_at || null
  };
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

  const { data, isLoading } = useQuery({
    queryKey: ['home-data'],
    queryFn: fetchHomeData,
    staleTime: 1000 * 60 * 5, // 5 min cache
  });

  const viktigeSaker = data?.viktigeSaker || [];
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

  return (
    <Layout title="Hjem">
      <div className="px-4 py-6 space-y-6 animate-ios-fade">
        {/* CTA for non-logged in users */}
        {!user && (
          <div className="animate-ios-spring">
            <Button asChild className="w-full h-12 text-base font-semibold ios-press rounded-xl">
              <Link to="/auth">
                <Sparkles className="mr-2 h-5 w-5" />
                Kom i gang
              </Link>
            </Button>
          </div>
        )}

        {/* Stem før Stortinget */}
        <div className="animate-ios-slide-up stagger-1">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">🔥</span>
              <div>
                <h2 className="text-lg font-bold">Stem før Stortinget</h2>
                <p className="text-xs text-muted-foreground">{viktigeSaker.length} saker venter på din stemme</p>
              </div>
            </div>
            <Link to="/saker" className="text-primary text-sm font-medium ios-touch flex items-center gap-1">
              Se alle
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Saker list */}
          <div className="space-y-3">
            {isLoading ? (
              <>
                <SakCardSkeleton />
                <SakCardSkeleton />
                <SakCardSkeleton />
              </>
            ) : viktigeSaker.length > 0 ? (
              viktigeSaker.slice(0, 5).map((sak, index) => {
                const folkeCounts = getFolkeCounts(sak);
                const hasStortingetVotes = (sak.stortinget_votering_for || 0) > 0 || (sak.stortinget_votering_mot || 0) > 0;
                const stortingetTotal = (sak.stortinget_votering_for || 0) + (sak.stortinget_votering_mot || 0) + (sak.stortinget_votering_avholdende || 0);
                const folkeForPct = folkeCounts.total > 0 ? Math.round((folkeCounts.for / folkeCounts.total) * 100) : 0;
                const stortingetForPct = stortingetTotal > 0 ? Math.round(((sak.stortinget_votering_for || 0) / stortingetTotal) * 100) : 0;
                
                // Voting date formatting
                const voteringDato = sak.siste_votering_dato 
                  ? format(new Date(sak.siste_votering_dato), 'd. MMM', { locale: nb })
                  : null;

                return (
                  <Link
                    key={sak.id}
                    to={`/sak/${sak.id}`}
                    className="relative nrk-card block ios-press animate-ios-slide-up glass-shine card-glow overflow-hidden"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className="absolute inset-0 glass-gradient rounded-2xl" />
                    <div className="relative z-[1]">
                      {/* Header with kategori and voting date */}
                      <div className="flex items-center justify-between mb-3">
                        <KategoriBadge kategori={sak.kategori} size="sm" />
                        {voteringDato && (
                          <span className="px-2 py-1 rounded-full text-[10px] font-medium flex items-center gap-1 bg-ios-orange/20 text-ios-orange">
                            <Vote className="h-3 w-3" />
                            Votert {voteringDato}
                          </span>
                        )}
                      </div>

                      {/* Title - use spoersmaal if available */}
                      <h3 className="font-semibold text-[15px] leading-snug mb-2 line-clamp-2">
                        {sak.spoersmaal || sak.kort_tittel || sak.tittel}
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
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p className="text-sm">Ingen saker tilgjengelig</p>
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
      </div>
    </Layout>
  );
}