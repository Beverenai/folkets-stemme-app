import apLogo from '@/assets/parti-logos/ap.png';
import hoyreLogo from '@/assets/parti-logos/hoyre.png';
import spLogo from '@/assets/parti-logos/sp.png';
import frpLogo from '@/assets/parti-logos/frp.png';
import svLogo from '@/assets/parti-logos/sv.png';
import krfLogo from '@/assets/parti-logos/krf.png';
import venstreLogo from '@/assets/parti-logos/venstre.png';
import mdgLogo from '@/assets/parti-logos/mdg.png';
import rodtLogo from '@/assets/parti-logos/rodt.png';

export interface PartiConfig {
  navn: string;
  forkortelse: string;
  farge: string;
  tekstFarge: string;
  logo?: string;
}

export const PARTI_CONFIG: Record<string, PartiConfig> = {
  'A': {
    navn: 'Arbeiderpartiet',
    forkortelse: 'Ap',
    farge: '#E11926',
    tekstFarge: '#FFFFFF',
    logo: apLogo,
  },
  'H': {
    navn: 'Høyre',
    forkortelse: 'H',
    farge: '#0065F0',
    tekstFarge: '#FFFFFF',
    logo: hoyreLogo,
  },
  'SP': {
    navn: 'Senterpartiet',
    forkortelse: 'Sp',
    farge: '#00843D',
    tekstFarge: '#FFFFFF',
    logo: spLogo,
  },
  'FRP': {
    navn: 'Fremskrittspartiet',
    forkortelse: 'FrP',
    farge: '#024A7C',
    tekstFarge: '#FFFFFF',
    logo: frpLogo,
  },
  'SV': {
    navn: 'Sosialistisk Venstreparti',
    forkortelse: 'SV',
    farge: '#EB0E5C',
    tekstFarge: '#FFFFFF',
    logo: svLogo,
  },
  'KRF': {
    navn: 'Kristelig Folkeparti',
    forkortelse: 'KrF',
    farge: '#FFBE00',
    tekstFarge: '#000000',
    logo: krfLogo,
  },
  'V': {
    navn: 'Venstre',
    forkortelse: 'V',
    farge: '#006666',
    tekstFarge: '#FFFFFF',
    logo: venstreLogo,
  },
  'MDG': {
    navn: 'Miljøpartiet De Grønne',
    forkortelse: 'MDG',
    farge: '#6A9325',
    tekstFarge: '#FFFFFF',
    logo: mdgLogo,
  },
  'R': {
    navn: 'Rødt',
    forkortelse: 'R',
    farge: '#DA291C',
    tekstFarge: '#FFFFFF',
    logo: rodtLogo,
  },
  'PF': {
    navn: 'Pasientfokus',
    forkortelse: 'PF',
    farge: '#1E90FF',
    tekstFarge: '#FFFFFF',
  },
  'IND': {
    navn: 'Uavhengig',
    forkortelse: 'Ind',
    farge: '#6B7280',
    tekstFarge: '#FFFFFF',
  },
};

export function getPartiConfig(forkortelse: string | null): PartiConfig {
  if (!forkortelse) {
    return PARTI_CONFIG['IND'];
  }
  // Handle both uppercase keys and actual database values
  const upperKey = forkortelse.toUpperCase();
  return PARTI_CONFIG[upperKey] || PARTI_CONFIG['IND'];
}

export function getPartiColor(forkortelse: string | null): string {
  return getPartiConfig(forkortelse).farge;
}

export function getPartiTextColor(forkortelse: string | null): string {
  return getPartiConfig(forkortelse).tekstFarge;
}

export function getPartiNavn(forkortelse: string | null): string {
  return getPartiConfig(forkortelse).navn;
}
