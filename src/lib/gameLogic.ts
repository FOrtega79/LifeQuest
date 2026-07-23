import { Difficulty } from '../types';

export const DIFFICULTY_WEIGHTS: Record<Difficulty, number> = {
  Fácil: 1,
  Medio: 2,
  Difícil: 3,
};

export const XP_PER_DIFFICULTY: Record<Difficulty, number> = {
  Fácil: 25,
  Medio: 50,
  Difícil: 100,
};

export function calculateRequiredXp(level: number): number {
  // Base 100, increases incrementally
  return Math.floor(100 * Math.pow(1.2, level - 1));
}

export function calculateReward(difficulty: Difficulty, level: number, streak: number = 0, multiplier?: number): { coins: number; xp: number } {
  const weight = DIFFICULTY_WEIGHTS[difficulty];
  const baseXp = XP_PER_DIFFICULTY[difficulty];
  
  // RNG: Factor suerte (0.5 to 1.5)
  const rng = 0.5 + Math.random();
  
  // Coins formula: base weight + RNG, scaled by level bonus and streak bonus
  // Max cap at 10 (10€) as per PRD
  const levelBonus = multiplier ?? (1 + (level * 0.05)); // 5% extra per level
  const streakBonus = 1 + Math.min(0.2, streak * 0.01); // 1% extra per streak day, max 20%
  let coins = (weight * rng * 2) * levelBonus * streakBonus;
  coins = Math.min(10, Number(coins.toFixed(2))); // Cap at 10, round to 2 decimals

  // XP doesn't have RNG, just level/streak scaling
  const xp = Math.floor(baseXp * levelBonus * streakBonus);

  return { coins, xp };
}

export function calculatePenalty(difficulty: Difficulty): number {
  const weight = DIFFICULTY_WEIGHTS[difficulty];
  const rng = 0.5 + Math.random();
  // Lose up to 5 coins based on difficulty
  let penalty = weight * rng * 1.5;
  return Math.min(5, Number(penalty.toFixed(2)));
}
