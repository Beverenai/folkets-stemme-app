import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';
import Layout from '@/components/Layout';
import { Input } from '@/components/ui/input';
import { Search, FileText, Vote, Users, ChevronRight, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import KategoriBadge from '@/components/KategoriBadge';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';

interface Sak {
  id: string;
  tittel: string;
  kort_tittel: string | null;
  oppsummering: string | null;
  kategori: string | null;
  status: string;
  vedtak_resultat: string | null;
  stortinget_votering_for: number | null;
  stortinget_votering_mot: number | null;
  siste_votering_dato: string | null;
  folke_stemmer?: { stemme: string }[];
}

type FilterStatus = 'alle' | 'pågående' | 'avsluttet';

export default function Saker() {
  const { user } = useAuth();
  const [saker, setSaker] = useState<Sak[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('alle');

  const fetchSaker = async () => {
    try {
      // First get sak IDs that have votings WITH REAL RESULTS
      const { data: voteringData } = await supabase
        .from('voteringer')
        .select('sak_id, votering_dato')
        .not('sak_id', 'is', null)
        .gt('resultat_for', 0)
        .order('votering_dato', { ascending: false });
      
      const sakVoteringMap = new Map<string, string>();
      (voteringData || []).forEach((v) => {
        if (v.sak_id && !sakVoteringMap.has(v.sak_id)) {
          sakVoteringMap.set(v.sak_id, v.votering_dato || '');
        }
      });
      const sakIdsWithVotings = Array.from(sakVoteringMap.keys());

      if (sakIdsWithVotings.length === 0) {
        setSaker([]);
        setLoading(false);
        return;
      }

      let query = supabase
        .from('stortinget_saker')
        .select(`id, tittel, kort_tittel, oppsummering, kategori, status, vedtak_resultat, 
                 stortinget_votering_for, stortinget_votering_mot`)
        .eq('er_viktig', true)
        .not('oppsummering', 'is', null)
        .not('argumenter_for', 'eq', '[]')
        .in('id', sakIdsWithVotings)
        .order('updated_at', { ascending: false });

      if (statusFilter !== 'alle') {
        query = query.eq('status', statusFilter);
      }

      if (search) {
        query = query.or(`tittel.ilike.%${search}%,kort_tittel.ilike.%${search}%,oppsummering.ilike.%${search}%`);
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;
      
      const sakIds = (data || []).map(s => s.id);
      
      // Fetch folk votes
      let folkeData: any[] = [];
      if (sakIds.length > 0) {
        const { data: stemmer } = await supabase
          .from('folke_stemmer')
          .select('stemme, sak_id')
          .in('sak_id', sakIds);
        folkeData = stemmer || [];
      }

      const sakerWithDates = (data || []).map((sak) => ({
        ...sak,
        siste_votering_dato: sakVoteringMap.get(sak.id) || null,
        folke_stemmer: folkeData.filter(s => s.sak_id === sak.id)
      }));
      
      setSaker(sakerWithDates);
    } catch (error) {
      console.error('Error fetching saker:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSaker();
  }, [statusFilter, search]);

  const filters: { value: FilterStatus; label: string }[] = [
    { value: 'alle', label: 'Alle' },
    { value: 'pågående', label: 'Pågående' },
    { value: 'avsluttet', label: 'Avsluttet' },
  ];

  const getFolkeCounts = (sak: Sak) => {
    const stemmer = sak.folke_stemmer || [];
    return {
      for: stemmer.filter(s => s.stemme === 'for').length,
      mot: stemmer.filter(s => s.stemme === 'mot').length,
      total: stemmer.length,
    };
  };

  return (
    <Layout title="Saker">
      <div className="px-4 py-4 space-y-4 animate-ios-fade">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2">
            <Vote className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold">Saker til votering</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {saker.length} saker med faktiske voteringer
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Søk i saker..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11 bg-secondary border-0 rounded-xl"
          />
        </div>

        {/* Segmented Control */}
        <div className="flex gap-1 p-1 bg-secondary rounded-xl">
          {filters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={cn(
                'flex-1 py-2 text-sm font-medium rounded-lg transition-all ios-press',
                statusFilter === filter.value
                  ? 'bg-card shadow-sm text-foreground'
                  : 'text-muted-foreground'
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading ? (
          <div className="p-12 text-center">
            <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground mt-3">Laster saker...</p>
          </div>
        ) : saker.length > 0 ? (
          <div className="space-y-3">
            {saker.map((sak, index) => {
              const folkeCounts = getFolkeCounts(sak);
              const hasStortingetVotes = (sak.stortinget_votering_for || 0) > 0;
              const stortingetTotal = (sak.stortinget_votering_for || 0) + (sak.stortinget_votering_mot || 0);
              const folkeForPct = folkeCounts.total > 0 ? Math.round((folkeCounts.for / folkeCounts.total) * 100) : 0;
              const stortingetForPct = stortingetTotal > 0 ? Math.round(((sak.stortinget_votering_for || 0) / stortingetTotal) * 100) : 0;
              
              const voteringDato = sak.siste_votering_dato 
                ? format(new Date(sak.siste_votering_dato), 'd. MMM', { locale: nb })
                : null;

              return (
                <Link
                  key={sak.id}
                  to={`/sak/${sak.id}`}
                  className="relative nrk-card block ios-press animate-ios-slide-up glass-shine card-glow overflow-hidden"
                  style={{ animationDelay: `${index * 0.03}s` }}
                >
                  <div className="absolute inset-0 glass-gradient rounded-2xl" />
                  <div className="relative z-[1]">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                      <KategoriBadge kategori={sak.kategori} size="sm" />
                      <div className="flex items-center gap-2">
                        {sak.vedtak_resultat && (
                          <span className={cn(
                            'px-2 py-1 rounded-full text-[10px] font-medium flex items-center gap-1',
                            sak.vedtak_resultat === 'vedtatt' 
                              ? 'bg-vote-for/20 text-vote-for' 
                              : 'bg-vote-mot/20 text-vote-mot'
                          )}>
                            {sak.vedtak_resultat === 'vedtatt' 
                              ? <><CheckCircle className="h-3 w-3" /> Vedtatt</>
                              : <><XCircle className="h-3 w-3" /> Avvist</>
                            }
                          </span>
                        )}
                        {voteringDato && (
                          <span className="px-2 py-1 rounded-full text-[10px] font-medium flex items-center gap-1 bg-primary/20 text-primary">
                            <Vote className="h-3 w-3" />
                            {voteringDato}
                          </span>
                        )}
                      </div>
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
                      {folkeCounts.total > 0 && (
                        <div>
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="text-muted-foreground flex items-center gap-1">
                              <Users className="h-3 w-3" /> Folket
                            </span>
                            <span className="font-semibold text-vote-for">{folkeForPct}% for</span>
                          </div>
                          <div className="nrk-progress-bar">
                            <div className="flex h-full">
                              <div className="bg-vote-for h-full" style={{ width: `${folkeForPct}%` }} />
                              <div className="bg-vote-mot h-full" style={{ width: `${100 - folkeForPct}%` }} />
                            </div>
                          </div>
                        </div>
                      )}

                      {hasStortingetVotes && (
                        <div>
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="text-muted-foreground">🏛️ Stortinget</span>
                            <span className="font-semibold">{stortingetForPct}% for</span>
                          </div>
                          <div className="nrk-progress-bar">
                            <div className="flex h-full">
                              <div className="bg-vote-for/70 h-full" style={{ width: `${stortingetForPct}%` }} />
                              <div className="bg-vote-mot/70 h-full" style={{ width: `${100 - stortingetForPct}%` }} />
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
            })}
          </div>
        ) : (
          <div className="ios-card rounded-2xl p-8 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">
              {search ? 'Ingen saker funnet' : 'Ingen saker tilgjengelig'}
            </p>
          </div>
        )}

        {saker.length > 0 && (
          <p className="text-center text-xs text-muted-foreground pb-4">
            Viser {saker.length} {saker.length === 1 ? 'sak' : 'saker'}
          </p>
        )}
      </div>
    </Layout>
  );
}
