import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import VoteringCard from '@/components/VoteringCard';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Vote, Sparkles, Scale, Coins, BookOpen, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

interface Votering {
  id: string;
  stortinget_votering_id: string;
  forslag_tekst: string | null;
  oppsummering: string | null;
  votering_dato: string | null;
  status: string;
  resultat_for: number;
  resultat_mot: number;
  resultat_avholdende: number;
  vedtatt: boolean | null;
  sak_id: string | null;
  stortinget_saker?: {
    tittel: string;
    stortinget_id: string;
    kategori: string | null;
    status: string;
  } | null;
  folke_stemmer?: { stemme: string; user_id: string }[];
}

type FilterStatus = 'alle' | 'pågående' | 'avsluttet';
type FilterKategori = 'alle' | 'lovendring' | 'budsjett' | 'grunnlov' | 'melding';

const kategoriConfig: { value: FilterKategori; label: string; icon: React.ReactNode }[] = [
  { value: 'alle', label: 'Alle', icon: <FileText className="w-4 h-4" /> },
  { value: 'lovendring', label: 'Lover', icon: <Scale className="w-4 h-4" /> },
  { value: 'budsjett', label: 'Budsjett', icon: <Coins className="w-4 h-4" /> },
  { value: 'grunnlov', label: 'Grunnlov', icon: <BookOpen className="w-4 h-4" /> },
  { value: 'melding', label: 'Meldinger', icon: <FileText className="w-4 h-4" /> },
];

const fetchVoteringerData = async (statusFilter: FilterStatus, kategoriFilter: FilterKategori, search: string) => {
  const sb = supabase as any;
  
  // Build main query - kun voteringer med AI-oppsummering
  let query = sb
    .from('voteringer')
    .select(`
      *,
      stortinget_saker(tittel, stortinget_id, kategori, status)
    `)
    .not('oppsummering', 'is', null)
    .order('votering_dato', { ascending: false, nullsFirst: false })
    .limit(50);

  // Filter by sak status
  if (statusFilter !== 'alle') {
    query = query.eq('stortinget_saker.status', statusFilter);
  }

  if (search) {
    query = query.or(`forslag_tekst.ilike.%${search}%,oppsummering.ilike.%${search}%`);
  }

  // Fetch voteringer and all folke_stemmer in parallel
  const [voteringerResult, stemmerResult] = await Promise.all([
    query,
    sb.from('folke_stemmer').select('stemme, user_id, votering_id')
  ]);

  if (voteringerResult.error) throw voteringerResult.error;

  let filteredData = voteringerResult.data || [];
  
  // BACKUP FILTER: Fjern voteringer uten AI-oppsummering (i tilfelle DB-filter ikke fungerer)
  filteredData = filteredData.filter((v: any) => 
    v.oppsummering && v.oppsummering.length > 0
  );
  
  // Filter by kategori (client-side since it's a joined field)
  if (kategoriFilter !== 'alle') {
    filteredData = filteredData.filter((v: any) => 
      v.stortinget_saker?.kategori === kategoriFilter
    );
  }

  const folkeData = stemmerResult.data || [];

  // Merge folke_stemmer with voteringer
  return filteredData.map((v: any) => ({
    ...v,
    folke_stemmer: folkeData.filter((s: any) => s.votering_id === v.id)
  })) as Votering[];
};

