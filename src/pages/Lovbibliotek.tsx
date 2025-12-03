import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, BookOpen, ChevronRight, Check, X, Calendar, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import ResultBar from '@/components/ResultBar';
import { Badge } from '@/components/ui/badge';

interface Sak {
  id: string;
  tittel: string;
  kort_tittel: string | null;
  kategori: string | null;
  behandlet_sesjon: string | null;
  status: string;
  vedtak_resultat: string | null;
  stortinget_votering_for: number | null;
  stortinget_votering_mot: number | null;
  stortinget_votering_avholdende: number | null;
}

const SESSIONS = ['2024-2025', '2023-2024', '2022-2023', '2021-2022'];
const CATEGORIES = [
  { value: 'lovendring', label: 'Lovendringer' },
  { value: 'budsjett', label: 'Budsjett' },
  { value: 'grunnlov', label: 'Grunnlov' },
  { value: 'melding', label: 'Meldinger' },
  { value: 'politikk', label: 'Politikk' },
];

export default function Lovbibliotek() {
  const [saker, setSaker] = useState<Sak[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  useEffect(() => {
    fetchSaker();
  }, [selectedSession, selectedCategory]);

  const fetchSaker = async () => {
    setLoading(true);
    let query = supabase
      .from('stortinget_saker')
      .select('id, tittel, kort_tittel, kategori, behandlet_sesjon, status, vedtak_resultat, stortinget_votering_for, stortinget_votering_mot, stortinget_votering_avholdende')
      .eq('er_viktig', true)
      .order('behandlet_sesjon', { ascending: false });

    if (selectedSession) {
      query = query.eq('behandlet_sesjon', selectedSession);
    } else {
      query = query.in('behandlet_sesjon', SESSIONS);
    }

    if (selectedCategory) {
      query = query.eq('kategori', selectedCategory);
    }

    const { data, error } = await query.limit(500);

    if (error) {
      console.error('Error fetching saker:', error);
    } else {
      setSaker(data || []);
    }
    setLoading(false);
    setPage(0);
  };

  const filteredSaker = useMemo(() => {
    if (!searchQuery.trim()) return saker;
    const q = searchQuery.toLowerCase();
    return saker.filter(
      s => s.tittel.toLowerCase().includes(q) || s.kort_tittel?.toLowerCase().includes(q)
    );
  }, [saker, searchQuery]);

  const paginatedSaker = useMemo(() => {
    return filteredSaker.slice(0, (page + 1) * PAGE_SIZE);
  }, [filteredSaker, page]);

  const hasMore = paginatedSaker.length < filteredSaker.length;

  const getCategoryColor = (kategori: string | null) => {
    switch (kategori) {
      case 'lovendring': return 'bg-blue-500/20 text-blue-600 dark:text-blue-400';
      case 'budsjett': return 'bg-green-500/20 text-green-600 dark:text-green-400';
      case 'grunnlov': return 'bg-purple-500/20 text-purple-600 dark:text-purple-400';
      case 'melding': return 'bg-orange-500/20 text-orange-600 dark:text-orange-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getCategoryLabel = (kategori: string | null) => {
    return CATEGORIES.find(c => c.value === kategori)?.label || kategori || 'Annet';
  };

  const stats = useMemo(() => {
    // Count based on vedtak_resultat and voting data
    const vedtatt = filteredSaker.filter(s => 
      s.vedtak_resultat === 'vedtatt' || 
      (s.stortinget_votering_for && s.stortinget_votering_for > (s.stortinget_votering_mot || 0))
    ).length;
    const avvist = filteredSaker.filter(s => 
      s.vedtak_resultat === 'ikke_vedtatt' || 
      (s.stortinget_votering_mot && s.stortinget_votering_mot > (s.stortinget_votering_for || 0))
    ).length;
    const pending = filteredSaker.length - vedtatt - avvist;
    return {
      total: filteredSaker.length,
      vedtatt,
      avvist,
      pending,
    };
  }, [filteredSaker]);

  return (
    <Layout>
      <div className="min-h-screen pb-24">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
          <div className="px-4 py-4 pt-safe">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Lovbibliotek</h1>
                <p className="text-xs text-muted-foreground">4 år med viktige saker</p>
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Søk i lover og vedtak..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-muted/50 border-0"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="px-4 pb-3 space-y-2">
            {/* Session filter */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              <button
                onClick={() => setSelectedSession(null)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
                  !selectedSession ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                )}
              >
                Alle år
              </button>
              {SESSIONS.map(session => (
                <button
                  key={session}
                  onClick={() => setSelectedSession(session)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
                    selectedSession === session ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  )}
                >
                  {session}
                </button>
              ))}
            </div>

            {/* Category filter */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              <button
                onClick={() => setSelectedCategory(null)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1',
                  !selectedCategory ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                )}
              >
                <Filter className="h-3 w-3" />
                Alle
              </button>
              {CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  onClick={() => setSelectedCategory(cat.value)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
                    selectedCategory === cat.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 px-4 py-4">
          <div className="bg-card rounded-xl p-3 text-center border border-border/50">
            <p className="text-xl font-bold text-foreground">{stats.total}</p>
            <p className="text-[10px] text-muted-foreground">Totalt</p>
          </div>
          <div className="bg-card rounded-xl p-3 text-center border border-border/50">
            <p className="text-xl font-bold text-vote-for">{stats.vedtatt}</p>
            <p className="text-[10px] text-muted-foreground">Vedtatt</p>
          </div>
          <div className="bg-card rounded-xl p-3 text-center border border-border/50">
            <p className="text-xl font-bold text-vote-mot">{stats.avvist}</p>
            <p className="text-[10px] text-muted-foreground">Avvist</p>
          </div>
          <div className="bg-card rounded-xl p-3 text-center border border-border/50">
            <p className="text-xl font-bold text-muted-foreground">{stats.pending}</p>
            <p className="text-[10px] text-muted-foreground">Pågående</p>
          </div>
        </div>

        {/* Saker list */}
        <div className="px-4 space-y-3">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : paginatedSaker.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">Ingen saker funnet</p>
            </div>
          ) : (
            <>
              {paginatedSaker.map((sak) => (
                <Link
                  key={sak.id}
                  to={`/sak/${sak.id}`}
                  className="block bg-card rounded-xl border border-border/50 hover:bg-accent/50 transition-colors overflow-hidden"
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground line-clamp-2">
                          {sak.kort_tittel || sak.tittel}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className={cn('text-[10px]', getCategoryColor(sak.kategori))}>
                        {getCategoryLabel(sak.kategori)}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {sak.behandlet_sesjon}
                      </span>
                      {sak.vedtak_resultat === 'vedtatt' && (
                        <span className="text-[10px] text-vote-for flex items-center gap-1">
                          <Check className="h-3 w-3" />
                          Vedtatt
                        </span>
                      )}
                      {sak.vedtak_resultat === 'ikke_vedtatt' && (
                        <span className="text-[10px] text-vote-mot flex items-center gap-1">
                          <X className="h-3 w-3" />
                          Avvist
                        </span>
                      )}
                    </div>

                    {/* Voting results */}
                    {(sak.stortinget_votering_for || sak.stortinget_votering_mot) && (
                      <div className="mt-3">
                        <ResultBar
                          forCount={sak.stortinget_votering_for || 0}
                          motCount={sak.stortinget_votering_mot || 0}
                          avholdendeCount={sak.stortinget_votering_avholdende || 0}
                          size="sm"
                        />
                      </div>
                    )}
                  </div>
                </Link>
              ))}

              {hasMore && (
                <button
                  onClick={() => setPage(p => p + 1)}
                  className="w-full py-3 text-sm text-primary font-medium bg-card rounded-xl border border-border/50 hover:bg-accent/50 transition-colors"
                >
                  Vis flere ({filteredSaker.length - paginatedSaker.length} igjen)
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
