import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';
import Layout from '@/components/Layout';
import PremiumCaseCard from '@/components/PremiumCaseCard';
import { Input } from '@/components/ui/input';
import { Search, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
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
  stengt_dato: string | null;
  vedtak_resultat: string | null;
  stortinget_votering_for: number | null;
  stortinget_votering_mot: number | null;
  stortinget_votering_avholdende: number | null;
  argumenter_for: Json | null;
  argumenter_mot: Json | null;
  folke_stemmer?: { stemme: string; user_id: string }[];
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
      // Only fetch saker with complete AI content (oppsummering + argumenter)
      let query = supabase
        .from('stortinget_saker')
        .select(`*, folke_stemmer(stemme, user_id)`)
        .in('behandlet_sesjon', ['2024-2025', '2025-2026'])
        .eq('er_viktig', true)
        .not('oppsummering', 'is', null)
        .not('argumenter_for', 'eq', '[]')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'alle') {
        query = query.eq('status', statusFilter);
      }

      if (search) {
        query = query.or(`tittel.ilike.%${search}%,kort_tittel.ilike.%${search}%,oppsummering.ilike.%${search}%`);
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;
      setSaker(data || []);
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

  const getUserVote = (sak: Sak) => {
    if (!user || !sak.folke_stemmer) return null;
    const vote = sak.folke_stemmer.find(v => v.user_id === user.id);
    return vote?.stemme || null;
  };

  const getFolkeCounts = (sak: Sak) => {
    const stemmer = sak.folke_stemmer || [];
    return {
      for: stemmer.filter(s => s.stemme === 'for').length,
      mot: stemmer.filter(s => s.stemme === 'mot').length,
      avholdende: stemmer.filter(s => s.stemme === 'avholdende').length,
    };
  };

  // Get featured sak (first one with AI summary)
  const featuredSak = saker[0];

  return (
    <Layout title="Saker">
      <div className="px-4 py-4 space-y-4 animate-ios-fade">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold">Viktige saker</h1>
          <p className="text-sm text-muted-foreground">
            {saker.length} saker fra 2024-2026
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
          <div className="space-y-4">
            {/* Featured card */}
            {featuredSak && statusFilter === 'alle' && (
              <div className="mb-2">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-medium text-primary">Aktuelt</span>
                </div>
                <PremiumCaseCard
                  id={featuredSak.id}
                  tittel={featuredSak.tittel}
                  kortTittel={featuredSak.kort_tittel}
                  oppsummering={featuredSak.oppsummering}
                  kategori={featuredSak.kategori}
                  status={featuredSak.status}
                  bildeUrl={featuredSak.bilde_url}
                  stengtDato={featuredSak.stengt_dato}
                  vedtakResultat={featuredSak.vedtak_resultat}
                  stortingetFor={featuredSak.stortinget_votering_for}
                  stortingetMot={featuredSak.stortinget_votering_mot}
                  stortingetAvholdende={featuredSak.stortinget_votering_avholdende}
                  folkeFor={getFolkeCounts(featuredSak).for}
                  folkeMot={getFolkeCounts(featuredSak).mot}
                  folkeAvholdende={getFolkeCounts(featuredSak).avholdende}
                  userVote={getUserVote(featuredSak)}
                  argumenterFor={featuredSak.argumenter_for as string[] | null}
                  argumenterMot={featuredSak.argumenter_mot as string[] | null}
                  variant="featured"
                  onVoteUpdate={fetchSaker}
                />
              </div>
            )}

            {/* Regular cards */}
            <div className="space-y-3">
              {saker
                .filter(s => statusFilter !== 'alle' || s.id !== featuredSak?.id)
                .map((sak, index) => {
                  const folkeCounts = getFolkeCounts(sak);
                  return (
                    <PremiumCaseCard
                      key={sak.id}
                      id={sak.id}
                      tittel={sak.tittel}
                      kortTittel={sak.kort_tittel}
                      oppsummering={sak.oppsummering}
                      kategori={sak.kategori}
                      status={sak.status}
                      bildeUrl={sak.bilde_url}
                      stengtDato={sak.stengt_dato}
                      vedtakResultat={sak.vedtak_resultat}
                      stortingetFor={sak.stortinget_votering_for}
                      stortingetMot={sak.stortinget_votering_mot}
                      stortingetAvholdende={sak.stortinget_votering_avholdende}
                      folkeFor={folkeCounts.for}
                      folkeMot={folkeCounts.mot}
                      folkeAvholdende={folkeCounts.avholdende}
                      userVote={getUserVote(sak)}
                      argumenterFor={sak.argumenter_for as string[] | null}
                      argumenterMot={sak.argumenter_mot as string[] | null}
                      index={index}
                      variant="card"
                      onVoteUpdate={fetchSaker}
                    />
                  );
                })}
            </div>
          </div>
        ) : (
          <div className="ios-card rounded-2xl p-8 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">
              {search ? 'Ingen saker funnet' : 'Ingen saker tilgjengelig ennå'}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Nye saker legges til fortløpende
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