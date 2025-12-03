import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, ChevronRight, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import PartiBadge from '@/components/PartiBadge';
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

const partier = [
  { id: 'alle', navn: 'Alle', farge: null },
  { id: 'A', navn: 'Ap', farge: PARTI_CONFIG['A'].farge },
  { id: 'H', navn: 'H', farge: PARTI_CONFIG['H'].farge },
  { id: 'SP', navn: 'Sp', farge: PARTI_CONFIG['SP'].farge },
  { id: 'FRP', navn: 'FrP', farge: PARTI_CONFIG['FRP'].farge },
  { id: 'SV', navn: 'SV', farge: PARTI_CONFIG['SV'].farge },
  { id: 'R', navn: 'R', farge: PARTI_CONFIG['R'].farge },
  { id: 'V', navn: 'V', farge: PARTI_CONFIG['V'].farge },
  { id: 'KRF', navn: 'KrF', farge: PARTI_CONFIG['KRF'].farge },
  { id: 'MDG', navn: 'MDG', farge: PARTI_CONFIG['MDG'].farge },
];

export default function Representanter() {
  const [representanter, setRepresentanter] = useState<Representant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [partiFilter, setPartiFilter] = useState('alle');

  useEffect(() => {
    fetchRepresentanter();
  }, [partiFilter, search]);

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

  return (
    <Layout title="Representanter">
      <div className="space-y-4">
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
          {partier.map((parti) => (
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
            {representanter.map((rep) => (
              <Link
                key={rep.id}
                to={`/representant/${rep.id}`}
                className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border/50 hover:bg-accent/50 transition-colors"
              >
                <Avatar className="h-12 w-12">
                  <AvatarImage 
                    src={rep.bilde_url || ''} 
                    alt={`${rep.fornavn} ${rep.etternavn}`}
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
      </div>
    </Layout>
  );
}
