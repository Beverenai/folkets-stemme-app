import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import SakCard from '@/components/SakCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Filter, Clock, CheckCircle, FileText } from 'lucide-react';
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
  const [temaFilter, setTemaFilter] = useState<string>('alle');
  const [temaer, setTemaer] = useState<string[]>([]);

  useEffect(() => {
    async function fetchSaker() {
      try {
        let query = supabase
          .from('stortinget_saker')
          .select(`
            *,
            folke_stemmer(stemme)
          `)
          .order('created_at', { ascending: false });

        if (statusFilter !== 'alle') {
          query = query.eq('status', statusFilter);
        }

        if (temaFilter !== 'alle') {
          query = query.eq('tema', temaFilter);
        }

        if (search) {
          query = query.or(`tittel.ilike.%${search}%,kort_tittel.ilike.%${search}%,beskrivelse.ilike.%${search}%`);
        }

        const { data, error } = await query;

        if (error) throw error;
        setSaker(data || []);

        // Get unique temaer
        const uniqueTemaer = [...new Set((data || []).map(s => s.tema).filter(Boolean))] as string[];
        setTemaer(uniqueTemaer);
      } catch (error) {
        console.error('Error fetching saker:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchSaker();
  }, [statusFilter, temaFilter, search]);

  const statusButtons: { value: FilterStatus; label: string; icon: typeof Clock }[] = [
    { value: 'alle', label: 'Alle', icon: FileText },
    { value: 'pågående', label: 'Pågående', icon: Clock },
    { value: 'avsluttet', label: 'Avsluttet', icon: CheckCircle },
  ];

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">
            Alle saker
          </h1>
          <p className="text-muted-foreground">
            Se og stem på saker fra Stortinget
          </p>
        </div>

        {/* Filters */}
        <div className="bg-card rounded-2xl border border-border p-4 md:p-6 mb-8 animate-slide-up">
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Søk i saker..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-12"
            />
          </div>

          {/* Status Filter */}
          <div className="flex flex-wrap gap-2 mb-4">
            {statusButtons.map((btn) => {
              const Icon = btn.icon;
              return (
                <Button
                  key={btn.value}
                  variant={statusFilter === btn.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter(btn.value)}
                  className={cn(
                    'gap-2',
                    statusFilter === btn.value && 'gradient-hero text-white'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {btn.label}
                </Button>
              );
            })}
          </div>

          {/* Tema Filter */}
          {temaer.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Button
                variant={temaFilter === 'alle' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setTemaFilter('alle')}
              >
                Alle tema
              </Button>
              {temaer.map((tema) => (
                <Button
                  key={tema}
                  variant={temaFilter === tema ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setTemaFilter(tema)}
                >
                  {tema}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Results */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-64 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : saker.length > 0 ? (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              Viser {saker.length} {saker.length === 1 ? 'sak' : 'saker'}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {saker.map((sak, index) => (
                <SakCard key={sak.id} sak={sak} index={index} />
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-16 bg-card rounded-2xl border border-border">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-display text-xl font-semibold mb-2">
              Ingen saker funnet
            </h3>
            <p className="text-muted-foreground">
              {search
                ? 'Prøv å justere søket eller filtrene'
                : 'Det er ingen saker i databasen ennå'}
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}
