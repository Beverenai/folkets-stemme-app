import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { BarChart3, Users, CheckCircle, XCircle, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import ResultBar from '@/components/ResultBar';

interface VoteringResult {
  id: string;
  oppsummering: string | null;
  forslag_tekst: string | null;
  vedtatt: boolean | null;
  resultat_for: number;
  resultat_mot: number;
  resultat_avholdende: number;
  votering_dato: string | null;
  stortinget_saker?: {
    tittel: string;
    kategori: string | null;
  } | null;
  folke_stemmer?: { stemme: string }[];
}

async function fetchResultater() {
  const sb = supabase as any;
  
  const [voteringerRes, stemmerRes] = await Promise.all([
    sb.from('voteringer')
      .select(`
        id, oppsummering, forslag_tekst, vedtatt, resultat_for, resultat_mot, resultat_avholdende, votering_dato,
        stortinget_saker(tittel, kategori)
      `)
      .eq('status', 'avsluttet')
      .order('votering_dato', { ascending: false })
      .limit(30),
    sb.from('folke_stemmer').select('stemme, votering_id')
  ]);

  if (voteringerRes.error) throw voteringerRes.error;

  const voteringer = voteringerRes.data || [];
  const stemmer = stemmerRes.data || [];

  return voteringer.map((v: any) => ({
    ...v,
    folke_stemmer: stemmer.filter((s: any) => s.votering_id === v.id)
  })) as VoteringResult[];
}

function ResultCardSkeleton() {
  return (
    <div className="bg-card border border-border/50 rounded-2xl p-4 shadow-sm">
      <Skeleton className="h-4 w-3/4 mb-2" />
      <Skeleton className="h-3 w-1/2 mb-4" />
      <Skeleton className="h-2 w-full rounded-full" />
    </div>
  );
}

export default function Resultater() {
  const { data: resultater = [], isLoading } = useQuery({
    queryKey: ['resultater'],
    queryFn: fetchResultater,
    staleTime: 1000 * 60 * 5,
  });

  const getEnighet = (votering: VoteringResult) => {
    const stemmer = votering.folke_stemmer || [];
    const folkeFor = stemmer.filter(s => s.stemme === 'for').length;
    const folkeMot = stemmer.filter(s => s.stemme === 'mot').length;
    const total = folkeFor + folkeMot;
    if (total === 0) return null;

    const folkFlertallFor = folkeFor > folkeMot;
    const stortingetFor = votering.vedtatt === true;
    
    return folkFlertallFor === stortingetFor;
  };

  const enigeCount = resultater.filter(r => getEnighet(r) === true).length;
  const uenigeCount = resultater.filter(r => getEnighet(r) === false).length;
  const totalMedStemmer = enigeCount + uenigeCount;

  return (
    <Layout title="Resultater">
      <div className="px-4 py-4 space-y-5 animate-ios-fade">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-foreground">Avstemningsresultater</h1>
          <p className="text-sm text-muted-foreground">
            Se hvordan Stortinget stemte sammenlignet med folket
          </p>
        </div>

        {/* Stats */}
        {totalMedStemmer > 0 && (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-vote-for/10 border border-vote-for/20 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="h-5 w-5 text-vote-for" />
                <span className="text-2xl font-bold text-vote-for">{enigeCount}</span>
              </div>
              <p className="text-xs text-muted-foreground">Enige med folket</p>
            </div>
            <div className="bg-vote-mot/10 border border-vote-mot/20 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <XCircle className="h-5 w-5 text-vote-mot" />
                <span className="text-2xl font-bold text-vote-mot">{uenigeCount}</span>
              </div>
              <p className="text-xs text-muted-foreground">Uenige med folket</p>
            </div>
          </div>
        )}

        {/* Results List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <ResultCardSkeleton key={i} />
            ))}
          </div>
        ) : resultater.length > 0 ? (
          <div className="space-y-3">
            {resultater.map((votering, index) => {
              const stemmer = votering.folke_stemmer || [];
              const folkeFor = stemmer.filter(s => s.stemme === 'for').length;
              const folkeMot = stemmer.filter(s => s.stemme === 'mot').length;
              const folkeAvholdende = stemmer.filter(s => s.stemme === 'avholdende').length;
              const totalFolke = folkeFor + folkeMot + folkeAvholdende;
              const enighet = getEnighet(votering);
              const displayText = votering.oppsummering || votering.forslag_tekst || votering.stortinget_saker?.tittel || 'Votering';

              return (
                <Link
                  key={votering.id}
                  to={`/votering/${votering.id}`}
                  className="bg-card border border-border/50 rounded-2xl p-4 block shadow-sm hover:shadow-md transition-all ios-press animate-ios-slide-up"
                  style={{ animationDelay: `${index * 0.03}s` }}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <p className="font-medium text-[15px] leading-snug line-clamp-2 text-foreground flex-1">
                      {displayText}
                    </p>
                    <div className="flex items-center gap-2 shrink-0">
                      {enighet !== null && (
                        <span className={cn(
                          'px-2 py-1 rounded-full text-[10px] font-medium',
                          enighet ? 'bg-vote-for/20 text-vote-for' : 'bg-vote-mot/20 text-vote-mot'
                        )}>
                          {enighet ? 'Enig' : 'Uenig'}
                        </span>
                      )}
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>

                  {totalFolke > 0 && (
                    <div className="mb-2">
                      <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        Folket ({totalFolke})
                      </p>
                      <ResultBar
                        forCount={folkeFor}
                        motCount={folkeMot}
                        avholdendeCount={folkeAvholdende}
                        size="sm"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      Stortinget: {votering.resultat_for} for, {votering.resultat_mot} mot
                    </span>
                    <span className={cn(
                      'font-medium',
                      votering.vedtatt ? 'text-vote-for' : 'text-vote-mot'
                    )}>
                      {votering.vedtatt ? 'Vedtatt' : 'Ikke vedtatt'}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="bg-card border border-border/50 rounded-2xl p-8 text-center shadow-sm">
            <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">Ingen avsluttede voteringer ennå</p>
          </div>
        )}

        {resultater.length > 0 && (
          <p className="text-center text-xs text-muted-foreground pb-4">
            Viser {resultater.length} avsluttede voteringer
          </p>
        )}
      </div>
    </Layout>
  );
}
