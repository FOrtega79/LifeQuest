import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { Quest, Transaction, UserStats } from '../types';
import { calculatePenalty, calculateRequiredXp, calculateReward } from '../lib/gameLogic';
import { vibrate } from '../lib/utils';
import { sfx } from '../lib/audio';
import { db, auth } from '../lib/firebase';
import { setHapticsGlobal } from '../lib/utils';
import { doc, onSnapshot, setDoc, updateDoc, deleteDoc, collection, query, writeBatch, runTransaction } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useToast } from './ToastContext';
import { isSameDay, isYesterday, addDays, startOfDay } from 'date-fns';

interface GameState {
  stats: UserStats;
  quests: Quest[];
  transactions: Transaction[];
  addQuest: (quest: Omit<Quest, 'id' | 'createdAt' | 'status'>) => void;
  completeQuest: (id: string) => Promise<{ coins: number; xp: number; leveledUp: boolean; crateDropped?: boolean } | null>;
  failQuest: (id: string) => Promise<void>;
  completeSubtask: (questId: string, subtaskId: string) => Promise<void>;
  snoozeQuest: (id: string, reason: string, additionalHours: number) => void;
  cancelQuest: (id: string) => Promise<void>;
  toggleRecurrence: (id: string) => Promise<void>;
  redeemCoins: (amount: number, concept: string) => Promise<boolean>;
  loading: boolean;
  canClaimDailyLogin: boolean;
  claimDailyLoginReward: () => Promise<{ coins: number; streak: number } | null>;
  toggleSound: () => Promise<void>;
  toggleHaptics: () => Promise<void>;
  updateTheme: (theme: string) => Promise<void>;
  updateAvatar: (avatarId: string) => Promise<void>;
  purchaseCosmetic: (type: 'theme' | 'avatar', id: string, cost: number) => Promise<boolean>;
  openCrate: () => Promise<{ type: 'coins' | 'xp_multiplier' | 'theme' | 'avatar', value: string | number, amount?: number, message: string } | null>;
  allocateStatPoint: (skill: keyof UserStats['skills']) => Promise<boolean>;
  upgradeToPro: () => Promise<boolean>;
}

const defaultStats: UserStats = {
  level: 1,
  xp: 0,
  balance: 0,
  multiplier: 1.05,
  completedQuests: 0,
  failedQuests: 0,
  streak: 0,
  soundEnabled: true,
  theme: 'cyberpunk',
  crates: 0,
  unlockedThemes: ['cyberpunk', 'forest', 'minimalist'], // default themes
  unlockedAvatars: ['default'],
  avatar: 'default',
};

const GameContext = createContext<GameState | undefined>(undefined);

