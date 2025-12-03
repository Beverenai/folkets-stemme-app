import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, ChevronRight, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import PartiBadge from '@/components/PartiBadge';
import PartiKort from '@/components/PartiKort';
import { getPartiConfig, PARTI_CONFIG } from '@/lib/partiConfig';

interface Representant {
  id: string;
  stortinget_id: string;
  fornavn: string;
  etternavn: string;
  parti: string | null;
  parti_forkortelse: string | null;
  fylke: string | null;
  bilde_url: string | null;
  er_aktiv: boolean;
}

interface PartiData {
  forkortelse: string;
  antallRepresentanter: number;
  stemmeStats?: {
    for: number;
    mot: number;
    avholdende: number;
  };
}

// Filter IDs must match database parti_forkortelse exactly (case-sensitive)
const partierFilter = [
  { id: 'alle', navn: 'Alle', farge: null },
  { id: 'A', navn: 'Ap', farge: PARTI_CONFIG['A'].farge },
  { id: 'H', navn: 'H', farge: PARTI_CONFIG['H'].farge },
  { id: 'Sp', navn: 'Sp', farge: PARTI_CONFIG['SP'].farge },
  { id: 'FrP', navn: 'FrP', farge: PARTI_CONFIG['FRP'].farge },
  { id: 'SV', navn: 'SV', farge: PARTI_CONFIG['SV'].farge },
  { id: 'R', navn: 'R', farge: PARTI_CONFIG['R'].farge },
  { id: 'V', navn: 'V', farge: PARTI_CONFIG['V'].farge },
  { id: 'KrF', navn: 'KrF', farge: PARTI_CONFIG['KRF'].farge },
  { id: 'MDG', navn: 'MDG', farge: PARTI_CONFIG['MDG'].farge },
];

// All parties for the Partier tab
const allePartier = ['A', 'H', 'Sp', 'FrP', 'SV', 'R', 'V', 'KrF', 'MDG', 'PF'];

