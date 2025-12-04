import { Json } from '@/integrations/supabase/types';
import { PartiVote } from './voting';

/**
 * Sak-related types used across the application
 */

/** Person who proposed a sak */
export interface Forslagsstiller {
  navn: string;
  parti: string;
}

/** Base sak (parliamentary case) */
export interface SakBase {
  id: string;
  stortinget_id: string;
  tittel: string;
  kort_tittel: string | null;
  kategori: string | null;
  oppsummering: string | null;
}

/** Full sak with all details */
export interface Sak extends SakBase {
  spoersmaal: string | null;
  beskrivelse: string | null;
  argumenter_for: Json;
  argumenter_mot: Json;
  stortinget_votering_for: number | null;
  stortinget_votering_mot: number | null;
  stortinget_votering_avholdende: number | null;
  komite_navn?: string | null;
  forslagsstiller?: Forslagsstiller[] | null;
  stengt_dato?: string | null;
}

/** Sak with user voting data */
export interface SakWithVotes extends Sak {
  userVote?: string | null;
  voteStats?: { for: number; mot: number; avholdende: number };
}

/** Sak with extended details for detail page */
export interface SakDetalj extends Sak {
  tema: string | null;
  status: string;
  bilde_url: string | null;
  stortinget_vedtak: string | null;
  prosess_steg: number | null;
}

/** Sak for library listing */
export interface SakLibrary extends SakBase {
  behandlet_sesjon: string | null;
  status: string;
  vedtak_resultat: string | null;
  stortinget_votering_for: number | null;
  stortinget_votering_mot: number | null;
  stortinget_votering_avholdende: number | null;
  parti_voteringer?: PartiVote[];
}
