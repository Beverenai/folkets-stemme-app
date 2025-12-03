export interface PartiConfig {
  navn: string;
  forkortelse: string;
  farge: string;
  tekstFarge: string;
}

export const PARTI_CONFIG: Record<string, PartiConfig> = {
  'A': {
    navn: 'Arbeiderpartiet',
    forkortelse: 'Ap',
    farge: '#E11926',
    tekstFarge: '#FFFFFF',
  },
  'H': {
    navn: 'Høyre',
    forkortelse: 'H',
    farge: '#0065F0',
    tekstFarge: '#FFFFFF',
  },
  'SP': {
    navn: 'Senterpartiet',
    forkortelse: 'Sp',
    farge: '#00843D',
    tekstFarge: '#FFFFFF',
  },
  'FRP': {
    navn: 'Fremskrittspartiet',
    forkortelse: 'FrP',
    farge: '#024A7C',
    tekstFarge: '#FFFFFF',
  },
  'SV': {
    navn: 'Sosialistisk Venstreparti',
    forkortelse: 'SV',
    farge: '#EB0E5C',
    tekstFarge: '#FFFFFF',
  },
  'KRF': {
    navn: 'Kristelig Folkeparti',
    forkortelse: 'KrF',
    farge: '#FFBE00',
    tekstFarge: '#000000',
  },
  'V': {
    navn: 'Venstre',
    forkortelse: 'V',
    farge: '#006666',
    tekstFarge: '#FFFFFF',
  },
  'MDG': {
    navn: 'Miljøpartiet De Grønne',
    forkortelse: 'MDG',
    farge: '#6A9325',
    tekstFarge: '#FFFFFF',
  },
  'R': {
    navn: 'Rødt',
    forkortelse: 'R',
    farge: '#DA291C',
    tekstFarge: '#FFFFFF',
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
  return PARTI_CONFIG[forkortelse.toUpperCase()] || PARTI_CONFIG['IND'];
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