export default function Representanter() {
  const [activeTab, setActiveTab] = useState<'representanter' | 'partier'>('representanter');
  const [representanter, setRepresentanter] = useState<Representant[]>([]);
  const [partiData, setPartiData] = useState<PartiData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [partiFilter, setPartiFilter] = useState('alle');

  useEffect(() => {
    if (activeTab === 'representanter') {
      fetchRepresentanter();
    } else {
      fetchPartiData();
    }
  }, [activeTab, partiFilter, search]);

  const fetchRepresentanter = async () => {
    setLoading(true);
    let query = supabase
      .from('representanter')
      .select('*')
      .eq('er_aktiv', true)
      .order('etternavn', { ascending: true });

    if (partiFilter !== 'alle') {
      query = query.eq('parti_forkortelse', partiFilter);
    }

    if (search) {
      query = query.or(`fornavn.ilike.%${search}%,etternavn.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching representanter:', error);
    } else {
      setRepresentanter(data || []);
    }
    setLoading(false);
  };

  const fetchPartiData = async () => {
    setLoading(true);

    // Fetch representant counts per party
    const { data: repCounts } = await supabase
      .from('representanter')
      .select('parti_forkortelse')
      .eq('er_aktiv', true);

    const countsByParti: Record<string, number> = {};
    (repCounts || []).forEach(r => {
      if (r.parti_forkortelse) {
        countsByParti[r.parti_forkortelse] = (countsByParti[r.parti_forkortelse] || 0) + 1;
      }
    });

    // Fetch aggregated voting stats per party
    const { data: voteringStats } = await supabase
      .from('parti_voteringer')
      .select('parti_forkortelse, stemmer_for, stemmer_mot, stemmer_avholdende');

    const statsByParti: Record<string, { for: number; mot: number; avholdende: number }> = {};
    (voteringStats || []).forEach(v => {
      if (!statsByParti[v.parti_forkortelse]) {
        statsByParti[v.parti_forkortelse] = { for: 0, mot: 0, avholdende: 0 };
      }
      statsByParti[v.parti_forkortelse].for += v.stemmer_for;
      statsByParti[v.parti_forkortelse].mot += v.stemmer_mot;
      statsByParti[v.parti_forkortelse].avholdende += v.stemmer_avholdende;
    });

    // Build parti data array
    const data: PartiData[] = allePartier
      .filter(forkortelse => countsByParti[forkortelse] > 0)
      .map(forkortelse => ({
        forkortelse,
        antallRepresentanter: countsByParti[forkortelse] || 0,
        stemmeStats: statsByParti[forkortelse],
      }))
      .sort((a, b) => b.antallRepresentanter - a.antallRepresentanter);

    setPartiData(data);
    setLoading(false);
  };

  return (
    <Layout title="Politikere">
      <div className="space-y-4">
        {/* Segmented control tabs */}
        <div className="bg-muted/50 p-1 rounded-xl flex">
          <button
            onClick={() => setActiveTab('representanter')}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'representanter'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Representanter
          </button>
          <button
            onClick={() => setActiveTab('partier')}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'partier'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Partier
          </button>
        </div>

        {activeTab === 'representanter' ? (
          <>
            {/* Header */}
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <span className="text-sm text-muted-foreground">
                {representanter.length} representanter
              </span>
            </div>

            {/* Søkefelt */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Søk etter representant..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-card border-border/50 rounded-xl h-11"
              />
            </div>

            {/* Parti-filter */}
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
              {partierFilter.map((parti) => (
                <button
                  key={parti.id}
                  onClick={() => setPartiFilter(parti.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                    partiFilter === parti.id
                      ? 'ring-2 ring-offset-2 ring-offset-background'
                      : 'opacity-80 hover:opacity-100'
                  }`}
                  style={parti.farge ? {
                    backgroundColor: parti.farge,
                    color: getPartiConfig(parti.id).tekstFarge,
                    ...(partiFilter === parti.id ? { ringColor: parti.farge } : {})
                  } : {
                    backgroundColor: partiFilter === parti.id ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
                    color: partiFilter === parti.id ? 'hsl(var(--primary-foreground))' : 'hsl(var(--muted-foreground))'
                  }}
                >
                  {parti.navn}
                </button>
              ))}
            </div>

            {/* Liste */}
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : representanter.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">
                  {search || partiFilter !== 'alle' 
                    ? 'Ingen representanter funnet' 
                    : 'Laster representanter...'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {representanter.map((rep, index) => (
                  <Link
                    key={rep.id}
                    to={`/representant/${rep.id}`}
                    className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border/50 hover:bg-accent/50 transition-all animate-fade-in"
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <Avatar className="h-12 w-12 overflow-hidden">
                      <AvatarImage 
                        src={rep.bilde_url || ''} 
                        alt={`${rep.fornavn} ${rep.etternavn}`}
                        className="object-cover object-top"
                      />
                      <AvatarFallback className="bg-muted text-muted-foreground">
                        {rep.fornavn[0]}{rep.etternavn[0]}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {rep.fornavn} {rep.etternavn}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {rep.parti_forkortelse && (
                          <PartiBadge parti={rep.parti_forkortelse} size="sm" />
                        )}
                        {rep.fylke && (
                          <span className="truncate">{rep.fylke}</span>
                        )}
                      </div>
                    </div>
                    
                    <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {/* Partier tab */}
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <span className="text-sm text-muted-foreground">
                {partiData.length} partier på Stortinget
              </span>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : partiData.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">Ingen partier funnet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {partiData.map((parti, index) => (
                  <div 
                    key={parti.forkortelse} 
                    className="animate-fade-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <PartiKort
                      forkortelse={parti.forkortelse}
                      antallRepresentanter={parti.antallRepresentanter}
                      stemmeStats={parti.stemmeStats}
                    />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
