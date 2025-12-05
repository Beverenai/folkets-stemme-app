import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ACHIEVEMENTS, Achievement, getLevelForXp, getProgressToNextLevel, getAchievementById } from '@/lib/achievements';
import { toast } from 'sonner';
import { triggerSuccessConfetti } from '@/lib/confetti';

interface UserAchievement {
  achievement_id: string;
  unlocked_at: string;
}

interface GamificationState {
  achievements: UserAchievement[];
  xpPoints: number;
  totalVotes: number;
  currentStreak: number;
  loading: boolean;
}

const STORAGE_KEY = 'folketinget_gamification';

export function useGamification() {
  const { user } = useAuth();
  const [state, setState] = useState<GamificationState>({
    achievements: [],
    xpPoints: 0,
    totalVotes: 0,
    currentStreak: 0,
    loading: true,
  });

  // Load data from localStorage for non-logged in users
  const loadLocalData = useCallback(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        setState(prev => ({
          ...prev,
          achievements: data.achievements || [],
          xpPoints: data.xpPoints || 0,
          totalVotes: data.totalVotes || 0,
          currentStreak: data.currentStreak || 0,
          loading: false,
        }));
      } catch {
        setState(prev => ({ ...prev, loading: false }));
      }
    } else {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  // Save data to localStorage
  const saveLocalData = useCallback((data: Partial<GamificationState>) => {
    const current = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    const updated = { ...current, ...data };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }, []);

  // Load data from Supabase for logged in users
  const loadUserData = useCallback(async () => {
    if (!user) return;

    try {
      // Get achievements
      const { data: achievements } = await supabase
        .from('user_achievements')
        .select('achievement_id, unlocked_at')
        .eq('user_id', user.id);

      // Get profile data
      const { data: profile } = await supabase
        .from('profiles')
        .select('xp_points, total_votes, current_streak')
        .eq('user_id', user.id)
        .single();

      setState({
        achievements: (achievements || []).map(a => ({
          achievement_id: a.achievement_id,
          unlocked_at: a.unlocked_at,
        })),
        xpPoints: profile?.xp_points || 0,
        totalVotes: profile?.total_votes || 0,
        currentStreak: profile?.current_streak || 0,
        loading: false,
      });
    } catch (error) {
      console.error('Error loading gamification data:', error);
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadUserData();
    } else {
      loadLocalData();
    }
  }, [user, loadUserData, loadLocalData]);

  const unlockAchievement = useCallback(async (achievementId: string) => {
    const achievement = getAchievementById(achievementId);
    if (!achievement) return false;

    // Check if already unlocked
    if (state.achievements.some(a => a.achievement_id === achievementId)) {
      return false;
    }

    const newAchievement: UserAchievement = {
      achievement_id: achievementId,
      unlocked_at: new Date().toISOString(),
    };

    if (user) {
      // Save to database
      const { error } = await supabase
        .from('user_achievements')
        .insert([{
          user_id: user.id,
          achievement_id: achievementId,
        }]);

      if (error) {
        console.error('Error unlocking achievement:', error);
        return false;
      }

      // Update XP
      await supabase
        .from('profiles')
        .update({ xp_points: state.xpPoints + achievement.xpReward })
        .eq('user_id', user.id);
    } else {
      // Save to localStorage
      const newAchievements = [...state.achievements, newAchievement];
      const newXp = state.xpPoints + achievement.xpReward;
      saveLocalData({ achievements: newAchievements, xpPoints: newXp });
    }

    // Update state
    setState(prev => ({
      ...prev,
      achievements: [...prev.achievements, newAchievement],
      xpPoints: prev.xpPoints + achievement.xpReward,
    }));

    // Show celebration
    triggerSuccessConfetti();
    toast.success(
      `${achievement.emoji} ${achievement.name}`,
      { description: achievement.description }
    );

    return true;
  }, [user, state.achievements, state.xpPoints, saveLocalData]);

  const recordVote = useCallback(async () => {
    const newTotalVotes = state.totalVotes + 1;
    const xpGain = 10;
    const newXp = state.xpPoints + xpGain;

    // Calculate streak
    const today = new Date().toISOString().split('T')[0];
    const lastVoteDate = localStorage.getItem('last_vote_date');
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    let newStreak = state.currentStreak;
    if (lastVoteDate === yesterday) {
      newStreak += 1;
    } else if (lastVoteDate !== today) {
      newStreak = 1;
    }
    localStorage.setItem('last_vote_date', today);

    if (user) {
      await supabase
        .from('profiles')
        .update({
          total_votes: newTotalVotes,
          xp_points: newXp,
          current_streak: newStreak,
          last_vote_date: today,
        })
        .eq('user_id', user.id);
    } else {
      saveLocalData({
        totalVotes: newTotalVotes,
        xpPoints: newXp,
        currentStreak: newStreak,
      });
    }

    setState(prev => ({
      ...prev,
      totalVotes: newTotalVotes,
      xpPoints: newXp,
      currentStreak: newStreak,
    }));

    // Check for vote-based achievements
    if (newTotalVotes === 1) {
      await unlockAchievement('first_vote');
    } else if (newTotalVotes === 10) {
      await unlockAchievement('ten_votes');
    } else if (newTotalVotes === 50) {
      await unlockAchievement('fifty_votes');
    } else if (newTotalVotes === 100) {
      await unlockAchievement('hundred_votes');
    }

    // Check streak achievements
    if (newStreak === 3) {
      await unlockAchievement('streak_3');
    } else if (newStreak === 7) {
      await unlockAchievement('week_streak');
    }
  }, [user, state.totalVotes, state.xpPoints, state.currentStreak, saveLocalData, unlockAchievement]);

  const completeOnboarding = useCallback(async (interests: string[], compassResult: Record<string, number>) => {
    if (user) {
      await supabase
        .from('profiles')
        .update({
          onboarding_completed_at: new Date().toISOString(),
          political_interests: interests,
          political_compass: compassResult as unknown as Record<string, never>,
        })
        .eq('user_id', user.id);
    }
    // For non-logged in users, just save interests to localStorage
    localStorage.setItem('political_interests', JSON.stringify(interests));
    localStorage.setItem('political_compass', JSON.stringify(compassResult));

    await unlockAchievement('onboarding_complete');
  }, [user, unlockAchievement]);

  const hasAchievement = useCallback((achievementId: string) => {
    return state.achievements.some(a => a.achievement_id === achievementId);
  }, [state.achievements]);

  const getUnlockedAchievements = useCallback((): Achievement[] => {
    return state.achievements
      .map(ua => getAchievementById(ua.achievement_id))
      .filter((a): a is Achievement => a !== undefined);
  }, [state.achievements]);

  const level = getLevelForXp(state.xpPoints);
  const progressToNextLevel = getProgressToNextLevel(state.xpPoints);

  return {
    ...state,
    level,
    progressToNextLevel,
    unlockAchievement,
    recordVote,
    completeOnboarding,
    hasAchievement,
    getUnlockedAchievements,
    allAchievements: ACHIEVEMENTS,
  };
}
