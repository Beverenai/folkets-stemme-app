import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Votering {
  id: string;
  stortinget_votering_id: string;
  forslag_tekst: string | null;
  oppsummering: string | null;
  votering_dato: string | null;
  status: string;
  resultat_for: number;
  resultat_mot: number;
  resultat_avholdende: number;
  vedtatt: boolean | null;
  sak_id: string | null;
  stortinget_saker?: {
    tittel: string;
    kategori: string | null;
    er_viktig: boolean;
  } | null;
  folke_stemmer?: { stemme: string; user_id: string }[];
}

interface ViktigSak {
  id: string;
  tittel: string;
  kort_tittel: string | null;
  oppsummering: string | null;
  kategori: string | null;
  status: string;
  stortinget_votering_for: number | null;
  stortinget_votering_mot: number | null;
  stortinget_votering_avholdende: number | null;
  vedtak_resultat: string | null;
  folke_stemmer?: { stemme: string; user_id: string }[];
}

async function fetchAktiveVoteringer(): Promise<Votering[]> {
  const sb = supabase as any;
  
  const { data: voteringer } = await sb
    .from('voteringer')
    .select(`*, stortinget_saker!inner(tittel, kategori, er_viktig)`)
    .eq('status', 'pågående')
    .eq('stortinget_saker.er_viktig', true)
    .order('votering_dato', { ascending: false })
    .limit(10);

  if (!voteringer?.length) return [];

  const voteringIds = voteringer.map((v: any) => v.id);
  const { data: stemmer } = await sb
    .from('folke_stemmer')
    .select('stemme, user_id, votering_id')
    .in('votering_id', voteringIds);

  return voteringer.map((v: any) => ({
    ...v,
    folke_stemmer: (stemmer || []).filter((s: any) => s.votering_id === v.id),
  }));
}

async function fetchViktigeSaker(): Promise<ViktigSak[]> {
  const sb = supabase as any;
  
  const { data: saker } = await sb
    .from('stortinget_saker')
    .select('id, tittel, kort_tittel, oppsummering, kategori, status, stortinget_votering_for, stortinget_votering_mot, stortinget_votering_avholdende, vedtak_resultat')
    .eq('er_viktig', true)
    .order('updated_at', { ascending: false })
    .limit(10);

  if (!saker?.length) return [];

  const sakIds = saker.map((s: any) => s.id);
  const { data: stemmer } = await sb
    .from('folke_stemmer')
    .select('stemme, user_id, sak_id')
    .in('sak_id', sakIds);

  return saker.map((s: any) => ({
    ...s,
    folke_stemmer: (stemmer || []).filter((st: any) => st.sak_id === s.id),
  }));
}

export function useAktiveVoteringer() {
  return useQuery({
    queryKey: ['aktive-voteringer'],
    queryFn: fetchAktiveVoteringer,
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

export function useViktigeSaker() {
  return useQuery({
    queryKey: ['viktige-saker'],
    queryFn: fetchViktigeSaker,
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useStats() {
  return useQuery({
    queryKey: ['stats'],
    queryFn: async () => {
      const sb = supabase as any;
      const [voteringer, stemmer, aktive] = await Promise.all([
        sb.from('voteringer').select('*', { count: 'exact', head: true }),
        sb.from('folke_stemmer').select('*', { count: 'exact', head: true }),
        sb.from('voteringer').select('*', { count: 'exact', head: true }).eq('status', 'pågående'),
      ]);
      return {
        totalVoteringer: voteringer.count || 0,
        totalStemmer: stemmer.count || 0,
        aktiveVoteringer: aktive.count || 0,
      };
    },
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
