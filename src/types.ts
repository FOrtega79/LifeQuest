export type Difficulty = 'Fácil' | 'Medio' | 'Difícil';
export type Recurrence = 'none' | 'daily' | 'weekly';
export type QuestTag = 'Fitness' | 'Learning' | 'Finance' | 'Social' | 'Life' | 'Work';

export type SkillCategory = 'strength' | 'intelligence' | 'finance' | 'charisma' | 'resolve';

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  recurrence?: Recurrence;
  recurringDays?: number[]; // 0-6 (Sun-Sat) for weekly recurrence
  tag?: QuestTag;
  isRushMode?: boolean;
  deadline: number; // timestamp
  createdAt: number;
  status: 'active' | 'completed' | 'failed';
  snoozed?: boolean;
  snoozeReason?: string;
  subtasks?: Subtask[];
  reward?: {
    coins: number;
    xp: number;
  };
}

export interface Transaction {
  id: string;
  amount: number;
  concept: string;
  date: number;
  type: 'earn' | 'spend' | 'penalty';
  xp?: number;
}

export interface UserStats {
  level: number;
  xp: number;
  balance: number;
  multiplier: number;
  completedQuests: number;
  failedQuests: number;
  streak: number;
  dailyQuestStreak?: number;
  streakBonusExpiry?: number;
  lastActiveDate?: number;
  lastLoginClaim?: number;
  soundEnabled?: boolean;
  hapticsEnabled?: boolean;
  theme?: string;
  crates?: number;
  unlockedThemes?: string[];
  unlockedAvatars?: string[];
  avatar?: string;
  statPoints?: number;
  isPro?: boolean;
  skills?: {
    strength: number;
    intelligence: number;
    finance: number;
    charisma: number;
    resolve: number;
  };
  skillXp?: {
    strength: number;
    intelligence: number;
    finance: number;
    charisma: number;
    resolve: number;
  };
}
