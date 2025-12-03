import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import SakCard from '@/components/SakCard';
import { Input } from '@/components/ui/input';
import { Search, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Sak {
  id: string;
  stortinget_id: string;
  tittel: string;
  kort_tittel: string | null;
  beskrivelse: string | null;
  tema: string | null;
  status: string;
  stortinget_votering_for: number | null;
  stortinget_votering_mot: number | null;
  folke_stemmer?: { stemme: string }[];
}

type FilterStatus = 'alle' | 'pågående' | 'avsluttet';

export default function Saker() {
  const [saker, setSaker] = useState<Sak[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('alle');

  useEffect(() => {
    async function fetchSaker() {
      try {
        let query = supabase
          .from('stortinget_saker')
          .select(`*, folke_stemmer(stemme)`)
          .order('created_at', { ascending: false });

        if (statusFilter !== 'alle') {
          query = query.eq('status', statusFilter);
        }

        if (search) {
          query = query.or(`tittel.ilike.%${search}%,kort_tittel.ilike.%${search}%`);
        }

        const { data, error } = await query;
        if (error) throw error;
        setSaker(data || []);
      } catch (error) {
        console.error('Error fetching saker:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchSaker();
  }, [statusFilter, search]);

  const filters: { value: FilterStatus; label: string }[] = [
    { value: 'alle', label: 'Alle' },
    { value: 'pågående', label: 'Pågående' },
    { value: 'avsluttet', label: 'Avsluttet' },
  ];

  return (
    <Layout title="Saker">
      <div className="px-4 py-4 space-y-4 animate-ios-fade">
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

        {/* Results */}
        <div className="ios-card overflow-hidden divide-y divide-border">
          {loading ? (
            <div className="p-8 text-center">
              <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : saker.length > 0 ? (
            saker.map((sak, index) => (
              <SakCard key={sak.id} sak={sak} index={index} />
            ))
          ) : (
            <div className="p-8 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">
                {search ? 'Ingen saker funnet' : 'Ingen saker ennå'}
              </p>
            </div>
          )}
        </div>

        {saker.length > 0 && (
          <p className="text-center text-xs text-muted-foreground">
            {saker.length} {saker.length === 1 ? 'sak' : 'saker'}
          </p>
        )}
      </div>
    </Layout>
  );
}
