import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Users, ThumbsUp, ThumbsDown, Minus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';
import { getPartiConfig, PARTI_CONFIG } from '@/lib/partiConfig';
import PartiBadge from '@/components/PartiBadge';

interface PartiVotering {
  id: string;
  sak_id: string;
  stemmer_for: number;
  stemmer_mot: number;
  stemmer_avholdende: number;
  stortinget_saker: {
    id: string;
    tittel: string;
    kort_tittel: string | null;
    status: string;
  } | null;
}

interface Representant {
  id: string;
  fornavn: string;
  etternavn: string;
  fylke: string | null;
  bilde_url: string | null;
}

interface PartiStats {
  totalFor: number;
  totalMot: number;
  totalAvholdende: number;
  antallSaker: number;
}

export default function PartiDetalj() {
  const { forkortelse } = useParams<{ forkortelse: string }>();
  const navigate = useNavigate();
  const [voteringer, setVoteringer] = useState<PartiVotering[]>([]);
  const [representanter, setRepresentanter] = useState<Representant[]>([]);
  const [stats, setStats] = useState<PartiStats>({ totalFor: 0, totalMot: 0, totalAvholdende: 0, antallSaker: 0 });
  const [loading, setLoading] = useState(true);

  const config = getPartiConfig(forkortelse || '');

  useEffect(() => {
    if (forkortelse) {
      fetchData();
    }
  }, [forkortelse]);

  const fetchData = async () => {
    setLoading(true);

    // Fetch parti voteringer
    const { data: voteringerData } = await supabase
      .from('parti_voteringer')
      .select(`
        id,
        sak_id,
        stemmer_for,
        stemmer_mot,
        stemmer_avholdende,
        stortinget_saker (
          id,
          tittel,
          kort_tittel,
          status
        )
      `)
      .eq('parti_forkortelse', forkortelse)
      .order('created_at', { ascending: false })
      .limit(100);

    setVoteringer(voteringerData || []);

    // Calculate stats
    const partiStats = (voteringerData || []).reduce((acc, v) => {
      acc.totalFor += v.stemmer_for;
      acc.totalMot += v.stemmer_mot;
      acc.totalAvholdende += v.stemmer_avholdende;
      acc.antallSaker++;
      return acc;
    }, { totalFor: 0, totalMot: 0, totalAvholdende: 0, antallSaker: 0 });
    setStats(partiStats);

    // Fetch representanter for this party
    const { data: repData } = await supabase
      .from('representanter')
      .select('id, fornavn, etternavn, fylke, bilde_url')
      .eq('parti_forkortelse', forkortelse)
      .eq('er_aktiv', true)
      .order('etternavn', { ascending: true });

    setRepresentanter(repData || []);
    setLoading(false);
  };

  const getPartiStemme = (votering: PartiVotering) => {
    const { stemmer_for, stemmer_mot, stemmer_avholdende } = votering;
    const total = stemmer_for + stemmer_mot + stemmer_avholdende;
    
    if (total === 0) return { label: 'Ingen', icon: <Minus className="h-4 w-4 text-muted-foreground" />, color: 'text-muted-foreground' };
    
    if (stemmer_for > stemmer_mot && stemmer_for > stemmer_avholdende) {
      return { label: 'For', icon: <ThumbsUp className="h-4 w-4 text-green-500" />, color: 'text-green-500' };
    } else if (stemmer_mot > stemmer_for && stemmer_mot > stemmer_avholdende) {
      return { label: 'Mot', icon: <ThumbsDown className="h-4 w-4 text-red-500" />, color: 'text-red-500' };
    } else {
      return { label: 'Delt', icon: <Minus className="h-4 w-4 text-yellow-500" />, color: 'text-yellow-500' };
    }
  };

  const chartData = [
    { name: 'For', value: stats.totalFor, color: 'hsl(142, 76%, 36%)' },
    { name: 'Mot', value: stats.totalMot, color: 'hsl(0, 84%, 60%)' },
    { name: 'Avholdende', value: stats.totalAvholdende, color: 'hsl(45, 93%, 47%)' },
  ].filter(d => d.value > 0);

  const totalStemmer = stats.totalFor + stats.totalMot + stats.totalAvholdende;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-safe">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center justify-between p-4 pt-safe">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-primary"
          >
            <ChevronLeft className="h-5 w-5" />
            <span>Tilbake</span>
          </button>
        </div>
      </header>

      {/* Parti header with color */}
      <div 
        className="px-4 py-8 text-center"
        style={{ 
          background: `linear-gradient(180deg, ${config.farge}20 0%, transparent 100%)`
        }}
      >
        <div 
          className="w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center font-bold text-2xl shadow-lg"
          style={{ 
            backgroundColor: config.farge,
            color: config.tekstFarge
          }}
        >
          {config.forkortelse}
        </div>
        
        <h1 className="text-2xl font-bold text-foreground mb-2">
          {config.navn}
        </h1>
        
        <div className="flex items-center justify-center gap-1 text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>{representanter.length} representanter på Stortinget</span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-2 px-4 mb-6">
        <div className="bg-card rounded-xl p-3 text-center border border-border/50">
          <p className="text-xl font-bold text-foreground">{stats.antallSaker}</p>
          <p className="text-xs text-muted-foreground">Saker</p>
        </div>
        <div className="bg-card rounded-xl p-3 text-center border border-border/50">
          <p className="text-xl font-bold text-green-500">{stats.totalFor}</p>
          <p className="text-xs text-muted-foreground">For</p>
        </div>
        <div className="bg-card rounded-xl p-3 text-center border border-border/50">
          <p className="text-xl font-bold text-red-500">{stats.totalMot}</p>
          <p className="text-xs text-muted-foreground">Mot</p>
        </div>
        <div className="bg-card rounded-xl p-3 text-center border border-border/50">
          <p className="text-xl font-bold text-yellow-500">{stats.totalAvholdende}</p>
          <p className="text-xs text-muted-foreground">Avh.</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="voteringer" className="px-4">
        <TabsList className="w-full grid grid-cols-3 bg-muted/50 rounded-xl p-1">
          <TabsTrigger value="voteringer" className="rounded-lg data-[state=active]:bg-background">
            Voteringer
          </TabsTrigger>
          <TabsTrigger value="statistikk" className="rounded-lg data-[state=active]:bg-background">
            Statistikk
          </TabsTrigger>
          <TabsTrigger value="representanter" className="rounded-lg data-[state=active]:bg-background">
            Politikere
          </TabsTrigger>
        </TabsList>

        {/* Voteringer tab */}
        <TabsContent value="voteringer" className="mt-4 space-y-2 pb-24">
          {voteringer.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Ingen voteringer registrert ennå</p>
              <p className="text-sm text-muted-foreground mt-2">Synkroniser data fra Saker-siden</p>
            </div>
          ) : (
            voteringer.map((votering) => {
              const stemme = getPartiStemme(votering);
              return (
                <Link
                  key={votering.id}
                  to={`/sak/${votering.sak_id}`}
                  className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border/50 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-shrink-0">
                    {stemme.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {votering.stortinget_saker?.kort_tittel || votering.stortinget_saker?.tittel || 'Ukjent sak'}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className={stemme.color}>{stemme.label}</span>
                      <span>•</span>
                      <span>{votering.stemmer_for} for, {votering.stemmer_mot} mot</span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </Link>
              );
            })
          )}
        </TabsContent>

        {/* Statistikk tab */}
        <TabsContent value="statistikk" className="mt-4 pb-24">
          {totalStemmer > 0 ? (
            <div className="bg-card rounded-xl border border-border/50 p-4">
              <h3 className="font-semibold text-foreground mb-4 text-center">Stemmefordeling</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              <div className="mt-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">For-prosent</span>
                  <span className="font-semibold text-green-500">
                    {Math.round((stats.totalFor / totalStemmer) * 100)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Mot-prosent</span>
                  <span className="font-semibold text-red-500">
                    {Math.round((stats.totalMot / totalStemmer) * 100)}%
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Ingen statistikk tilgjengelig</p>
            </div>
          )}
        </TabsContent>

        {/* Representanter tab */}
        <TabsContent value="representanter" className="mt-4 space-y-2 pb-24">
          {representanter.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Ingen representanter funnet</p>
            </div>
          ) : (
            representanter.map((rep) => (
              <Link
                key={rep.id}
                to={`/representant/${rep.id}`}
                className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border/50 hover:bg-accent/50 transition-colors"
              >
                <Avatar className="h-10 w-10 overflow-hidden">
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
                  <p className="font-medium text-foreground truncate">
                    {rep.fornavn} {rep.etternavn}
                  </p>
                  {rep.fylke && (
                    <p className="text-sm text-muted-foreground truncate">{rep.fylke}</p>
                  )}
                </div>
                
                <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              </Link>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
