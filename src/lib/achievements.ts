import { GraduationCap, Vote, BarChart3, Flame, Trophy, Target, Share2, Calendar, Sparkles } from 'lucide-react';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: typeof GraduationCap;
  emoji: string;
  xpReward: number;
  requirement: string;
  category: 'onboarding' | 'voting' | 'engagement' | 'special';
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'onboarding_complete',
    name: 'Nybegynner',
    description: 'Fullførte onboarding',
    icon: GraduationCap,
    emoji: '🎓',
    xpReward: 50,
    requirement: 'Fullfør onboarding',
    category: 'onboarding',
  },
  {
    id: 'first_vote',
    name: 'Første stemme',
    description: 'Stemte på din første sak',
    icon: Vote,
    emoji: '🗳️',
    xpReward: 25,
    requirement: 'Stem på 1 sak',
    category: 'voting',
  },
  {
    id: 'ten_votes',
    name: 'Engasjert',
    description: 'Stemte på 10 saker',
    icon: BarChart3,
    emoji: '📊',
    xpReward: 100,
    requirement: 'Stem på 10 saker',
    category: 'voting',
  },
  {
    id: 'streak_3',
    name: 'På strek',
    description: 'Stemte 3 dager på rad',
    icon: Flame,
    emoji: '🔥',
    xpReward: 75,
    requirement: 'Stem 3 dager på rad',
    category: 'engagement',
  },
  {
    id: 'fifty_votes',
    name: 'Superbruker',
    description: 'Stemte på 50 saker',
    icon: Trophy,
    emoji: '🏆',
    xpReward: 250,
    requirement: 'Stem på 50 saker',
    category: 'voting',
  },
  {
    id: 'category_expert',
    name: 'Kategori-ekspert',
    description: '10 stemmer i én kategori',
    icon: Target,
    emoji: '🎯',
    xpReward: 100,
    requirement: '10 stemmer i én kategori',
    category: 'special',
  },
  {
    id: 'first_share',
    name: 'Deler',
    description: 'Delte en sak med andre',
    icon: Share2,
    emoji: '📤',
    xpReward: 25,
    requirement: 'Del en sak',
    category: 'engagement',
  },
  {
    id: 'week_streak',
    name: 'Ukentlig engasjert',
    description: 'Stemte 7 dager på rad',
    icon: Calendar,
    emoji: '📅',
    xpReward: 150,
    requirement: 'Stem 7 dager på rad',
    category: 'engagement',
  },
  {
    id: 'hundred_votes',
    name: 'Demokrat',
    description: 'Stemte på 100 saker',
    icon: Sparkles,
    emoji: '⭐',
    xpReward: 500,
    requirement: 'Stem på 100 saker',
    category: 'voting',
  },
];

export const getAchievementById = (id: string): Achievement | undefined => {
  return ACHIEVEMENTS.find(a => a.id === id);
};

export interface UserLevel {
  level: number;
  name: string;
  minXp: number;
  maxXp: number;
}

export const LEVELS: UserLevel[] = [
  { level: 1, name: 'Nybegynner', minXp: 0, maxXp: 100 },
  { level: 2, name: 'Engasjert', minXp: 100, maxXp: 300 },
  { level: 3, name: 'Aktiv', minXp: 300, maxXp: 600 },
  { level: 4, name: 'Erfaren', minXp: 600, maxXp: 1000 },
  { level: 5, name: 'Ekspert', minXp: 1000, maxXp: 1500 },
  { level: 6, name: 'Politiker', minXp: 1500, maxXp: 2500 },
  { level: 7, name: 'Statsminister', minXp: 2500, maxXp: Infinity },
];

export const getLevelForXp = (xp: number): UserLevel => {
  return LEVELS.find(l => xp >= l.minXp && xp < l.maxXp) || LEVELS[LEVELS.length - 1];
};

export const getProgressToNextLevel = (xp: number): number => {
  const level = getLevelForXp(xp);
  if (level.maxXp === Infinity) return 100;
  const progressInLevel = xp - level.minXp;
  const levelRange = level.maxXp - level.minXp;
  return Math.round((progressInLevel / levelRange) * 100);
};