export function GameProvider({ children }: { children: ReactNode }) {
  const [user, authLoading] = useAuthState(auth);
  const [stats, setStats] = useState<UserStats>(defaultStats);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [statsLoaded, setStatsLoaded] = useState(false);
  const [questsLoaded, setQuestsLoaded] = useState(false);
  const [transactionsLoaded, setTransactionsLoaded] = useState(false);
  const { showToast } = useToast();
  const notifiedQuests = useRef<Set<string>>(new Set());

  // Listen to Firestore
  useEffect(() => {
    if (!user) {
      setIsLoaded(true);
      return;
    }
    
    setIsLoaded(false);
    setStatsLoaded(false);
    setQuestsLoaded(false);
    setTransactionsLoaded(false);

    const unsubStats = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const resolvedStats: UserStats = {
          ...data,
          level: data.level ?? 1,
          xp: data.xp ?? 0,
          balance: data.balance ?? data.totalCoins ?? 0,
          multiplier: data.multiplier ?? 1.05,
          completedQuests: data.completedQuests ?? 0,
          failedQuests: data.failedQuests ?? 0,
          streak: data.streak ?? 0,
          lastActiveDate: data.lastActiveDate,
          lastLoginClaim: data.lastLoginClaim,
          soundEnabled: data.soundEnabled ?? true,
          theme: data.theme ?? 'cyberpunk',
          unlockedThemes: data.unlockedThemes ?? ['cyberpunk', 'forest', 'minimalist'],
          unlockedAvatars: data.unlockedAvatars ?? ['default'],
          avatar: data.avatar ?? 'default',
          isPro: data.isPro ?? false,
        };
        setStats(resolvedStats);
        sfx.setEnabled(resolvedStats.soundEnabled);
      } else {
        // Safe creation: Only initialize with default stats if document doesn't exist
        setDoc(doc(db, 'users', user.uid), {
          ...defaultStats,
          isPro: false
        });
      }
      setStatsLoaded(true);
    });

    const unsubQuests = onSnapshot(collection(db, 'users', user.uid, 'quests'), (snapshot) => {
      const q: Quest[] = [];
      snapshot.forEach(d => q.push(d.data() as Quest));
      setQuests(q);
      setQuestsLoaded(true);
    });

    const unsubTrans = onSnapshot(collection(db, 'users', user.uid, 'transactions'), (snapshot) => {
      const t: Transaction[] = [];
      snapshot.forEach(d => d.data() && t.push(d.data() as Transaction));
      setTransactions(t.sort((a, b) => b.date - a.date)); // Sort latest first
      setTransactionsLoaded(true);
    });

    if (typeof window !== 'undefined' && 'Notification' in window && window.Notification && window.Notification.permission === 'default') {
      window.Notification.requestPermission();
    }

    return () => {
      unsubStats();
      unsubQuests();
      unsubTrans();
    };
  }, [user]);

  // Consolidate isLoaded state only when all subcollections are fully initialized
  useEffect(() => {
    if (!user) {
      setIsLoaded(true);
    } else if (statsLoaded && questsLoaded && transactionsLoaded) {
      setIsLoaded(true);
    } else {
      setIsLoaded(false);
    }
  }, [user, statsLoaded, questsLoaded, transactionsLoaded]);

  // Self-Healing & Synchronization routine
  useEffect(() => {
    if (!user || !isLoaded) return;
    
    // Calculate the ground-truth from subcollections
    const completedFromQuests = quests.filter(q => q.status === 'completed');
    const failedFromQuests = quests.filter(q => q.status === 'failed');
    
    // ground truth balance is the sum of all transactions ledger entries
    const computedBalance = Number(transactions.reduce((acc, tx) => acc + tx.amount, 0).toFixed(2));
    
    // ground truth level and XP
    let totalXp = completedFromQuests.reduce((acc, q) => acc + (q.reward?.xp || 0), 0);
    let computedLevel = 1;
    let requiredXp = calculateRequiredXp(computedLevel);
    
    while (totalXp >= requiredXp) {
      totalXp -= requiredXp;
      computedLevel++;
      requiredXp = calculateRequiredXp(computedLevel);
    }
    
    const hasClaimedToday = stats.lastLoginClaim && isSameDay(stats.lastLoginClaim, Date.now());
    const hasStreakBonus = (stats.streakBonusExpiry || 0) > Date.now();
    const expectedMultiplier = Number((1 + (computedLevel * 0.05) + (hasClaimedToday ? 0.15 : 0) + (hasStreakBonus ? 0.50 : 0)).toFixed(2));

    // Determine if any database field is out of sync
    const needsBalanceHealing = stats.balance !== computedBalance;
    const needsCompletedCountHealing = stats.completedQuests !== completedFromQuests.length;
    const needsFailedCountHealing = stats.failedQuests !== failedFromQuests.length;
    const needsLevelHealing = stats.level !== computedLevel || stats.xp !== totalXp;
    const needsMultiplierHealing = stats.multiplier !== expectedMultiplier;

    if (needsBalanceHealing || needsCompletedCountHealing || needsFailedCountHealing || needsLevelHealing || needsMultiplierHealing) {
      const healedStats: Partial<UserStats> = {
        balance: computedBalance,
        completedQuests: completedFromQuests.length,
        failedQuests: failedFromQuests.length,
        level: computedLevel,
        xp: totalXp,
        multiplier: expectedMultiplier
      };
      
      console.log("Self-healing: Re-synchronizing stats to match real ledger activity:", healedStats);
      updateDoc(doc(db, 'users', user.uid), healedStats).catch(console.error);
    }
  }, [user, isLoaded, quests, transactions, stats]);

  // Fail background interval checker
  useEffect(() => {
    if (!isLoaded || !user) return;
    
    const interval = setInterval(() => {
      const now = Date.now();
      
      quests.forEach(q => {
        if (q.status === 'active') {
          if (q.deadline < now) {
            // Time expired! Fail state
            failQuest(q.id);
          } else if (q.deadline - now <= 5 * 60 * 1000) {
            // 5 minutes remaining
            if (!notifiedQuests.current.has(q.id)) {
              notifiedQuests.current.add(q.id);
              if (typeof window !== 'undefined' && 'Notification' in window && window.Notification && window.Notification.permission === 'granted') {
                new window.Notification('Mission Time Running Out!', {
                  body: `Less than 5 minutes remaining for: ${q.title}`,
                  icon: '/icon.png'
                });
              }
            }
          }
        }
      });
    }, 10000); // Check every 10s

    return () => clearInterval(interval);
  }, [quests, isLoaded, user]);

  const upgradeToPro = async (): Promise<boolean> => {
    if (!user) return false;
    try {
      await updateDoc(doc(db, 'users', user.uid), { isPro: true });
      return true;
    } catch (e) {
      console.error('Failed to upgrade:', e);
      return false;
    }
  };

  const allocateStatPoint = async (skill: keyof UserStats['skills']): Promise<boolean> => {
    if (!user) return false;
    try {
      const success = await runTransaction(db, async (transaction) => {
        const statsRef = doc(db, 'users', user.uid);
        const statsSnap = await transaction.get(statsRef);
        const currentStats = statsSnap.exists() ? (statsSnap.data() as UserStats) : defaultStats;

        if ((currentStats.statPoints || 0) <= 0) {
          return false;
        }

        const currentSkillValue = currentStats.skills?.[skill] || 0;
        
        transaction.update(statsRef, {
          statPoints: (currentStats.statPoints || 0) - 1,
          [`skills.${skill}`]: currentSkillValue + 1
        });

        return true;
      });
      if (success) vibrate([50]);
      return success;
    } catch (err) {
      console.error("Failed to allocate stat point", err);
      return false;
    }
  };

  const toggleSound = async () => {
    if (!user) return;
    const newValue = !(stats.soundEnabled ?? true);
    await updateDoc(doc(db, 'users', user.uid), { soundEnabled: newValue });
  };

  const toggleHaptics = async () => {
    if (!user) return;
    const newValue = !(stats.hapticsEnabled ?? true);
    await updateDoc(doc(db, 'users', user.uid), { hapticsEnabled: newValue });
    setHapticsGlobal(newValue);
  };

  const updateTheme = async (theme: string) => {
    if (!user) return;
    await updateDoc(doc(db, 'users', user.uid), { theme });
  };

  const updateAvatar = async (avatarId: string) => {
    if (!user) return;
    await updateDoc(doc(db, 'users', user.uid), { avatar: avatarId });
  };

  const purchaseCosmetic = async (type: 'theme' | 'avatar', id: string, cost: number): Promise<boolean> => {
    if (!user) return false;
    try {
      const success = await runTransaction(db, async (transaction) => {
        const statsRef = doc(db, 'users', user.uid);
        const statsSnap = await transaction.get(statsRef);
        const currentStats = statsSnap.exists() ? (statsSnap.data() as UserStats) : defaultStats;
        
        const balance = currentStats.balance ?? 0;
        if (cost > balance) {
          return false;
        }

        const updateData: any = {
          balance: Number((balance - cost).toFixed(2)),
        };

        if (type === 'theme') {
          const unlockedThemes = currentStats.unlockedThemes || ['cyberpunk', 'forest', 'minimalist'];
          if (unlockedThemes.includes(id)) return false; // Already unlocked
          updateData.unlockedThemes = [...unlockedThemes, id];
        } else if (type === 'avatar') {
          const unlockedAvatars = currentStats.unlockedAvatars || ['default'];
          if (unlockedAvatars.includes(id)) return false; // Already unlocked
          updateData.unlockedAvatars = [...unlockedAvatars, id];
        }

        transaction.update(statsRef, updateData);

        const txId = Math.random().toString(36).substring(2, 9);
        const txRef = doc(db, 'users', user.uid, 'transactions', txId);
        transaction.set(txRef, {
          id: txId,
          amount: -cost,
          concept: `Cosmético Desbloqueado: ${id}`,
          date: Date.now(),
          type: 'spend',
        });

        return true;
      });

      if (success) {
        vibrate(100);
        sfx.playPurchase();
      }
      return success;
    } catch (err) {
      console.error("Transaction failed in purchaseCosmetic:", err);
      return false;
    }
  };

  
  const openCrate = async () => {
    if (!user) return null;
    try {
      const result = await runTransaction(db, async (transaction) => {
        const statsRef = doc(db, 'users', user.uid);
        const statsSnap = await transaction.get(statsRef);
        const currentStats = statsSnap.exists() ? (statsSnap.data() as UserStats) : defaultStats;
        
        if (!currentStats.crates || currentStats.crates <= 0) {
          return null;
        }

        const nextStats = { ...currentStats, crates: currentStats.crates - 1 };
        
        const rand = Math.random();
        let dropType: 'coins' | 'xp_multiplier' | 'theme' | 'avatar' = 'coins';
        let value: string | number = 0;
        let message = '';
        
        if (rand < 0.25) {
          dropType = 'xp_multiplier';
          value = 2.0;
          nextStats.streakBonusExpiry = Date.now() + 24 * 60 * 60 * 1000;
          message = '2.0x XP Multiplier (24h)';
        } else if (rand < 0.6) {
          dropType = 'coins';
          value = Math.floor(Math.random() * 50) + 50;
          nextStats.balance = Number(((nextStats.balance || 0) + (value as number)).toFixed(2));
          message = `+${value} LQ Credits`;
        } else if (rand < 0.8) {
          dropType = 'theme';
          const possibleThemes = ['synthwave', 'hacker', 'royal', 'cosmic'].filter(t => !(currentStats.unlockedThemes || []).includes(t));
          if (possibleThemes.length > 0) {
            value = possibleThemes[Math.floor(Math.random() * possibleThemes.length)];
            nextStats.unlockedThemes = [...(currentStats.unlockedThemes || []), value as string];
            message = `Unlocked Theme: ${value}`;
          } else {
            dropType = 'coins';
            value = 100;
            nextStats.balance = Number(((nextStats.balance || 0) + 100).toFixed(2));
            message = `+100 LQ Credits (Duplicate Theme)`;
          }
        } else {
          dropType = 'avatar';
          const possibleAvatars = ['star', 'shield', 'crown', 'award'].filter(a => !(currentStats.unlockedAvatars || []).includes(a));
          if (possibleAvatars.length > 0) {
            value = possibleAvatars[Math.floor(Math.random() * possibleAvatars.length)];
            nextStats.unlockedAvatars = [...(currentStats.unlockedAvatars || []), value as string];
            message = `Unlocked Avatar: ${value}`;
          } else {
            dropType = 'coins';
            value = 100;
            nextStats.balance = Number(((nextStats.balance || 0) + 100).toFixed(2));
            message = `+100 LQ Credits (Duplicate Avatar)`;
          }
        }
        
        transaction.set(statsRef, nextStats, { merge: true });
        
        if (dropType === 'coins') {
          const txId = Math.random().toString(36).substring(2, 9);
          transaction.set(doc(db, 'users', user.uid, 'transactions', txId), {
            id: txId,
            amount: value,
            concept: 'Data Cache Opened',
            date: Date.now(),
            type: 'earn',
          });
        }
        
        return { type: dropType, value, message };
      });
      if (result) {
        sfx.playSuccess();
        vibrate([100, 50, 100]);
      }
      return result;
    } catch (err) {
      console.error("Failed to open crate:", err);
      return null;
    }
  };

  const addQuest = async (questData: Omit<Quest, 'id' | 'createdAt' | 'status'>) => {
    if (!user) return;
    const newQuest: Quest = {
      ...questData,
      id: Math.random().toString(36).substring(2, 9),
      createdAt: Date.now(),
      status: 'active',
    };
    const cleanQuest = Object.fromEntries(Object.entries(newQuest).filter(([_, v]) => v !== undefined));
    await setDoc(doc(db, 'users', user.uid, 'quests', newQuest.id), cleanQuest);
    vibrate([20, 50, 20]);
  };

  const completeQuest = async (id: string): Promise<{ coins: number; xp: number; leveledUp: boolean; crateDropped?: boolean } | null> => {
    if (!user) return null;
    const quest = quests.find(q => q.id === id);
    if (!quest || quest.status !== 'active') return null;

    try {
      const result = await runTransaction(db, async (transaction) => {
        const statsRef = doc(db, 'users', user.uid);
        const statsSnap = await transaction.get(statsRef);
        
        // Resolve current stats with backward compatibility
        const rawStats = statsSnap.exists() ? statsSnap.data() : null;
        const currentStats: UserStats = {
          level: rawStats?.level ?? 1,
          xp: rawStats?.xp ?? 0,
          balance: rawStats?.balance ?? rawStats?.totalCoins ?? 0,
          multiplier: rawStats?.multiplier ?? 1.05,
          completedQuests: rawStats?.completedQuests ?? 0,
          failedQuests: rawStats?.failedQuests ?? 0,
          streak: rawStats?.streak ?? 0,
          dailyQuestStreak: rawStats?.dailyQuestStreak ?? 0,
          streakBonusExpiry: rawStats?.streakBonusExpiry ?? 0,
          lastActiveDate: rawStats?.lastActiveDate,
          lastLoginClaim: rawStats?.lastLoginClaim,
          statPoints: rawStats?.statPoints ?? 0,
          skills: rawStats?.skills ?? { strength: 0, intelligence: 0, finance: 0, charisma: 0, resolve: 0 },
          skillXp: rawStats?.skillXp ?? { strength: 0, intelligence: 0, finance: 0, charisma: 0, resolve: 0 },
        };

        // Verify the quest is still active in Firestore to prevent double completion
        const questRef = doc(db, 'users', user.uid, 'quests', id);
        const questSnap = await transaction.get(questRef);
        if (!questSnap.exists()) {
          throw new Error("Quest does not exist");
        }
        const currentQuest = questSnap.data() as Quest;
        if (currentQuest.status !== 'active') {
          return null;
        }

        let newStreak = currentStats.streak || 0;
        const now = Date.now();
        if (currentStats.lastActiveDate) {
          if (isYesterday(currentStats.lastActiveDate)) {
            newStreak++;
          } else if (!isSameDay(currentStats.lastActiveDate, now)) {
            newStreak = 1;
          }
        } else {
          newStreak = 1;
        }

        let newDailyQuestStreak = currentStats.dailyQuestStreak || 0;
        let newStreakBonusExpiry = currentStats.streakBonusExpiry || 0;
        let bonusActivated = false;

        if (currentQuest.recurrence === 'daily') {
          newDailyQuestStreak++;
          if (newDailyQuestStreak >= 5) {
            newStreakBonusExpiry = now + 24 * 60 * 60 * 1000;
            newDailyQuestStreak = 0;
            bonusActivated = true;
          }
        }

        const hasClaimedToday = currentStats.lastLoginClaim && isSameDay(currentStats.lastLoginClaim, now);
        const hasStreakBonus = newStreakBonusExpiry > now;
        const activeMultiplier = Number((1 + (currentStats.level * 0.05) + (hasClaimedToday ? 0.15 : 0) + (hasStreakBonus ? 0.50 : 0)).toFixed(2));
        const { coins: baseCoins, xp } = calculateReward(currentQuest.difficulty, currentStats.level, newStreak, activeMultiplier);
        
        let coins = baseCoins;
        if (currentQuest.isRushMode) {
          coins = Number((coins * 1.5).toFixed(2));
        }

        // Update quest
        transaction.update(questRef, {
          status: 'completed',
          reward: { coins, xp }
        });

        if (currentQuest.recurrence && currentQuest.recurrence !== 'none') {
          let newDeadline = Date.now() + 24 * 60 * 60 * 1000;
          
          if (currentQuest.recurrence === 'weekly') {
            if (currentQuest.recurringDays && currentQuest.recurringDays.length > 0) {
              const today = new Date().getDay();
              const sortedDays = [...currentQuest.recurringDays].sort((a, b) => a - b);
              let nextDay = sortedDays.find(d => d > today);
              let daysToAdd = 0;
              if (nextDay !== undefined) {
                daysToAdd = nextDay - today;
              } else {
                daysToAdd = (7 - today) + sortedDays[0];
              }
              newDeadline = addDays(startOfDay(new Date()), daysToAdd).getTime() + 23 * 60 * 60 * 1000 + 59 * 60 * 1000;
            } else {
              newDeadline = Date.now() + 7 * 24 * 60 * 60 * 1000;
            }
          }

          const newId = Math.random().toString(36).substring(2, 9);
          const resetSubtasks = currentQuest.subtasks?.map(st => ({...st, completed: false}));
          
          const newQuestData = {
            ...currentQuest,
            id: newId,
            createdAt: Date.now(),
            deadline: newDeadline,
            status: 'active',
            reward: null,
            subtasks: resetSubtasks || null
          };
          const cleanNewQuestData = Object.fromEntries(Object.entries(newQuestData).filter(([_, v]) => v !== undefined));
          
          transaction.set(doc(db, 'users', user.uid, 'quests', newId), cleanNewQuestData);
        }

        // Add transaction
        const txId = Math.random().toString(36).substring(2, 9);
        transaction.set(doc(db, 'users', user.uid, 'transactions', txId), {
          id: txId,
          amount: coins,
          concept: `Recompensa: ${currentQuest.title}`,
          date: Date.now(),
          type: 'earn',
          xp: xp,
        });

        // Stats
        let newXp = currentStats.xp + xp;
        let newLevel = currentStats.level;
        let leveledUp = false;
        let newStatPoints = currentStats.statPoints || 0;
        
        let requiredXp = calculateRequiredXp(newLevel);
        while (newXp >= requiredXp) {
          newLevel++;
          newXp -= requiredXp;
          leveledUp = true;
          newStatPoints += 3; // +3 stat points per level
          requiredXp = calculateRequiredXp(newLevel);
        }

        let skillPointsGained = currentQuest.difficulty === 'Fácil' ? 5 : currentQuest.difficulty === 'Medio' ? 10 : 20;
        let targetSkill: keyof UserStats['skills'] | null = null;
        if (currentQuest.tag === 'Fitness') targetSkill = 'strength';
        if (currentQuest.tag === 'Learning') targetSkill = 'intelligence';
        if (currentQuest.tag === 'Finance') targetSkill = 'finance';
        if (currentQuest.tag === 'Social') targetSkill = 'charisma';
        if (currentQuest.tag === 'Life' || currentQuest.tag === 'Work') targetSkill = 'resolve';

        let newSkillXp = { ...(currentStats.skillXp || { strength: 0, intelligence: 0, finance: 0, charisma: 0, resolve: 0 }) };
        if (targetSkill) {
          newSkillXp[targetSkill] += skillPointsGained;
        }

        const hasClaimedTodayNext = currentStats.lastLoginClaim && isSameDay(currentStats.lastLoginClaim, now);
        const nextHasStreakBonus = newStreakBonusExpiry > now;
        
        let crateDropped = false;
        let newCratesCount = currentStats.crates || 0;
        if (currentQuest.difficulty === 'Difícil' && Math.random() < 0.3) {
          crateDropped = true;
          newCratesCount += 1;
        }

const nextStats: UserStats = {
          level: newLevel,
          xp: newXp,
          balance: Number((currentStats.balance + coins).toFixed(2)),
          completedQuests: (currentStats.completedQuests || 0) + 1,
          failedQuests: currentStats.failedQuests || 0,
          multiplier: Number((1 + (newLevel * 0.05) + (hasClaimedTodayNext ? 0.15 : 0) + (nextHasStreakBonus ? 0.50 : 0)).toFixed(2)),
          streak: newStreak,
          dailyQuestStreak: newDailyQuestStreak,
          streakBonusExpiry: newStreakBonusExpiry,
          lastActiveDate: now,
          lastLoginClaim: currentStats.lastLoginClaim,
          crates: newCratesCount,
          statPoints: newStatPoints,
          skillXp: newSkillXp,
        };

        transaction.set(statsRef, nextStats, { merge: true });

        return { coins, xp, leveledUp, newLevel, newCompleted: nextStats.completedQuests, bonusActivated, crateDropped };
      });

      if (!result) return null;

      if (result.bonusActivated) {
        showToast({
          title: 'Daily Master!',
          message: 'Completed 5 daily quests! +0.50x XP Multiplier for 24h',
          type: 'daily_reward'
        });
      }

      // Check achievements
      if (result.leveledUp) {
        setTimeout(() => {
          sfx.playLevelUp();
          showToast({
            title: `Level ${result.newLevel} Reached`,
            message: 'Multiplier upgraded to ' + (1 + (result.newLevel * 0.05)).toFixed(2) + 'x (+3 Stat Pts)',
            type: 'level_up'
          });
        }, 500); // Wait for lootbox
      } else {
        sfx.playSuccess();
      }
      
      const newCompleted = result.newCompleted;
      if (newCompleted === 10 || newCompleted === 50 || newCompleted === 100) {
        setTimeout(() => {
          showToast({
            title: `${newCompleted} Missions`,
            message: 'Milestone reached for completed missions',
            type: 'milestone'
          });
        }, 1000);
      }
      
      vibrate([50, 100, 50, 100, 50]);
      return { coins: result.coins, xp: result.xp, leveledUp: result.leveledUp, crateDropped: result.crateDropped };

    } catch (err) {
      console.error("Transaction failed in completeQuest:", err);
      return null;
    }
  };

  const failQuest = async (id: string): Promise<void> => {
    if (!user) return;
    const quest = quests.find(q => q.id === id);
    if (!quest || quest.status !== 'active') return;

    try {
      await runTransaction(db, async (transaction) => {
        const statsRef = doc(db, 'users', user.uid);
        const statsSnap = await transaction.get(statsRef);
        
        // Resolve current stats with backward compatibility
        const rawStats = statsSnap.exists() ? statsSnap.data() : null;
        const currentStats: UserStats = {
          level: rawStats?.level ?? 1,
          xp: rawStats?.xp ?? 0,
          balance: rawStats?.balance ?? rawStats?.totalCoins ?? 0,
          multiplier: rawStats?.multiplier ?? 1.05,
          completedQuests: rawStats?.completedQuests ?? 0,
          failedQuests: rawStats?.failedQuests ?? 0,
          streak: rawStats?.streak ?? 0,
          dailyQuestStreak: rawStats?.dailyQuestStreak ?? 0,
          streakBonusExpiry: rawStats?.streakBonusExpiry ?? 0,
          lastActiveDate: rawStats?.lastActiveDate,
          lastLoginClaim: rawStats?.lastLoginClaim,
          statPoints: rawStats?.statPoints ?? 0,
          skills: rawStats?.skills ?? { strength: 0, intelligence: 0, finance: 0, charisma: 0, resolve: 0 },
          skillXp: rawStats?.skillXp ?? { strength: 0, intelligence: 0, finance: 0, charisma: 0, resolve: 0 },
        };

        // Verify the quest is still active in Firestore to prevent duplicate failure
        const questRef = doc(db, 'users', user.uid, 'quests', id);
        const questSnap = await transaction.get(questRef);
        if (!questSnap.exists()) return;
        const currentQuest = questSnap.data() as Quest;
        if (currentQuest.status !== 'active') return;

        let penaltyAmount = calculatePenalty(currentQuest.difficulty);
        if (currentQuest.isRushMode) {
          penaltyAmount = Number((penaltyAmount * 2).toFixed(2));
        }

        // Update quest
        transaction.update(questRef, {
          status: 'failed'
        });

        if (currentQuest.recurrence && currentQuest.recurrence !== 'none') {
          let newDeadline = Date.now() + 24 * 60 * 60 * 1000;
          
          if (currentQuest.recurrence === 'weekly') {
            if (currentQuest.recurringDays && currentQuest.recurringDays.length > 0) {
              const today = new Date().getDay();
              const sortedDays = [...currentQuest.recurringDays].sort((a, b) => a - b);
              let nextDay = sortedDays.find(d => d > today);
              let daysToAdd = 0;
              if (nextDay !== undefined) {
                daysToAdd = nextDay - today;
              } else {
                daysToAdd = (7 - today) + sortedDays[0];
              }
              newDeadline = addDays(startOfDay(new Date()), daysToAdd).getTime() + 23 * 60 * 60 * 1000 + 59 * 60 * 1000;
            } else {
              newDeadline = Date.now() + 7 * 24 * 60 * 60 * 1000;
            }
          }

          const newId = Math.random().toString(36).substring(2, 9);
          const resetSubtasks = currentQuest.subtasks?.map(st => ({...st, completed: false}));
          
          const newQuestData = {
            ...currentQuest,
            id: newId,
            createdAt: Date.now(),
            deadline: newDeadline,
            status: 'active',
            reward: null,
            subtasks: resetSubtasks || null
          };
          const cleanNewQuestData = Object.fromEntries(Object.entries(newQuestData).filter(([_, v]) => v !== undefined));
          
          transaction.set(doc(db, 'users', user.uid, 'quests', newId), cleanNewQuestData);
        }

        // Add transaction
        const txId = Math.random().toString(36).substring(2, 9);
        transaction.set(doc(db, 'users', user.uid, 'transactions', txId), {
          id: txId,
          amount: -penaltyAmount,
          concept: `Penalización por fallo: ${currentQuest.title}`,
          date: Date.now(),
          type: 'penalty',
        });

        const hasClaimedToday = currentStats.lastLoginClaim && isSameDay(currentStats.lastLoginClaim, Date.now());
        
        const now = Date.now();
        let newDailyQuestStreak = currentStats.dailyQuestStreak || 0;
        if (currentQuest.recurrence === 'daily') {
          newDailyQuestStreak = 0;
        }
        
        const hasStreakBonus = (currentStats.streakBonusExpiry || 0) > now;
        
        
        let crateDropped = false;
        let newCratesCount = currentStats.crates || 0;
        if (currentQuest.difficulty === 'Difícil' && Math.random() < 0.3) {
          crateDropped = true;
          newCratesCount += 1;
        }

const nextStats: UserStats = {
          level: currentStats.level || 1,
          xp: currentStats.xp || 0,
          balance: Math.max(0, Number((currentStats.balance - penaltyAmount).toFixed(2))),
          completedQuests: currentStats.completedQuests || 0,
          failedQuests: (currentStats.failedQuests || 0) + 1,
          multiplier: Number((1 + ((currentStats.level || 1) * 0.05) + (hasClaimedToday ? 0.15 : 0) + (hasStreakBonus ? 0.50 : 0)).toFixed(2)),
          streak: currentStats.streak || 0,
          dailyQuestStreak: newDailyQuestStreak,
          streakBonusExpiry: currentStats.streakBonusExpiry || 0,
          lastActiveDate: currentStats.lastActiveDate || 0,
          lastLoginClaim: currentStats.lastLoginClaim,
          crates: newCratesCount,
        };

        transaction.set(statsRef, nextStats, { merge: true });
      });

      sfx.playFailure();
      vibrate([200, 100, 200]);
    } catch (err) {
      console.error("Transaction failed in failQuest:", err);
    }
  };

  const completeSubtask = async (questId: string, subtaskId: string): Promise<void> => {
    if (!user) return;
    const quest = quests.find(q => q.id === questId);
    if (!quest || quest.status !== 'active' || !quest.subtasks) return;

    const subtask = quest.subtasks.find(st => st.id === subtaskId);
    if (!subtask || subtask.completed) return; // already completed

    try {
      await runTransaction(db, async (transaction) => {
        const questRef = doc(db, 'users', user.uid, 'quests', questId);
        const questSnap = await transaction.get(questRef);
        if (!questSnap.exists()) return;
        
        const currentQuest = questSnap.data() as Quest;
        if (!currentQuest.subtasks) return;
        
        const stIndex = currentQuest.subtasks.findIndex(st => st.id === subtaskId);
        if (stIndex === -1 || currentQuest.subtasks[stIndex].completed) return;
        
        currentQuest.subtasks[stIndex].completed = true;
        
        // Grant incremental XP and coins
        const incrementalXp = 5;
        const incrementalCoins = 1.0;
        
        const statsRef = doc(db, 'users', user.uid);
        const statsSnap = await transaction.get(statsRef);
        const rawStats = statsSnap.exists() ? statsSnap.data() : null;
        
        let newXp = (rawStats?.xp ?? 0) + incrementalXp;
        let newLevel = rawStats?.level ?? 1;
        
        let requiredXp = calculateRequiredXp(newLevel);
        while (newXp >= requiredXp) {
          newLevel++;
          newXp -= requiredXp;
          requiredXp = calculateRequiredXp(newLevel);
        }
        
        transaction.update(questRef, {
          subtasks: currentQuest.subtasks
        });
        
        transaction.set(statsRef, {
          xp: newXp,
          level: newLevel,
          balance: Number(((rawStats?.balance ?? rawStats?.totalCoins ?? 0) + incrementalCoins).toFixed(2))
        }, { merge: true });
        
        const txId = Math.random().toString(36).substring(2, 9);
        transaction.set(doc(db, 'users', user.uid, 'transactions', txId), {
          id: txId,
          amount: incrementalCoins,
          concept: `Avance en: ${currentQuest.title}`,
          date: Date.now(),
          type: 'earn',
          xp: incrementalXp,
        });
      });
      sfx.playSuccess();
      vibrate([50]);
    } catch (err) {
      console.error("Transaction failed in completeSubtask:", err);
    }
  };

  const snoozeQuest = async (id: string, reason: string, additionalHours: number) => {
    if (!user) return;
    const quest = quests.find(q => q.id === id);
    if (!quest || quest.status !== 'active' || quest.snoozed) return;

    const newDeadline = quest.deadline + additionalHours * 60 * 60 * 1000;
    
    await updateDoc(doc(db, 'users', user.uid, 'quests', id), {
      deadline: newDeadline,
      snoozed: true,
      snoozeReason: reason
    });
  };

  const cancelQuest = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'quests', id));
      vibrate([30]);
    } catch (err) {
      console.error("Failed to cancel quest:", err);
    }
  };

  const toggleRecurrence = async (id: string) => {
    if (!user) return;
    const quest = quests.find(q => q.id === id);
    if (!quest) return;
    const nextRecurrence = quest.recurrence === 'none' ? 'daily' : 'none';
    try {
      await updateDoc(doc(db, 'users', user.uid, 'quests', id), {
        recurrence: nextRecurrence
      });
      vibrate([20]);
    } catch (err) {
      console.error("Failed to toggle recurrence:", err);
    }
  };

  const redeemCoins = async (amount: number, concept: string): Promise<boolean> => {
    if (!user || amount <= 0) return false;

    try {
      const success = await runTransaction(db, async (transaction) => {
        const statsRef = doc(db, 'users', user.uid);
        const statsSnap = await transaction.get(statsRef);
        const currentStats = statsSnap.exists() ? (statsSnap.data() as UserStats) : defaultStats;

        if (amount > currentStats.balance) {
          return false;
        }

        transaction.update(statsRef, {
          balance: Number((currentStats.balance - amount).toFixed(2)),
        });

        const txId = Math.random().toString(36).substring(2, 9);
        const txRef = doc(db, 'users', user.uid, 'transactions', txId);
        transaction.set(txRef, {
          id: txId,
          amount: -amount,
          concept,
          date: Date.now(),
          type: 'spend',
        });

        return true;
      });

      if (success) {
        vibrate(100);
      }
      return success;
    } catch (err) {
      console.error("Transaction failed in redeemCoins:", err);
      return false;
    }
  };

  const canClaimDailyLogin = isLoaded && !!user && (!stats.lastLoginClaim || !isSameDay(stats.lastLoginClaim, Date.now()));

  const claimDailyLoginReward = async (): Promise<{ coins: number; streak: number } | null> => {
    if (!user) return null;

    try {
      const result = await runTransaction(db, async (transaction) => {
        const statsRef = doc(db, 'users', user.uid);
        const statsSnap = await transaction.get(statsRef);

        const rawStats = statsSnap.exists() ? statsSnap.data() : null;
        const currentStats: UserStats = {
          level: rawStats?.level ?? 1,
          xp: rawStats?.xp ?? 0,
          balance: rawStats?.balance ?? rawStats?.totalCoins ?? 0,
          multiplier: rawStats?.multiplier ?? 1.05,
          completedQuests: rawStats?.completedQuests ?? 0,
          failedQuests: rawStats?.failedQuests ?? 0,
          streak: rawStats?.streak ?? 0,
          lastActiveDate: rawStats?.lastActiveDate,
          lastLoginClaim: rawStats?.lastLoginClaim,
          statPoints: rawStats?.statPoints ?? 0,
          skills: rawStats?.skills ?? { strength: 0, intelligence: 0, finance: 0, charisma: 0, resolve: 0 },
          skillXp: rawStats?.skillXp ?? { strength: 0, intelligence: 0, finance: 0, charisma: 0, resolve: 0 },
        };

        const now = Date.now();
        const alreadyClaimed = currentStats.lastLoginClaim && isSameDay(currentStats.lastLoginClaim, now);

        if (alreadyClaimed) {
          return null; // Block double claim
        }

        // Streak check
        let newStreak = currentStats.streak || 0;
        if (currentStats.lastActiveDate) {
          if (isYesterday(currentStats.lastActiveDate)) {
            newStreak = (currentStats.streak || 0) + 1;
          } else if (!isSameDay(currentStats.lastActiveDate, now)) {
            newStreak = 1;
          }
          // If is same day, keep existing streak (already updated by completing a quest today)
        } else {
          newStreak = 1;
        }

        // Calculate reward
        const baseReward = 5.00;
        const streakBonus = Math.min(5.00, Number((newStreak * 0.5).toFixed(2)));
        const totalReward = Number((baseReward + streakBonus).toFixed(2));

        // Add transaction
        const txId = Math.random().toString(36).substring(2, 9);
        const txRef = doc(db, 'users', user.uid, 'transactions', txId);
        transaction.set(txRef, {
          id: txId,
          amount: totalReward,
          concept: `Regalo de Acceso Diario (Racha x${newStreak})`,
          date: now,
          type: 'earn',
        });

        // Boosted multiplier
        const nextMultiplier = Number((1 + (currentStats.level * 0.05) + 0.15).toFixed(2));

        const nextStats: UserStats = {
          ...currentStats,
          balance: Number((currentStats.balance + totalReward).toFixed(2)),
          streak: newStreak,
          lastActiveDate: now,
          lastLoginClaim: now,
          multiplier: nextMultiplier,
        };

        transaction.set(statsRef, nextStats, { merge: true });

        return { coins: totalReward, streak: newStreak };
      });

      if (result) {
        vibrate([50, 150, 50]);
        showToast({
          title: 'Daily Login Reward Claimed!',
          message: `Received +$${result.coins.toFixed(2)} LQ and +0.15x temporary multiplier boost!`,
          type: 'milestone',
        });
      }
      return result;
    } catch (err) {
      console.error("Transaction failed in claimDailyLoginReward:", err);
      return null;
    }
  };

  return (
    <GameContext.Provider value={{ stats, quests, transactions, addQuest, completeQuest, failQuest, snoozeQuest, cancelQuest, toggleRecurrence, redeemCoins, loading: authLoading || (!isLoaded && !!user), canClaimDailyLogin, claimDailyLoginReward, toggleSound, toggleHaptics, updateTheme, updateAvatar, purchaseCosmetic, openCrate, allocateStatPoint, completeSubtask, upgradeToPro }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
