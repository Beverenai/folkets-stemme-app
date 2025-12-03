import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, BookOpen, ChevronRight, Check, X, Calendar, FileText, Vote, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import ResultBar from '@/components/ResultBar';
import { Badge } from '@/components/ui/badge';
import PartiStancePreview from '@/components/PartiStancePreview';

interface PartiVote {
  parti_forkortelse: string;
  parti_navn: string;
  stemmer_for: number;
  stemmer_mot: number;
  stemmer_avholdende: number;
}

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
  oppsummering: string | null;
  parti_voteringer?: PartiVote[];
}

const SESSIONS = ['2025-2026', '2024-2025', '2023-2024', '2022-2023', '2021-2022'];
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
  const [showOnlyWithVotes, setShowOnlyWithVotes] = useState(false);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  useEffect(() => {
    fetchSaker();
  }, [selectedSession, selectedCategory]);

  const fetchSaker = async () => {
    setLoading(true);
    
    // Fetch saker
    let query = supabase
      .from('stortinget_saker')
      .select('id, tittel, kort_tittel, kategori, behandlet_sesjon, status, vedtak_resultat, stortinget_votering_for, stortinget_votering_mot, stortinget_votering_avholdende, oppsummering')
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

    const { data: sakerData, error: sakerError } = await query.limit(500);

    if (sakerError) {
      console.error('Error fetching saker:', sakerError);
      setLoading(false);
      return;
    }

    // Fetch parti_voteringer only for saker with voting data (to avoid URL too long)
    const sakIdsWithVotes = sakerData?.filter(s => s.stortinget_votering_for && s.stortinget_votering_for > 0).map(s => s.id) || [];
    
    let partiData: any[] = [];
    if (sakIdsWithVotes.length > 0) {
      const { data, error: partiError } = await supabase
        .from('parti_voteringer')
        .select('sak_id, parti_forkortelse, parti_navn, stemmer_for, stemmer_mot, stemmer_avholdende')
        .in('sak_id', sakIdsWithVotes);

      if (partiError) {
        console.error('Error fetching parti voteringer:', partiError);
      } else {
        partiData = data || [];
      }
    }

    // Group parti_voteringer by sak_id
    const partiMap = new Map<string, PartiVote[]>();
    partiData?.forEach(pv => {
      if (!partiMap.has(pv.sak_id)) {
        partiMap.set(pv.sak_id, []);
      }
      partiMap.get(pv.sak_id)!.push({
        parti_forkortelse: pv.parti_forkortelse,
        parti_navn: pv.parti_navn,
        stemmer_for: pv.stemmer_for,
        stemmer_mot: pv.stemmer_mot,
        stemmer_avholdende: pv.stemmer_avholdende,
      });
    });

    // Merge parti_voteringer into saker
    const sakerWithParti = sakerData?.map(sak => ({
      ...sak,
      parti_voteringer: partiMap.get(sak.id) || [],
    })) || [];

    setSaker(sakerWithParti);
    setLoading(false);
    setPage(0);
  };

  const filteredSaker = useMemo(() => {
    let result = saker;
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        s => s.tittel.toLowerCase().includes(q) || s.kort_tittel?.toLowerCase().includes(q)
      );
    }
    
    if (showOnlyWithVotes) {
      result = result.filter(
        s => (s.parti_voteringer && s.parti_voteringer.length > 0) ||
             (s.stortinget_votering_for && s.stortinget_votering_for > 0)
      );
    }
    
    // Sort to show saker with voting data first
    result = [...result].sort((a, b) => {
      const aHasVotes = (a.parti_voteringer && a.parti_voteringer.length > 0) || 
                        (a.stortinget_votering_for && a.stortinget_votering_for > 0);
      const bHasVotes = (b.parti_voteringer && b.parti_voteringer.length > 0) || 
                        (b.stortinget_votering_for && b.stortinget_votering_for > 0);
      if (aHasVotes && !bHasVotes) return -1;
      if (!aHasVotes && bHasVotes) return 1;
      return 0;
    });
    
    return result;
  }, [saker, searchQuery, showOnlyWithVotes]);

  const paginatedSaker = useMemo(() => {
    return filteredSaker.slice(0, (page + 1) * PAGE_SIZE);
  }, [filteredSaker, page]);

  const hasMore = paginatedSaker.length < filteredSaker.length;

  // Featured sak - first one with party voting data
  const featuredSak = useMemo(() => {
    return filteredSaker.find(s => s.parti_voteringer && s.parti_voteringer.length >= 5);
  }, [filteredSaker]);

  const getCategoryColor = (kategori: string | null) => {
    switch (kategori) {
      case 'lovendring': return 'bg-blue-500/20 text-blue-400';
      case 'budsjett': return 'bg-green-500/20 text-green-400';
      case 'grunnlov': return 'bg-purple-500/20 text-purple-400';
      case 'melding': return 'bg-orange-500/20 text-orange-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getCategoryLabel = (kategori: string | null) => {
    return CATEGORIES.find(c => c.value === kategori)?.label || kategori || 'Annet';
  };

  const stats = useMemo(() => {
    const withVotes = filteredSaker.filter(s => 
      (s.parti_voteringer && s.parti_voteringer.length > 0) ||
      (s.stortinget_votering_for && s.stortinget_votering_for > 0)
    ).length;
    const vedtatt = filteredSaker.filter(s => 
      s.vedtak_resultat === 'vedtatt' || 
      (s.stortinget_votering_for && s.stortinget_votering_for > (s.stortinget_votering_mot || 0))
    ).length;
    const avvist = filteredSaker.filter(s => 
      s.vedtak_resultat === 'ikke_vedtatt' || 
      (s.stortinget_votering_mot && s.stortinget_votering_mot > (s.stortinget_votering_for || 0))
    ).length;
    return {
      total: filteredSaker.length,
      withVotes,
      vedtatt,
      avvist,
    };
  }, [filteredSaker]);

  const hasVotingData = (sak: Sak) => {
    return (sak.parti_voteringer && sak.parti_voteringer.length > 0) ||
           (sak.stortinget_votering_for && sak.stortinget_votering_for > 0);
  };

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
                <p className="text-xs text-muted-foreground">4 år med viktige saker • {stats.withVotes} med stemmedata</p>
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

            {/* Category filter + votes toggle */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              <button
                onClick={() => setShowOnlyWithVotes(!showOnlyWithVotes)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1',
                  showOnlyWithVotes ? 'bg-vote-for/20 text-vote-for' : 'bg-muted text-muted-foreground'
                )}
              >
                <Vote className="h-3 w-3" />
                Med stemmer
              </button>
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
            <p className="text-xl font-bold text-primary">{stats.withVotes}</p>
            <p className="text-[10px] text-muted-foreground">Med data</p>
          </div>
          <div className="bg-card rounded-xl p-3 text-center border border-border/50">
            <p className="text-xl font-bold text-vote-for">{stats.vedtatt}</p>
            <p className="text-[10px] text-muted-foreground">Vedtatt</p>
          </div>
          <div className="bg-card rounded-xl p-3 text-center border border-border/50">
            <p className="text-xl font-bold text-vote-mot">{stats.avvist}</p>
            <p className="text-[10px] text-muted-foreground">Avvist</p>
          </div>
        </div>

        {/* Featured sak with full party breakdown */}
        {featuredSak && !searchQuery && (
          <div className="px-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Fremhevet votering</span>
            </div>
            <Link
              to={`/sak/${featuredSak.id}`}
              className="block bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl border border-primary/20 hover:border-primary/40 transition-colors overflow-hidden"
            >
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground line-clamp-2">
                      {featuredSak.kort_tittel || featuredSak.tittel}
                    </p>
                    {featuredSak.oppsummering && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {featuredSak.oppsummering}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                </div>

                <div className="flex items-center gap-2 flex-wrap mb-3">
                  <Badge variant="secondary" className={cn('text-[10px]', getCategoryColor(featuredSak.kategori))}>
                    {getCategoryLabel(featuredSak.kategori)}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {featuredSak.behandlet_sesjon}
                  </span>
                </div>

                {/* Full party breakdown */}
                {featuredSak.parti_voteringer && featuredSak.parti_voteringer.length > 0 && (
                  <PartiStancePreview partiVoteringer={featuredSak.parti_voteringer} compact={false} />
                )}

                {/* Voting bar */}
                {(featuredSak.stortinget_votering_for || featuredSak.stortinget_votering_mot) && (
                  <div className="mt-3">
                    <ResultBar
                      forCount={featuredSak.stortinget_votering_for || 0}
                      motCount={featuredSak.stortinget_votering_mot || 0}
                      avholdendeCount={featuredSak.stortinget_votering_avholdende || 0}
                      size="md"
                      showLabels
                    />
                  </div>
                )}
              </div>
            </Link>
          </div>
        )}

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

                    <div className="flex items-center gap-2 flex-wrap mb-2">
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
                      {!hasVotingData(sak) && (
                        <span className="text-[10px] text-muted-foreground/60">
                          Ingen voteringsdata
                        </span>
                      )}
                    </div>

                    {/* Party stance preview */}
                    {sak.parti_voteringer && sak.parti_voteringer.length > 0 && (
                      <div className="mb-2">
                        <PartiStancePreview partiVoteringer={sak.parti_voteringer} compact />
                      </div>
                    )}

                    {/* Voting results */}
                    {hasVotingData(sak) ? (
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <ResultBar
                            forCount={sak.stortinget_votering_for || 0}
                            motCount={sak.stortinget_votering_mot || 0}
                            avholdendeCount={sak.stortinget_votering_avholdende || 0}
                            size="sm"
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {sak.stortinget_votering_for || 0}–{sak.stortinget_votering_mot || 0}
                        </span>
                      </div>
                    ) : null}
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
