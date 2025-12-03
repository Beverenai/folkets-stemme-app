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
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Ap_444x444.png/220px-Ap_444x444.png',
  },
  'H': {
    navn: 'Høyre',
    forkortelse: 'H',
    farge: '#0065F0',
    tekstFarge: '#FFFFFF',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/H%C3%B8yre_logo.svg/200px-H%C3%B8yre_logo.svg.png',
  },
  'SP': {
    navn: 'Senterpartiet',
    forkortelse: 'Sp',
    farge: '#00843D',
    tekstFarge: '#FFFFFF',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/Senterpartiet_Logo.svg/200px-Senterpartiet_Logo.svg.png',
  },
  'FRP': {
    navn: 'Fremskrittspartiet',
    forkortelse: 'FrP',
    farge: '#024A7C',
    tekstFarge: '#FFFFFF',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/FrP_Logo.svg/200px-FrP_Logo.svg.png',
  },
  'SV': {
    navn: 'Sosialistisk Venstreparti',
    forkortelse: 'SV',
    farge: '#EB0E5C',
    tekstFarge: '#FFFFFF',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ee/SV_logo_2019.svg/200px-SV_logo_2019.svg.png',
  },
  'KRF': {
    navn: 'Kristelig Folkeparti',
    forkortelse: 'KrF',
    farge: '#FFBE00',
    tekstFarge: '#000000',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/79/KrF_logo.svg/200px-KrF_logo.svg.png',
  },
  'V': {
    navn: 'Venstre',
    forkortelse: 'V',
    farge: '#006666',
    tekstFarge: '#FFFFFF',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/63/Venstre_Logo_%282022%29.svg/200px-Venstre_Logo_%282022%29.svg.png',
  },
  'MDG': {
    navn: 'Miljøpartiet De Grønne',
    forkortelse: 'MDG',
    farge: '#6A9325',
    tekstFarge: '#FFFFFF',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/MDG_logo.svg/200px-MDG_logo.svg.png',
  },
  'R': {
    navn: 'Rødt',
    forkortelse: 'R',
    farge: '#DA291C',
    tekstFarge: '#FFFFFF',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/R%C3%B8dt_logo.svg/200px-R%C3%B8dt_logo.svg.png',
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
