import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, Mail, Calendar, MapPin, Building2, ThumbsUp, ThumbsDown, Minus, ChevronRight, Users, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';
import PartiBadge from '@/components/PartiBadge';
import { cn } from '@/lib/utils';
import ResultBar from '@/components/ResultBar';

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

interface VoteringWithComparison {
  id: string;
  stemme: string;
  created_at: string;
  sak_id: string | null;
  votering_id: string | null;
  voteringData?: {
    id: string;
    oppsummering: string | null;
    forslag_tekst: string | null;
  } | null;
  stortinget_saker: {
    id: string;
    tittel: string;
    kort_tittel: string | null;
    status: string;
  } | null;
  folkeStemmer?: {
    for: number;
    mot: number;
    avholdende: number;
    total: number;
  };
  enig?: boolean;
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
  const [voteringer, setVoteringer] = useState<VoteringWithComparison[]>([]);
  const [stats, setStats] = useState<VoteStats>({ total: 0, for: 0, mot: 0, avholdende: 0, ikke_tilstede: 0 });
  const [agreementScore, setAgreementScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchRepresentant();
      fetchVoteringerWithComparison();
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

  const fetchVoteringerWithComparison = async () => {
    const sb = supabase as any;
    
    // Fetch representative's votes
    const { data: repVotes, error } = await supabase
      .from('representant_voteringer')
      .select(`
        id,
        stemme,
        created_at,
        sak_id,
        votering_id,
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
      return;
    }

    // Calculate stats
    const voteStats = (repVotes || []).reduce((acc, v) => {
      acc.total++;
      if (v.stemme === 'for') acc.for++;
      else if (v.stemme === 'mot') acc.mot++;
      else if (v.stemme === 'avholdende') acc.avholdende++;
      else acc.ikke_tilstede++;
      return acc;
    }, { total: 0, for: 0, mot: 0, avholdende: 0, ikke_tilstede: 0 });
    setStats(voteStats);

    // Get unique sak_ids to fetch folk votes
    const sakIds = [...new Set((repVotes || []).map(v => v.sak_id).filter(Boolean))];
    
    // Fetch folk votes for these saker
    let folkVotesMap: Record<string, { for: number; mot: number; avholdende: number; total: number }> = {};
    
    if (sakIds.length > 0) {
      const { data: folkVotes } = await sb
        .from('folke_stemmer')
        .select('sak_id, stemme')
        .in('sak_id', sakIds);

      // Aggregate folk votes by sak_id
      (folkVotes || []).forEach((vote: any) => {
        if (!vote.sak_id) return;
        if (!folkVotesMap[vote.sak_id]) {
          folkVotesMap[vote.sak_id] = { for: 0, mot: 0, avholdende: 0, total: 0 };
        }
        folkVotesMap[vote.sak_id].total++;
        if (vote.stemme === 'for') folkVotesMap[vote.sak_id].for++;
        else if (vote.stemme === 'mot') folkVotesMap[vote.sak_id].mot++;
        else if (vote.stemme === 'avholdende') folkVotesMap[vote.sak_id].avholdende++;
      });
    }

    // Also fetch votering_id based folk votes
    const voteringIds = [...new Set((repVotes || []).map(v => v.votering_id).filter(Boolean))];
    let folkVotesByVotering: Record<string, { for: number; mot: number; avholdende: number; total: number }> = {};
    
    if (voteringIds.length > 0) {
      const { data: folkVotesVotering } = await sb
        .from('folke_stemmer')
        .select('votering_id, stemme')
        .in('votering_id', voteringIds);

      (folkVotesVotering || []).forEach((vote: any) => {
        if (!vote.votering_id) return;
        if (!folkVotesByVotering[vote.votering_id]) {
          folkVotesByVotering[vote.votering_id] = { for: 0, mot: 0, avholdende: 0, total: 0 };
        }
        folkVotesByVotering[vote.votering_id].total++;
        if (vote.stemme === 'for') folkVotesByVotering[vote.votering_id].for++;
        else if (vote.stemme === 'mot') folkVotesByVotering[vote.votering_id].mot++;
        else if (vote.stemme === 'avholdende') folkVotesByVotering[vote.votering_id].avholdende++;
      });
    }

    // Merge folk votes with rep votes and calculate agreement
    let agreementCount = 0;
    let comparisonCount = 0;

    const voteringerWithComparison = (repVotes || []).map((v: any) => {
      // Try votering_id first, then sak_id
      const folkStemmer = v.votering_id ? folkVotesByVotering[v.votering_id] : folkVotesMap[v.sak_id];
      
      let enig: boolean | undefined = undefined;
      
      if (folkStemmer && folkStemmer.total > 0 && v.stemme !== 'ikke_tilstede') {
        const folkMajority = folkStemmer.for > folkStemmer.mot ? 'for' : 
                           folkStemmer.mot > folkStemmer.for ? 'mot' : 'likt';
        
        if (folkMajority !== 'likt') {
          enig = v.stemme === folkMajority;
          comparisonCount++;
          if (enig) agreementCount++;
        }
      }

      return {
        ...v,
        folkeStemmer: folkStemmer,
        enig,
      };
    });

    setVoteringer(voteringerWithComparison);
    
    // Calculate overall agreement score
    if (comparisonCount > 0) {
      setAgreementScore(Math.round((agreementCount / comparisonCount) * 100));
    }
  };

  const getVoteIcon = (stemme: string) => {
    switch (stemme) {
      case 'for': return <ThumbsUp className="h-4 w-4 text-vote-for" />;
      case 'mot': return <ThumbsDown className="h-4 w-4 text-vote-mot" />;
      default: return <Minus className="h-4 w-4 text-vote-avholdende" />;
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
    { name: 'For', value: stats.for, color: 'hsl(var(--vote-for))' },
    { name: 'Mot', value: stats.mot, color: 'hsl(var(--vote-mot))' },
    { name: 'Avholdende', value: stats.avholdende, color: 'hsl(var(--vote-avholdende))' },
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
        <Avatar className="h-24 w-24 mx-auto mb-4 ring-4 ring-background shadow-lg overflow-hidden">
          <AvatarImage 
            src={representant.bilde_url || ''} 
            alt={`${representant.fornavn} ${representant.etternavn}`}
            className="object-cover object-top"
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

      {/* Agreement score card */}
      {agreementScore !== null && (
        <div className="px-4 mb-4">
          <div className={cn(
            'premium-card p-4 flex items-center gap-4',
            agreementScore >= 60 ? 'bg-vote-for/10 border-vote-for/30' :
            agreementScore >= 40 ? 'bg-vote-avholdende/10 border-vote-avholdende/30' :
            'bg-vote-mot/10 border-vote-mot/30'
          )}>
            <div className={cn(
              'h-14 w-14 rounded-2xl flex items-center justify-center',
              agreementScore >= 60 ? 'bg-vote-for/20' :
              agreementScore >= 40 ? 'bg-vote-avholdende/20' :
              'bg-vote-mot/20'
            )}>
              <TrendingUp className={cn(
                'h-7 w-7',
                agreementScore >= 60 ? 'text-vote-for' :
                agreementScore >= 40 ? 'text-vote-avholdende' :
                'text-vote-mot'
              )} />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Enig med folket</p>
              <p className={cn(
                'text-2xl font-bold',
                agreementScore >= 60 ? 'text-vote-for' :
                agreementScore >= 40 ? 'text-vote-avholdende' :
                'text-vote-mot'
              )}>
                {agreementScore}%
              </p>
            </div>
            <Users className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-2 px-4 mb-6">
        <div className="bg-card rounded-xl p-3 text-center border border-border/50">
          <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          <p className="text-xs text-muted-foreground">Totalt</p>
        </div>
        <div className="bg-card rounded-xl p-3 text-center border border-border/50">
          <p className="text-2xl font-bold text-vote-for">{stats.for}</p>
          <p className="text-xs text-muted-foreground">For</p>
        </div>
        <div className="bg-card rounded-xl p-3 text-center border border-border/50">
          <p className="text-2xl font-bold text-vote-mot">{stats.mot}</p>
          <p className="text-xs text-muted-foreground">Mot</p>
        </div>
        <div className="bg-card rounded-xl p-3 text-center border border-border/50">
          <p className="text-2xl font-bold text-vote-avholdende">{stats.avholdende}</p>
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
        <TabsContent value="voteringer" className="mt-4 space-y-3 pb-24">
          {voteringer.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Ingen voteringer registrert ennå</p>
            </div>
          ) : (
            voteringer.map((votering) => (
              <Link
                key={votering.id}
                to={votering.sak_id ? `/sak/${votering.sak_id}` : '#'}
                className="block bg-card rounded-xl border border-border/50 hover:bg-accent/50 transition-colors overflow-hidden"
              >
                <div className="flex items-center gap-3 p-3">
                  <div className="flex-shrink-0">
                    {getVoteIcon(votering.stemme)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground line-clamp-2">
                      {votering.stortinget_saker?.kort_tittel || votering.stortinget_saker?.tittel || 'Ukjent sak'}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={cn(
                        'text-xs font-medium',
                        votering.stemme === 'for' && 'text-vote-for',
                        votering.stemme === 'mot' && 'text-vote-mot',
                        votering.stemme === 'avholdende' && 'text-vote-avholdende',
                      )}>
                        {getVoteLabel(votering.stemme)}
                      </span>
                      {votering.enig !== undefined && (
                        <span className={cn(
                          'text-[10px] px-1.5 py-0.5 rounded-full',
                          votering.enig ? 'bg-vote-for/20 text-vote-for' : 'bg-vote-mot/20 text-vote-mot'
                        )}>
                          {votering.enig ? '✓ Enig med folket' : '✗ Uenig med folket'}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </div>
                
                {/* Folk comparison bar */}
                {votering.folkeStemmer && votering.folkeStemmer.total > 0 && (
                  <div className="px-3 pb-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Users className="h-3 w-3 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground">
                        Folket ({votering.folkeStemmer.total} stemmer)
                      </span>
                    </div>
                    <ResultBar 
                      forCount={votering.folkeStemmer.for}
                      motCount={votering.folkeStemmer.mot}
                      avholdendeCount={votering.folkeStemmer.avholdende}
                      size="sm"
                    />
                  </div>
                )}
              </Link>
            ))
          )}
        </TabsContent>

        {/* Statistikk tab */}
        <TabsContent value="statistikk" className="mt-4 pb-24 space-y-4">
          {/* Agreement with folk */}
          {agreementScore !== null && (
            <div className="bg-card rounded-xl border border-border/50 p-4">
              <h3 className="font-semibold text-foreground mb-3">Enighet med folket</h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold">
                    <span className={cn(
                      agreementScore >= 60 ? 'text-vote-for' :
                      agreementScore >= 40 ? 'text-vote-avholdende' :
                      'text-vote-mot'
                    )}>{agreementScore}%</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {agreementScore >= 60 ? 'Stemmer ofte med flertallet' :
                     agreementScore >= 40 ? 'Varierende enighet' :
                     'Stemmer sjelden med flertallet'}
                  </p>
                </div>
                <div className={cn(
                  'h-16 w-16 rounded-full flex items-center justify-center',
                  agreementScore >= 60 ? 'bg-vote-for/20' :
                  agreementScore >= 40 ? 'bg-vote-avholdende/20' :
                  'bg-vote-mot/20'
                )}>
                  <Users className={cn(
                    'h-8 w-8',
                    agreementScore >= 60 ? 'text-vote-for' :
                    agreementScore >= 40 ? 'text-vote-avholdende' :
                    'text-vote-mot'
                  )} />
                </div>
              </div>
            </div>
          )}

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
                  <span className="font-semibold text-vote-for">
                    {stats.total > 0 ? Math.round((stats.for / stats.total) * 100) : 0}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Mot-prosent</span>
                  <span className="font-semibold text-vote-mot">
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