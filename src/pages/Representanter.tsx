import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, RefreshCw, ChevronRight, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';

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
  { id: 'alle', navn: 'Alle' },
  { id: 'A', navn: 'Ap' },
  { id: 'H', navn: 'Høyre' },
  { id: 'SP', navn: 'Sp' },
  { id: 'FRP', navn: 'FrP' },
  { id: 'SV', navn: 'SV' },
  { id: 'R', navn: 'Rødt' },
  { id: 'V', navn: 'Venstre' },
  { id: 'KRF', navn: 'KrF' },
  { id: 'MDG', navn: 'MDG' },
];

export default function Representanter() {
  const [representanter, setRepresentanter] = useState<Representant[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState('');
  const [partiFilter, setPartiFilter] = useState('alle');
  const { toast } = useToast();

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

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-representanter');
      
      if (error) throw error;
      
      toast({
        title: 'Synkronisering fullført',
        description: data.message,
      });
      
      fetchRepresentanter();
    } catch (error: any) {
      toast({
        title: 'Feil ved synkronisering',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSyncing(false);
    }
  };

  const getPartiColor = (parti: string | null) => {
    const colors: Record<string, string> = {
      'A': 'bg-red-500',
      'H': 'bg-blue-600',
      'SP': 'bg-green-600',
      'FRP': 'bg-blue-900',
      'SV': 'bg-pink-600',
      'R': 'bg-red-700',
      'V': 'bg-green-500',
      'KRF': 'bg-yellow-500',
      'MDG': 'bg-green-400',
    };
    return colors[parti || ''] || 'bg-muted';
  };

  return (
    <Layout title="Representanter">
      <div className="space-y-4">
        {/* Header med sync-knapp */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <span className="text-sm text-muted-foreground">
              {representanter.length} representanter
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSync}
            disabled={syncing}
            className="h-8 w-8"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
          </Button>
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
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
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
                : 'Trykk på sync-knappen for å hente representanter'}
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
                      <span className={`px-2 py-0.5 rounded-full text-xs text-white ${getPartiColor(rep.parti_forkortelse)}`}>
                        {rep.parti_forkortelse}
                      </span>
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
