import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { getPartiConfig } from '@/lib/partiConfig';
import { ChevronRight, Users, Building2, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

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

  useEffect(() => {
    async function fetchData() {
      try {
        const sb = supabase as any;

        // Fetch party agreement data
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
        
        // Fetch parti votes
        const { data: partiVotes } = await sb
          .from('parti_voteringer')
          .select('*')
          .in('sak_id', sakIds);

        // Calculate party agreement
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

        // Fetch representative agreement
        const { data: repVoteringer } = await sb
          .from('representant_voteringer')
          .select('representant_id, sak_id, stemme')
          .in('sak_id', sakIds);

        const { data: representanter } = await sb
          .from('representanter')
          .select('id, fornavn, etternavn, parti_forkortelse, bilde_url')
          .eq('er_aktiv', true);

        // Calculate rep agreement
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
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-32 bg-card rounded-xl animate-pulse" />
        <div className="h-32 bg-card rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Parti-seksjon */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            Partiene vs Folket
          </h2>
          <Link 
            to="/representanter" 
            className="text-xs text-primary flex items-center gap-0.5 hover:underline"
          >
            Se alle <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        
        <div className="rounded-2xl bg-secondary/80 backdrop-blur-sm border border-border/50 p-4 space-y-3 shadow-[0_2px_8px_rgba(0,0,0,0.1)]">
          {partiData.slice(0, 5).map((parti, index) => {
            const config = getPartiConfig(parti.partiForkortelse);
            return (
              <Link
                key={parti.partiForkortelse}
                to={`/parti/${parti.partiForkortelse}`}
                className="flex items-center gap-3 group animate-ios-slide-up"
                style={{ animationDelay: `${index * 0.03}s` }}
              >
                <div 
                  className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 shadow-sm"
                  style={{ backgroundColor: config.farge, color: config.tekstFarge }}
                >
                  {config.forkortelse}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                      {config.navn}
                    </span>
                    <span className="text-sm font-bold tabular-nums ml-2">{Math.round(parti.enighet)}%</span>
                  </div>
                  <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${parti.enighet}%`, backgroundColor: config.farge }}
                    />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Representanter som er mest enig */}
      {topReps.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-vote-for" />
            <h2 className="text-base font-semibold">Mest enig med folket</h2>
          </div>
          
          <div className="rounded-2xl bg-secondary/80 backdrop-blur-sm border border-border/50 divide-y divide-border/50 overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.1)]">
            {topReps.map((rep) => (
              <RepresentantRow key={rep.id} rep={rep} />
            ))}
          </div>
        </section>
      )}

      {/* Representanter som er minst enig */}
      {bottomReps.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-vote-mot" />
            <h2 className="text-base font-semibold">Minst enig med folket</h2>
          </div>
          
          <div className="rounded-2xl bg-secondary/80 backdrop-blur-sm border border-border/50 divide-y divide-border/50 overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.1)]">
            {bottomReps.map((rep) => (
              <RepresentantRow key={rep.id} rep={rep} />
            ))}
          </div>
        </section>
      )}

      {/* Se alle knapp */}
      <Link
        to="/representanter"
        className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-primary/10 border border-primary/20 text-primary font-semibold text-sm hover:bg-primary/15 transition-colors ios-press"
      >
        <Users className="h-4 w-4" />
        Se alle politikere
        <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

function RepresentantRow({ rep }: { rep: RepresentantSamsvar }) {
  const config = getPartiConfig(rep.parti_forkortelse);
  
  return (
    <Link
      to={`/representant/${rep.id}`}
      className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
    >
      {rep.bilde_url ? (
        <img 
          src={rep.bilde_url} 
          alt={rep.navn}
          className="h-10 w-10 rounded-full object-cover bg-muted shadow-sm"
        />
      ) : (
        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
          <Users className="h-5 w-5 text-muted-foreground" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">{rep.navn}</div>
        <div className="text-xs text-muted-foreground flex items-center gap-1.5">
          <span 
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: config.farge }}
          />
          {config.navn}
        </div>
      </div>
      <div className={cn(
        "text-base font-bold tabular-nums",
        rep.enighet >= 60 ? "text-vote-for" : rep.enighet <= 40 ? "text-vote-mot" : "text-foreground"
      )}>
        {Math.round(rep.enighet)}%
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
    </Link>
  );
}
