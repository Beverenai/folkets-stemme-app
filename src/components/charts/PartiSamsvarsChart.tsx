import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import NrkPartiBar from '@/components/NrkPartiBar';
import { Building2 } from 'lucide-react';

interface PartiSamsvar {
  parti: string;
  partiForkortelse: string;
  enighet: number;
  antallSaker: number;
}

export default function PartiSamsvarsChart() {
  const [data, setData] = useState<PartiSamsvar[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const sb = supabase as any;
        
        // Get all finished saker with folk votes
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

        // Get parti votes for these saker
        const sakIds = (saker || []).map((s: any) => s.id);
        const { data: partiVotes } = await sb
          .from('parti_voteringer')
          .select('*')
          .in('sak_id', sakIds);

        // Calculate agreement for each party
        const partiStats: Record<string, { enig: number; total: number; navn: string }> = {};

        (saker || []).forEach((sak: any) => {
          const folkeStemmer = sak.folke_stemmer || [];
          if (folkeStemmer.length === 0) return;

          const folkeFor = folkeStemmer.filter((s: any) => s.stemme === 'for').length;
          const folkeMot = folkeStemmer.filter((s: any) => s.stemme === 'mot').length;
          const folkeMajority = folkeFor > folkeMot ? 'for' : folkeFor < folkeMot ? 'mot' : 'likt';

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

        const result: PartiSamsvar[] = Object.entries(partiStats)
          .filter(([_, stats]) => stats.total >= 1)
          .map(([forkortelse, stats]) => ({
            parti: stats.navn,
            partiForkortelse: forkortelse,
            enighet: stats.total > 0 ? (stats.enig / stats.total) * 100 : 0,
            antallSaker: stats.total,
          }));

        setData(result);
      } catch (error) {
        console.error('Error fetching parti samsvar:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Building2 className="h-10 w-10 mx-auto mb-3 opacity-50" />
        <p className="text-sm">Ikke nok data ennå</p>
      </div>
    );
  }

  return <NrkPartiBar data={data} />;
}
