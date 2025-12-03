import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getPartiConfig } from '@/lib/partiConfig';

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
}

const allePartier = ['A', 'H', 'Sp', 'FrP', 'SV', 'R', 'V', 'KrF', 'MDG', 'PF'];

export default function Representanter() {
  const [activeTab, setActiveTab] = useState<'representanter' | 'partier'>('representanter');
  const [representanter, setRepresentanter] = useState<Representant[]>([]);
  const [partiData, setPartiData] = useState<PartiData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (activeTab === 'representanter') {
      fetchRepresentanter();
    } else {
      fetchPartiData();
    }
  }, [activeTab, search]);

  const fetchRepresentanter = async () => {
    setLoading(true);
    let query = supabase
      .from('representanter')
      .select('*')
      .eq('er_aktiv', true)
      .order('etternavn', { ascending: true });

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

    const data: PartiData[] = allePartier
      .filter(forkortelse => countsByParti[forkortelse] > 0)
      .map(forkortelse => ({
        forkortelse,
        antallRepresentanter: countsByParti[forkortelse] || 0,
      }))
      .sort((a, b) => b.antallRepresentanter - a.antallRepresentanter);

    setPartiData(data);
    setLoading(false);
  };

  return (
    <Layout title="Politikere">
      <div className="px-4 py-4 space-y-4">
        {/* Segmented control */}
        <div className="bg-muted/50 p-1 rounded-xl flex">
          <button
            onClick={() => setActiveTab('representanter')}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'representanter'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground'
            }`}
          >
            Representanter
          </button>
          <button
            onClick={() => setActiveTab('partier')}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'partier'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground'
            }`}
          >
            Partier
          </button>
        </div>

        {activeTab === 'representanter' ? (
          <>
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

            {/* iOS Grouped List */}
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : representanter.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                Ingen representanter funnet
              </div>
            ) : (
              <div className="bg-card rounded-2xl overflow-hidden border border-border/50">
                {representanter.map((rep, index) => (
                  <Link
                    key={rep.id}
                    to={`/representant/${rep.id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-accent/50 active:bg-accent transition-colors"
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: getPartiConfig(rep.parti_forkortelse).farge }}
                    />
                    <Avatar className="h-10 w-10 flex-shrink-0">
                      <AvatarImage 
                        src={rep.bilde_url || ''} 
                        alt={`${rep.fornavn} ${rep.etternavn}`}
                        className="object-cover object-top"
                      />
                      <AvatarFallback className="bg-muted text-muted-foreground text-sm">
                        {rep.fornavn[0]}{rep.etternavn[0]}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[15px] text-foreground truncate">
                        {rep.fornavn} {rep.etternavn}
                      </p>
                      <p className="text-[13px] text-muted-foreground truncate">
                        {rep.fylke}
                      </p>
                    </div>
                    
                    <ChevronRight className="h-5 w-5 text-muted-foreground/50 flex-shrink-0" />
                    
                    {index < representanter.length - 1 && (
                      <div className="absolute left-[4.5rem] right-0 bottom-0 h-px bg-border/50" />
                    )}
                  </Link>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {/* Partier - iOS Grouped List */}
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : partiData.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                Ingen partier funnet
              </div>
            ) : (
              <div className="bg-card rounded-2xl overflow-hidden border border-border/50">
                {partiData.map((parti, index) => {
                  const config = getPartiConfig(parti.forkortelse);
                  return (
                    <Link
                      key={parti.forkortelse}
                      to={`/parti/${parti.forkortelse}`}
                      className="flex items-center gap-3 px-4 py-3.5 hover:bg-accent/50 active:bg-accent transition-colors relative"
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ 
                          backgroundColor: config.farge,
                          color: config.tekstFarge 
                        }}
                      >
                        {config.forkortelse}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[15px] text-foreground">
                          {config.navn}
                        </p>
                        <p className="text-[13px] text-muted-foreground">
                          {parti.antallRepresentanter} representanter
                        </p>
                      </div>
                      
                      <ChevronRight className="h-5 w-5 text-muted-foreground/50 flex-shrink-0" />
                      
                      {index < partiData.length - 1 && (
                        <div className="absolute left-14 right-0 bottom-0 h-px bg-border/50" />
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
