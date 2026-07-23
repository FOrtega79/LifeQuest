import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGame } from '../context/GameContext';
import { Gift, Coins, Zap, Flame, Check, Lock, Sparkles } from 'lucide-react';
import { isSameDay, isYesterday } from 'date-fns';
import { vibrate } from '../lib/utils';
import confetti from 'canvas-confetti';

export function DailyLoginModal() {
  const { stats, canClaimDailyLogin, claimDailyLoginReward } = useGame();
  const [isOpen, setIsOpen] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [rewardClaimed, setRewardClaimed] = useState<{ coins: number; streak: number } | null>(null);

  // Automatically open the modal if a claim is available and hasn't been claimed in this session
  useEffect(() => {
    if (canClaimDailyLogin && !rewardClaimed) {
      const timer = setTimeout(() => {
        setIsOpen(true);
        vibrate([50, 100, 50]);
      }, 1500); // Wait a short bit after splash screen
      return () => clearTimeout(timer);
    }
  }, [canClaimDailyLogin, rewardClaimed]);

  if (!isOpen) return null;

  // Determine the next streak if claimed today
  let nextStreak = stats.streak || 0;
  if (!stats.lastActiveDate) {
    nextStreak = 1;
  } else if (isYesterday(stats.lastActiveDate)) {
    nextStreak = (stats.streak || 0) + 1;
  } else if (!isSameDay(stats.lastActiveDate, Date.now())) {
    nextStreak = 1;
  }

  // Map to 7-day reward cycle index (1-7)
  const currentRewardDay = ((nextStreak - 1) % 7) + 1;

  // Rewards layout definition (Days 1 to 7)
  const daysData = Array.from({ length: 7 }, (_, i) => {
    const dayNum = i + 1;
    const baseReward = 5.00;
    const streakBonus = Number((dayNum * 0.5).toFixed(2));
    const totalReward = Number((baseReward + streakBonus).toFixed(2));
    
    return {
      day: dayNum,
      coins: totalReward,
      isToday: dayNum === currentRewardDay,
      isClaimed: dayNum < currentRewardDay,
      isLocked: dayNum > currentRewardDay,
    };
  });

  const handleClaim = async () => {
    setClaiming(true);
    try {
      const result = await claimDailyLoginReward();
      if (result) {
        setRewardClaimed(result);
        
        // Throw some gorgeous confetti!
        const duration = 2 * 1000;
        const end = Date.now() + duration;

        (function frame() {
          confetti({
            particleCount: 5,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: ['#22d3ee', '#ec4899', '#f59e0b']
          });
          confetti({
            particleCount: 5,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: ['#22d3ee', '#ec4899', '#f59e0b']
          });

          if (Date.now() < end) {
            requestAnimationFrame(frame);
          }
        }());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setClaiming(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setRewardClaimed(null);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--bg-base)]/95 backdrop-blur-md"
      >
        <motion.div
          initial={{ scale: 0.95, y: 15 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-sm bg-[var(--bg-panel)] border border-[var(--border-subtle)] shadow-[0_0_50px_rgba(34,211,238,0.15)] relative p-6 overflow-hidden flex flex-col items-center"
        >
          {/* Decorative scanner line */}
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent animate-pulse" />
          
          <div className="relative mb-4">
            <div className="w-14 h-14 bg-gradient-to-br from-cyan-500/20 to-fuchsia-500/20 rounded-full flex items-center justify-center border border-[var(--accent-primary)]/40 shadow-[0_0_15px_rgba(34,211,238,0.3)]">
              <Gift className="w-7 h-7 text-[var(--accent-primary-light)] animate-bounce" />
            </div>
            <div className="absolute -top-1 -right-1">
              <Sparkles className="w-4 h-4 text-amber-400" />
            </div>
          </div>

          <h2 className="text-sm font-black text-center tracking-widest text-white uppercase mb-1 flex items-center gap-1.5 font-sans">
            DAILY ACCESS GRANTED
          </h2>
          <p className="text-[10px] text-[var(--accent-primary-light)] font-mono tracking-widest uppercase mb-6">
            ESTACIÓN DE SUMINISTRO
          </p>

          {!rewardClaimed ? (
            <>
              {/* Daily Supply Matrix */}
              <div className="grid grid-cols-4 gap-2 w-full mb-6">
                {daysData.map((day) => (
                  <div
                    key={day.day}
                    className={`relative p-2.5 flex flex-col items-center justify-center border transition-all ${
                      day.isToday
                        ? 'bg-gradient-to-b from-cyan-950/40 to-slate-900 border-[var(--accent-primary)] shadow-[0_0_15px_rgba(34,211,238,0.25)]'
                        : day.isClaimed
                        ? 'bg-[var(--bg-highlight)]/50 border-emerald-500/30 opacity-70'
                        : 'bg-[var(--bg-base)]/60 border-[var(--border-subtle)] opacity-50'
                    } ${day.day === 7 ? 'col-span-2 flex-row gap-3' : ''}`}
                  >
                    <div className="text-[8px] font-mono font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Day {day.day}
                    </div>

                    <div className="flex items-center justify-center mb-1">
                      {day.isClaimed ? (
                        <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/50">
                          <Check className="w-3 h-3 text-emerald-400" />
                        </div>
                      ) : day.isLocked ? (
                        <Lock className="w-3.5 h-3.5 text-slate-600" />
                      ) : (
                        <Coins className={`w-4 h-4 ${day.day === 7 ? 'text-amber-400 animate-spin' : 'text-[var(--accent-primary-light)]'}`} />
                      )}
                    </div>

                    <div className="text-[10px] font-mono font-bold text-slate-200">
                      ${day.coins.toFixed(1)}
                    </div>

                    {day.isToday && (
                      <span className="absolute -top-1.5 px-1 bg-[var(--accent-primary)] text-[#0d0d12] text-[6px] font-black tracking-widest uppercase rounded">
                        NOW
                      </span>
                    )}
                  </div>
                ))}

                {/* Multiplier Boost Info box */}
                <div className="col-span-2 p-2.5 bg-[var(--bg-highlight)] border border-[var(--accent-secondary)]/30 flex flex-col items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-fuchsia-500/10 to-transparent pointer-events-none" />
                  <div className="flex items-center text-[var(--accent-secondary-light)] font-mono font-bold text-[9px] uppercase tracking-wider mb-0.5">
                    <Zap className="w-3 h-3 mr-1 fill-fuchsia-500/20" />
                    +0.15x Boost
                  </div>
                  <div className="text-[7px] text-center text-slate-400 leading-tight">
                    Temporary bonus reward multiplier active today!
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <button
                disabled={claiming}
                onClick={handleClaim}
                className="w-full py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 text-[#0d0d12] hover:from-cyan-400 hover:to-cyan-500 disabled:from-cyan-800 disabled:to-cyan-900 disabled:text-[var(--accent-primary-dark)] font-black text-xs uppercase tracking-widest transition-all shadow-[0_4px_20px_rgba(34,211,238,0.25)] flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
              >
                {claiming ? (
                  <div className="w-4 h-4 border-2 border-[#0d0d12] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Flame className="w-4 h-4 fill-[#0d0d12]" />
                    CLAIM SUPPLY CREDITS
                  </>
                )}
              </button>
            </>
          ) : (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full text-center py-4"
            >
              <div className="inline-flex items-center text-emerald-400 bg-emerald-500/10 px-4 py-2 border border-emerald-500/30 mb-4 rounded">
                <Coins className="w-5 h-5 mr-2" />
                <span className="font-mono font-bold text-lg">+${rewardClaimed.coins.toFixed(2)} LQ</span>
              </div>

              <div className="bg-[var(--bg-highlight)] border border-[var(--accent-primary)]/30 p-4 mb-6 rounded text-left">
                <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2 mb-2">
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">New Login Streak</span>
                  <span className="text-orange-400 text-xs font-mono font-bold flex items-center">
                    <Flame size={12} className="mr-1 fill-orange-500/20" />
                    {rewardClaimed.streak} Days
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Daily Multiplier Boost</span>
                  <span className="text-[var(--accent-secondary-light)] text-xs font-mono font-bold flex items-center animate-pulse">
                    <Zap size={12} className="mr-1 fill-fuchsia-500/20" />
                    +0.15x Active
                  </span>
                </div>
              </div>

              <button
                onClick={handleClose}
                className="w-full py-3 bg-[var(--bg-highlight)] hover:bg-[#252538] text-white border border-[var(--border-subtle)] font-bold text-xs uppercase tracking-widest transition-colors cursor-pointer"
              >
                DISMISS SUPPLY PROTOCOL
              </button>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
