import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Haptic feedback helper
let hapticsEnabled = true;

export function setHapticsGlobal(enabled: boolean) {
  hapticsEnabled = enabled;
}

export function vibrate(pattern: number | number[] = 50) {
  if (!hapticsEnabled) return;
  if (typeof window !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(pattern);
    } catch (e) {
      // Ignore if not supported or blocked
    }
  }
}

export const haptics = {
  tap: () => vibrate(10),
  success: () => vibrate([30, 40, 30]), // Completing a quest (subtle)
  crateOpen: () => vibrate([40, 50, 40, 50, 100]), // Opening mystery crate
  levelUp: () => vibrate([50, 50, 50, 50, 200]), // Leveling up
  error: () => vibrate([100, 50, 100]),
};