function VoteringCardSkeleton() {
  return (
    <div className="bg-card rounded-2xl border border-border/50 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <Skeleton className="h-2 w-full rounded-full mb-3" />
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}

export default function Voteringer() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('pågående');
  const [kategoriFilter, setKategoriFilter] = useState<FilterKategori>('alle');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: voteringer = [], isLoading } = useQuery({
    queryKey: ['voteringer-v2', statusFilter, kategoriFilter, debouncedSearch],
    queryFn: () => fetchVoteringerData(statusFilter, kategoriFilter, debouncedSearch),
    staleTime: 1000 * 60 * 1, // 1 minute
  });

  const statusFilters: { value: FilterStatus; label: string }[] = [
    { value: 'alle', label: 'Alle' },
    { value: 'pågående', label: 'Pågående' },
    { value: 'avsluttet', label: 'Avsluttet' },
  ];

  const getUserVote = (votering: Votering) => {
    if (!user || !votering.folke_stemmer) return null;
    const vote = votering.folke_stemmer.find(v => v.user_id === user.id);
    return vote?.stemme || null;
  };

  const getFolkeCounts = (votering: Votering) => {
    const stemmer = votering.folke_stemmer || [];
    return {
      for: stemmer.filter(s => s.stemme === 'for').length,
      mot: stemmer.filter(s => s.stemme === 'mot').length,
      avholdende: stemmer.filter(s => s.stemme === 'avholdende').length,
    };
  };

  const featuredVotering = voteringer.find(v => 
    v.stortinget_saker?.status === 'pågående' || v.oppsummering
  );

  return (
    <Layout title="Stem">
      <div className="px-4 py-4 space-y-4 animate-ios-fade">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-foreground">Viktige voteringer</h1>
          <p className="text-sm text-muted-foreground">
            {voteringer.length} avstemninger med AI-oppsummering
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Søk i voteringer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11 bg-card border border-border/50 rounded-xl"
          />
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
          {kategoriConfig.map((kat) => (
            <button
              key={kat.value}
              onClick={() => setKategoriFilter(kat.value)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl transition-all ios-press whitespace-nowrap',
                kategoriFilter === kat.value
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-card border border-border/50 text-muted-foreground'
              )}
            >
              {kat.icon}
              {kat.label}
            </button>
          ))}
        </div>

        {/* Status Filter */}
        <div className="flex gap-1 p-1 bg-card border border-border/50 rounded-xl">
          {statusFilters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={cn(
                'flex-1 py-2 text-sm font-medium rounded-lg transition-all ios-press',
                statusFilter === filter.value
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground'
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <VoteringCardSkeleton key={i} />
            ))}
          </div>
        ) : voteringer.length > 0 ? (
          <div className="space-y-4">
            {/* Featured */}
            {featuredVotering && statusFilter === 'alle' && kategoriFilter === 'alle' && (
              <div className="mb-2">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-primary">Fremhevet</span>
                </div>
                <VoteringCard
                  id={featuredVotering.id}
                  forslagTekst={featuredVotering.forslag_tekst}
                  oppsummering={featuredVotering.oppsummering}
                  status={featuredVotering.status}
                  voteringDato={featuredVotering.votering_dato}
                  resultatFor={featuredVotering.resultat_for}
                  resultatMot={featuredVotering.resultat_mot}
                  resultatAvholdende={featuredVotering.resultat_avholdende}
                  folkeFor={getFolkeCounts(featuredVotering).for}
                  folkeMot={getFolkeCounts(featuredVotering).mot}
                  folkeAvholdende={getFolkeCounts(featuredVotering).avholdende}
                  userVote={getUserVote(featuredVotering)}
                  vedtatt={featuredVotering.vedtatt}
                  sakTittel={featuredVotering.stortinget_saker?.tittel}
                  variant="featured"
                />
              </div>
            )}

            {/* List */}
            <div className="space-y-3">
              {voteringer
                .filter(v => (statusFilter !== 'alle' || kategoriFilter !== 'alle') || v.id !== featuredVotering?.id)
                .map((votering, index) => {
                  const folkeCounts = getFolkeCounts(votering);
                  return (
                    <VoteringCard
                      key={votering.id}
                      id={votering.id}
                      forslagTekst={votering.forslag_tekst}
                      oppsummering={votering.oppsummering}
                      status={votering.status}
                      voteringDato={votering.votering_dato}
                      resultatFor={votering.resultat_for}
                      resultatMot={votering.resultat_mot}
                      resultatAvholdende={votering.resultat_avholdende}
                      folkeFor={folkeCounts.for}
                      folkeMot={folkeCounts.mot}
                      folkeAvholdende={folkeCounts.avholdende}
                      userVote={getUserVote(votering)}
                      vedtatt={votering.vedtatt}
                      sakTittel={votering.stortinget_saker?.tittel}
                      index={index}
                    />
                  );
                })}
            </div>
          </div>
        ) : (
          <div className="bg-card border border-border/50 rounded-2xl p-8 text-center shadow-sm">
            <Vote className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">
              {search ? 'Ingen voteringer funnet' : 'Ingen viktige voteringer ennå'}
            </p>
          </div>
        )}

        {voteringer.length > 0 && (
          <p className="text-center text-xs text-muted-foreground pb-4">
            Viser {voteringer.length} viktige {voteringer.length === 1 ? 'votering' : 'voteringer'}
          </p>
        )}
      </div>
    </Layout>
  );
}
