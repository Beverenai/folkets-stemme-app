import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, Mail, Calendar, MapPin, Building2, ThumbsUp, ThumbsDown, Minus, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';
import PartiBadge from '@/components/PartiBadge';
import { getPartiNavn } from '@/lib/partiConfig';

interface Representant {
  id: string;
  stortinget_id: string;
  fornavn: string;
  etternavn: string;
  parti: string | null;
  parti_forkortelse: string | null;
  fylke: string | null;
  kjonn: string | null;
  fodt: string | null;
  bilde_url: string | null;
  epost: string | null;
  komite: string | null;
  er_aktiv: boolean;
}

interface Votering {
  id: string;
  stemme: string;
  created_at: string;
  sak_id: string | null;
  stortinget_saker: {
    id: string;
    tittel: string;
    kort_tittel: string | null;
    status: string;
  } | null;
}

interface VoteStats {
  total: number;
  for: number;
  mot: number;
  avholdende: number;
  ikke_tilstede: number;
}

export default function RepresentantDetalj() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [representant, setRepresentant] = useState<Representant | null>(null);
  const [voteringer, setVoteringer] = useState<Votering[]>([]);
  const [stats, setStats] = useState<VoteStats>({ total: 0, for: 0, mot: 0, avholdende: 0, ikke_tilstede: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchRepresentant();
      fetchVoteringer();
    }
  }, [id]);

  const fetchRepresentant = async () => {
    const { data, error } = await supabase
      .from('representanter')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching representant:', error);
    } else {
      setRepresentant(data);
    }
    setLoading(false);
  };

  const fetchVoteringer = async () => {
    const { data, error } = await supabase
      .from('representant_voteringer')
      .select(`
        id,
        stemme,
        created_at,
        sak_id,
        stortinget_saker (
          id,
          tittel,
          kort_tittel,
          status
        )
      `)
      .eq('representant_id', id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching voteringer:', error);
    } else {
      setVoteringer(data || []);
      
      // Calculate stats
      const voteStats = (data || []).reduce((acc, v) => {
        acc.total++;
        if (v.stemme === 'for') acc.for++;
        else if (v.stemme === 'mot') acc.mot++;
        else if (v.stemme === 'avholdende') acc.avholdende++;
        else acc.ikke_tilstede++;
        return acc;
      }, { total: 0, for: 0, mot: 0, avholdende: 0, ikke_tilstede: 0 });
      
      setStats(voteStats);
    }
  };

  const getVoteIcon = (stemme: string) => {
    switch (stemme) {
      case 'for': return <ThumbsUp className="h-4 w-4 text-green-500" />;
      case 'mot': return <ThumbsDown className="h-4 w-4 text-red-500" />;
      default: return <Minus className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getVoteLabel = (stemme: string) => {
    switch (stemme) {
      case 'for': return 'For';
      case 'mot': return 'Mot';
      case 'avholdende': return 'Avholdende';
      default: return 'Ikke tilstede';
    }
  };

  const calculateAge = (birthDate: string | null) => {
    if (!birthDate) return null;
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const chartData = [
    { name: 'For', value: stats.for, color: 'hsl(142, 76%, 36%)' },
    { name: 'Mot', value: stats.mot, color: 'hsl(0, 84%, 60%)' },
    { name: 'Avholdende', value: stats.avholdende, color: 'hsl(45, 93%, 47%)' },
  ].filter(d => d.value > 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!representant) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Representant ikke funnet</p>
      </div>
    );
  }

  const age = calculateAge(representant.fodt);

  return (
    <div className="min-h-screen bg-background pb-safe">
      {/* iOS-style header */}
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

      {/* Profile header */}
      <div className="px-4 py-6 text-center">
        <Avatar className="h-24 w-24 mx-auto mb-4 ring-4 ring-background shadow-lg">
          <AvatarImage 
            src={representant.bilde_url || ''} 
            alt={`${representant.fornavn} ${representant.etternavn}`}
          />
          <AvatarFallback className="text-2xl bg-muted">
            {representant.fornavn[0]}{representant.etternavn[0]}
          </AvatarFallback>
        </Avatar>
        
        <h1 className="text-2xl font-bold text-foreground">
          {representant.fornavn} {representant.etternavn}
        </h1>
        
        <div className="flex items-center justify-center gap-2 mt-2">
          {representant.parti_forkortelse && (
            <PartiBadge parti={representant.parti_forkortelse} size="md" showFullName />
          )}
          {representant.fylke && (
            <span className="text-muted-foreground text-sm flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {representant.fylke}
            </span>
          )}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-2 px-4 mb-6">
        <div className="bg-card rounded-xl p-3 text-center border border-border/50">
          <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          <p className="text-xs text-muted-foreground">Totalt</p>
        </div>
        <div className="bg-card rounded-xl p-3 text-center border border-border/50">
          <p className="text-2xl font-bold text-green-500">{stats.for}</p>
          <p className="text-xs text-muted-foreground">For</p>
        </div>
        <div className="bg-card rounded-xl p-3 text-center border border-border/50">
          <p className="text-2xl font-bold text-red-500">{stats.mot}</p>
          <p className="text-xs text-muted-foreground">Mot</p>
        </div>
        <div className="bg-card rounded-xl p-3 text-center border border-border/50">
          <p className="text-2xl font-bold text-yellow-500">{stats.avholdende}</p>
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
          <TabsTrigger value="om" className="rounded-lg data-[state=active]:bg-background">
            Om
          </TabsTrigger>
        </TabsList>

        {/* Voteringer tab */}
        <TabsContent value="voteringer" className="mt-4 space-y-2 pb-24">
          {voteringer.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Ingen voteringer registrert ennå</p>
            </div>
          ) : (
            voteringer.map((votering) => (
              <Link
                key={votering.id}
                to={votering.sak_id ? `/sak/${votering.sak_id}` : '#'}
                className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border/50 hover:bg-accent/50 transition-colors"
              >
                <div className="flex-shrink-0">
                  {getVoteIcon(votering.stemme)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {votering.stortinget_saker?.kort_tittel || votering.stortinget_saker?.tittel || 'Ukjent sak'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {getVoteLabel(votering.stemme)}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </Link>
            ))
          )}
        </TabsContent>

        {/* Statistikk tab */}
        <TabsContent value="statistikk" className="mt-4 pb-24">
          {stats.total > 0 ? (
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
                    {stats.total > 0 ? Math.round((stats.for / stats.total) * 100) : 0}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Mot-prosent</span>
                  <span className="font-semibold text-red-500">
                    {stats.total > 0 ? Math.round((stats.mot / stats.total) * 100) : 0}%
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

        {/* Om tab */}
        <TabsContent value="om" className="mt-4 pb-24">
          <div className="bg-card rounded-xl border border-border/50 divide-y divide-border/50">
            {representant.parti && (
              <div className="flex items-center gap-3 p-4">
                <Building2 className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Parti</p>
                  <p className="text-sm font-medium text-foreground">{representant.parti}</p>
                </div>
              </div>
            )}
            
            {representant.fylke && (
              <div className="flex items-center gap-3 p-4">
                <MapPin className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Valgdistrikt</p>
                  <p className="text-sm font-medium text-foreground">{representant.fylke}</p>
                </div>
              </div>
            )}
            
            {representant.komite && (
              <div className="flex items-center gap-3 p-4">
                <Building2 className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Komité</p>
                  <p className="text-sm font-medium text-foreground">{representant.komite}</p>
                </div>
              </div>
            )}
            
            {age && (
              <div className="flex items-center gap-3 p-4">
                <Calendar className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Alder</p>
                  <p className="text-sm font-medium text-foreground">{age} år</p>
                </div>
              </div>
            )}
            
            {representant.epost && (
              <a 
                href={`mailto:${representant.epost}`}
                className="flex items-center gap-3 p-4 hover:bg-accent/50 transition-colors"
              >
                <Mail className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">E-post</p>
                  <p className="text-sm font-medium text-primary">{representant.epost}</p>
                </div>
              </a>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
