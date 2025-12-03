import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import VoteringCard from '@/components/VoteringCard';
import { Input } from '@/components/ui/input';
import { Search, Vote, RefreshCw, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/components/ui/use-toast';

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
  } | null;
  folke_stemmer?: { stemme: string; user_id: string }[];
}

type FilterStatus = 'alle' | 'pågående' | 'avsluttet';

export default function Voteringer() {
  const { user } = useAuth();
  const [voteringer, setVoteringer] = useState<Votering[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('pågående');
  const [syncing, setSyncing] = useState(false);

  const fetchVoteringer = async () => {
    try {
      // Cast to any to bypass type checking for new table not yet in generated types
      const sb = supabase as any;
      let query = sb
        .from('voteringer')
        .select(`
          *,
          stortinget_saker(tittel, stortinget_id)
        `)
        .order('votering_dato', { ascending: false, nullsFirst: false });

      if (statusFilter !== 'alle') {
        query = query.eq('status', statusFilter);
      }

      if (search) {
        query = query.or(`forslag_tekst.ilike.%${search}%,oppsummering.ilike.%${search}%`);
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;
      
      // Also fetch folke_stemmer for these voteringer
      const voteringIds = (data || []).map((v: any) => v.id);
      let folkeData: any[] = [];
      if (voteringIds.length > 0) {
        const { data: stemmer } = await sb
          .from('folke_stemmer')
          .select('stemme, user_id, votering_id')
          .in('votering_id', voteringIds);
        folkeData = stemmer || [];
      }

      // Merge folke_stemmer with voteringer
      const voteringerWithStemmer = (data || []).map((v: any) => ({
        ...v,
        folke_stemmer: folkeData.filter((s: any) => s.votering_id === v.id)
      }));

      setVoteringer(voteringerWithStemmer as Votering[]);
    } catch (error) {
      console.error('Error fetching voteringer:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVoteringer();
  }, [statusFilter, search]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-voteringer');
      if (error) throw error;
      
      toast({ 
        title: 'Synkronisering fullført',
        description: `${data.processedCount || 0} saker behandlet`
      });
      
      fetchVoteringer();
    } catch (error) {
      console.error('Sync error:', error);
      toast({ title: 'Synkronisering feilet', variant: 'destructive' });
    } finally {
      setSyncing(false);
    }
  };

  const filters: { value: FilterStatus; label: string }[] = [
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
    v.status === 'pågående' || v.oppsummering
  );

  return (
    <Layout title="Voteringer">
      <div className="px-4 py-4 space-y-4 animate-ios-fade">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Voteringer</h1>
            <p className="text-sm text-muted-foreground">
              {voteringer.length} avstemninger
            </p>
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="p-2 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors ios-press disabled:opacity-50"
          >
            <RefreshCw className={cn("w-5 h-5", syncing && "animate-spin")} />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Søk i voteringer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11 bg-secondary border-0 rounded-xl"
          />
        </div>

        {/* Filter */}
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

        {/* Content */}
        {loading ? (
          <div className="p-12 text-center">
            <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground mt-3">Laster voteringer...</p>
          </div>
        ) : voteringer.length > 0 ? (
          <div className="space-y-4">
            {/* Featured */}
            {featuredVotering && statusFilter === 'alle' && (
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
                .filter(v => statusFilter !== 'alle' || v.id !== featuredVotering?.id)
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
          <div className="ios-card rounded-2xl p-8 text-center">
            <Vote className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">
              {search ? 'Ingen voteringer funnet' : 'Ingen voteringer ennå'}
            </p>
          </div>
        )}

        {voteringer.length > 0 && (
          <p className="text-center text-xs text-muted-foreground pb-4">
            Viser {voteringer.length} {voteringer.length === 1 ? 'votering' : 'voteringer'}
          </p>
        )}
      </div>
    </Layout>
  );
}
