/**
 * Voting-related types used across the application
 */

/** Party voting statistics for a single votering */
export interface PartiVote {
  parti_forkortelse: string;
  parti_navn: string;
  stemmer_for: number;
  stemmer_mot: number;
  stemmer_avholdende: number;
}

/** Individual representative's vote */
export interface RepresentantVote {
  id: string;
  stemme: string;
  representant: {
    id: string;
    fornavn: string;
    etternavn: string;
    parti_forkortelse: string | null;
    bilde_url: string | null;
  };
}

/** Aggregated vote statistics */
export interface VoteStats {
  for: number;
  mot: number;
  avholdende: number;
  total: number;
}

/** A single votering (vote) record */
export interface Votering {
  id: string;
  stortinget_votering_id: string;
  forslag_tekst: string | null;
  votering_dato: string | null;
  vedtatt: boolean | null;
  resultat_for: number | null;
  resultat_mot: number | null;
  resultat_avholdende: number | null;
}

/** Extended votering with optional fields */
export interface VoteringExtended extends Votering {
  oppsummering?: string | null;
  status?: string;
  sak_id?: string | null;
  stortinget_saker?: {
    tittel: string;
    stortinget_id: string;
    kategori: string | null;
  } | null;
}
