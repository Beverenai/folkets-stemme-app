import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { getPartiConfig } from '@/lib/partiConfig';
import { ChevronRight, Users, Building2, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { triggerHaptic } from '@/lib/haptics';

interface PartiSamsvar {
  parti: string;
  partiForkortelse: string;
  enighet: number;
  antallSaker: number;
}

interface RepresentantSamsvar {
  id: string;
  navn: string;
  parti_forkortelse: string;
  enighet: number;
  antallVoteringer: number;
  bilde_url: string | null;
}

export default function PolitikereFolketPreview() {
  const [partiData, setPartiData] = useState<PartiSamsvar[]>([]);
  const [topReps, setTopReps] = useState<RepresentantSamsvar[]>([]);
  const [bottomReps, setBottomReps] = useState<RepresentantSamsvar[]>([]);
  const [loading, setLoading] = useState(true);
  const [animateProgress, setAnimateProgress] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const sb = supabase as any;

        const { data: saker } = await sb
          .from('stortinget_saker')
          .select(`
            id,
            stortinget_votering_for,
            stortinget_votering_mot,
            folke_stemmer(stemme)
          `)
          .eq('status', 'avsluttet')
          .eq('er_viktig', true);

        const sakIds = (saker || []).map((s: any) => s.id);
        
        const { data: partiVotes } = await sb
          .from('parti_voteringer')
          .select('*')
          .in('sak_id', sakIds);

        const partiStats: Record<string, { enig: number; total: number; navn: string }> = {};
        const sakFolkeMajority: Record<string, string> = {};

        (saker || []).forEach((sak: any) => {
          const folkeStemmer = sak.folke_stemmer || [];
          if (folkeStemmer.length === 0) return;

          const folkeFor = folkeStemmer.filter((s: any) => s.stemme === 'for').length;
          const folkeMot = folkeStemmer.filter((s: any) => s.stemme === 'mot').length;
          const folkeMajority = folkeFor > folkeMot ? 'for' : folkeFor < folkeMot ? 'mot' : 'likt';
          sakFolkeMajority[sak.id] = folkeMajority;

          const sakPartiVotes = (partiVotes || []).filter((p: any) => p.sak_id === sak.id);
          
          sakPartiVotes.forEach((pv: any) => {
            const partiMajority = pv.stemmer_for > pv.stemmer_mot ? 'for' : pv.stemmer_for < pv.stemmer_mot ? 'mot' : 'likt';
            
            if (!partiStats[pv.parti_forkortelse]) {
              partiStats[pv.parti_forkortelse] = { enig: 0, total: 0, navn: pv.parti_navn };
            }
            
            partiStats[pv.parti_forkortelse].total++;
            if (partiMajority === folkeMajority) {
              partiStats[pv.parti_forkortelse].enig++;
            }
          });
        });

        const partiResult: PartiSamsvar[] = Object.entries(partiStats)
          .filter(([_, stats]) => stats.total >= 1)
          .map(([forkortelse, stats]) => ({
            parti: stats.navn,
            partiForkortelse: forkortelse,
            enighet: stats.total > 0 ? (stats.enig / stats.total) * 100 : 0,
            antallSaker: stats.total,
          }))
          .sort((a, b) => b.enighet - a.enighet);

        setPartiData(partiResult);

        const { data: repVoteringer } = await sb
          .from('representant_voteringer')
          .select('representant_id, sak_id, stemme')
          .in('sak_id', sakIds);

        const { data: representanter } = await sb
          .from('representanter')
          .select('id, fornavn, etternavn, parti_forkortelse, bilde_url')
          .eq('er_aktiv', true);

        const repStats: Record<string, { enig: number; total: number }> = {};

        (repVoteringer || []).forEach((rv: any) => {
          const folkeMajority = sakFolkeMajority[rv.sak_id];
          if (!folkeMajority || folkeMajority === 'likt') return;

          if (!repStats[rv.representant_id]) {
            repStats[rv.representant_id] = { enig: 0, total: 0 };
          }

          repStats[rv.representant_id].total++;
          
          const repVote = rv.stemme === 'for' ? 'for' : rv.stemme === 'mot' ? 'mot' : null;
          if (repVote === folkeMajority) {
            repStats[rv.representant_id].enig++;
          }
        });

        const repResult: RepresentantSamsvar[] = (representanter || [])
          .filter((r: any) => repStats[r.id]?.total >= 3)
          .map((r: any) => ({
            id: r.id,
            navn: `${r.fornavn} ${r.etternavn}`,
            parti_forkortelse: r.parti_forkortelse,
            enighet: repStats[r.id].total > 0 ? (repStats[r.id].enig / repStats[r.id].total) * 100 : 0,
            antallVoteringer: repStats[r.id].total,
            bilde_url: r.bilde_url,
          }));

        const sortedByEnighet = [...repResult].sort((a, b) => b.enighet - a.enighet);
        setTopReps(sortedByEnighet.slice(0, 3));
        setBottomReps(sortedByEnighet.slice(-3).reverse());

      } catch (error) {
        console.error('Error fetching politiker data:', error);
      } finally {
        setLoading(false);
        // Trigger progress bar animation after data loads
        setTimeout(() => setAnimateProgress(true), 100);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-5">
        {/* Skeleton for party section */}
        <div className="space-y-3">
          <div className="h-5 w-40 bg-secondary rounded-lg animate-pulse" />
          <div className="rounded-2xl bg-card border border-border p-4 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="h-8 w-8 rounded-full bg-secondary animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-24 bg-secondary rounded animate-pulse" />
                  <div className="h-2 bg-secondary rounded-full animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Skeleton for reps */}
        <div className="space-y-3">
          <div className="h-5 w-36 bg-secondary rounded-lg animate-pulse" />
          <div className="rounded-2xl bg-card border border-border divide-y divide-border overflow-hidden">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-4">
                <div className="h-10 w-10 rounded-full bg-secondary animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-28 bg-secondary rounded animate-pulse" />
                  <div className="h-3 w-20 bg-secondary rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Show empty state if no data
  if (partiData.length === 0 && topReps.length === 0) {
    return (
      <div className="space-y-6">
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 className="h-4 w-4 text-primary" />
              </div>
              Partiene vs Folket
            </h2>
          </div>
          
          <div className="rounded-2xl bg-card border border-border p-6 text-center shadow-sm">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-1">Ingen stemmer ennå</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Bli den første til å stemme og se hvordan du sammenligner med politikerne!
            </p>
            <Link
              to="/stem"
              onClick={() => triggerHaptic('medium')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors"
            >
              Stem nå
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        <Link
          to="/representanter"
          onClick={() => triggerHaptic('medium')}
          className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 active:scale-[0.98] transition-all shadow-sm shadow-primary/20 ios-press"
        >
          <Users className="h-4 w-4" />
          Se alle politikere
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Parti-seksjon */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="h-4 w-4 text-primary" />
            </div>
            Partiene vs Folket
          </h2>
          <Link 
            to="/representanter" 
            className="text-xs text-primary font-medium flex items-center gap-0.5 hover:underline group"
            onClick={() => triggerHaptic('light')}
          >
            Se alle 
            <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
        
        <div className="rounded-2xl bg-card border border-border overflow-hidden shadow-sm">
          {partiData.slice(0, 5).map((parti, index) => {
            const config = getPartiConfig(parti.partiForkortelse);
            return (
              <Link
                key={parti.partiForkortelse}
                to={`/parti/${parti.partiForkortelse}`}
                onClick={() => triggerHaptic('light')}
                className={cn(
                  "flex items-center gap-3 p-4 hover:bg-secondary/50 active:bg-secondary transition-colors group",
                  index !== partiData.slice(0, 5).length - 1 && "border-b border-border"
                )}
                style={{ 
                  animationDelay: `${index * 0.05}s`,
                  opacity: 0,
                  animation: 'ios-slide-up 0.4s ease-out forwards',
                }}
              >
                <div 
                  className="h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 shadow-sm ring-2 ring-background group-hover:scale-105 transition-transform"
                  style={{ backgroundColor: config.farge, color: config.tekstFarge }}
                >
                  {config.forkortelse}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                      {config.navn}
                    </span>
                    <span className="text-sm font-bold tabular-nums ml-2">{Math.round(parti.enighet)}%</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-1000 ease-out"
                      style={{ 
                        width: animateProgress ? `${parti.enighet}%` : '0%', 
                        backgroundColor: config.farge,
                        transitionDelay: `${index * 0.1}s`
                      }}
                    />
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all" />
              </Link>
            );
          })}
        </div>
      </section>

      {/* Representanter som er mest enig */}
      {topReps.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-vote-for/10 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-vote-for" />
            </div>
            <h2 className="text-base font-semibold">Mest enig med folket</h2>
          </div>
          
          <div className="rounded-2xl bg-card border border-border divide-y divide-border overflow-hidden shadow-sm">
            {topReps.map((rep, index) => (
              <RepresentantRow 
                key={rep.id} 
                rep={rep} 
                index={index}
                variant="positive"
              />
            ))}
          </div>
        </section>
      )}

      {/* Representanter som er minst enig */}
      {bottomReps.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-vote-mot/10 flex items-center justify-center">
              <TrendingDown className="h-4 w-4 text-vote-mot" />
            </div>
            <h2 className="text-base font-semibold">Minst enig med folket</h2>
          </div>
          
          <div className="rounded-2xl bg-card border border-border divide-y divide-border overflow-hidden shadow-sm">
            {bottomReps.map((rep, index) => (
              <RepresentantRow 
                key={rep.id} 
                rep={rep} 
                index={index}
                variant="negative"
              />
            ))}
          </div>
        </section>
      )}

      {/* Se alle knapp */}
      <Link
        to="/representanter"
        onClick={() => triggerHaptic('medium')}
        className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 active:scale-[0.98] transition-all shadow-sm shadow-primary/20 ios-press"
      >
        <Users className="h-4 w-4" />
        Se alle politikere
        <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

function RepresentantRow({ 
  rep, 
  index,
  variant 
}: { 
  rep: RepresentantSamsvar; 
  index: number;
  variant: 'positive' | 'negative';
}) {
  const config = getPartiConfig(rep.parti_forkortelse);
  
  return (
    <Link
      to={`/representant/${rep.id}`}
      onClick={() => triggerHaptic('light')}
      className="flex items-center gap-3 px-4 py-3.5 hover:bg-secondary/50 active:bg-secondary transition-colors group"
      style={{ 
        animationDelay: `${index * 0.05}s`,
        opacity: 0,
        animation: 'ios-slide-up 0.4s ease-out forwards',
      }}
    >
      {rep.bilde_url ? (
        <img 
          src={rep.bilde_url} 
          alt={rep.navn}
          className="h-11 w-11 rounded-full object-cover bg-secondary shadow-sm ring-2 ring-background group-hover:scale-105 transition-transform"
        />
      ) : (
        <div className="h-11 w-11 rounded-full bg-secondary flex items-center justify-center ring-2 ring-background">
          <Users className="h-5 w-5 text-muted-foreground" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate group-hover:text-primary transition-colors">{rep.navn}</div>
        <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
          <span 
            className="inline-block h-2.5 w-2.5 rounded-full shadow-sm"
            style={{ backgroundColor: config.farge }}
          />
          {config.navn}
        </div>
      </div>
      <div className={cn(
        "text-lg font-bold tabular-nums",
        variant === 'positive' ? "text-vote-for" : "text-vote-mot"
      )}>
        {Math.round(rep.enighet)}%
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all" />
    </Link>
  );
}
