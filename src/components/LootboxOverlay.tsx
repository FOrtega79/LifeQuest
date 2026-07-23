import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { haptics } from '../lib/utils';
import { X, Star } from 'lucide-react';
import { AttributeAllocationModal } from './AttributeAllocationModal';

interface LootboxOverlayProps {
  isOpen: boolean;
  reward: { coins: number; xp: number; leveledUp: boolean; crateDropped?: boolean } | null;
  onClose: () => void;
}

export function LootboxOverlay({ isOpen, reward, onClose }: LootboxOverlayProps) {
  const [showVideo, setShowVideo] = useState(false);
  const [showAttributeModal, setShowAttributeModal] = useState(false);

  useEffect(() => {
    if (isOpen && reward) {
      if (reward.leveledUp) {
        haptics.levelUp();
        setShowVideo(true);
      } else if (reward.crateDropped) {
        haptics.crateOpen();
        setShowVideo(false);
      } else {
        haptics.success();
        setShowVideo(false);
      }
      
      const duration = 3 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 };

      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      const interval: any = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
        confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
      }, 250);

      return () => clearInterval(interval);
    }
  }, [isOpen, reward]);

  const handleClose = () => {
    if (reward?.leveledUp) {
      setShowAttributeModal(true);
    } else {
      onClose();
    }
  };

  const handleAttributeModalClose = () => {
    setShowAttributeModal(false);
    onClose();
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && reward && !showAttributeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[var(--bg-base)]/95 backdrop-blur-sm"
          >
            {showVideo ? (
              <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: [1, 1.2, 1], rotate: 0 }}
                  transition={{ duration: 1, type: "spring", bounce: 0.5 }}
                  className="mb-8"
                >
                  <Star size={120} className="text-cyan-400 fill-cyan-400 drop-shadow-[0_0_40px_rgba(34,211,238,0.8)]" />
                </motion.div>
                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                  className="text-3xl md:text-5xl font-bold text-white uppercase tracking-widest text-center px-4"
                >
                  New Level Achieved
                </motion.h1>
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.5 }}
                  onClick={() => setShowVideo(false)}
                  className="mt-12 px-8 py-3 bg-cyan-500/20 text-cyan-400 border border-cyan-500 font-bold uppercase tracking-widest hover:bg-cyan-500/40 transition-colors skew-x-[-12deg]"
                >
                  <div className="skew-x-[12deg]">Continue</div>
                </motion.button>
              </div>
            ) : (
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm bg-[var(--bg-panel)] border border-[var(--accent-primary)] p-6 text-center relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-b before:from-cyan-500/10 before:to-transparent before:pointer-events-none"
            >
              <div className="relative z-10">
                <div className="w-16 h-16 mx-auto mb-4 border-2 border-[var(--accent-primary-light)] bg-[var(--bg-base)] flex items-center justify-center rotate-45 shadow-[0_0_20px_rgba(34,211,238,0.4)]">
                  <div className="-rotate-45 text-2xl font-bold text-[var(--accent-primary-light)]">LQ</div>
                </div>
                
                <h2 className="text-xl font-bold text-white tracking-widest uppercase mb-1">Mission Success</h2>
                <p className="text-[10px] text-[var(--accent-primary)] uppercase tracking-widest mb-6 font-bold">Rewards Extracted</p>
                
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="bg-[var(--bg-base)] border border-[var(--border-subtle)] p-3 flex flex-col items-center justify-center relative overflow-hidden group">
                    <div className="absolute inset-0 bg-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="text-xl font-mono font-bold text-emerald-400">+{reward.coins.toFixed(2)}</div>
                    <div className="text-[9px] text-slate-500 uppercase tracking-widest mt-1 font-bold">Credits</div>
                  </div>
                  
                  <div className="bg-[var(--bg-base)] border border-[var(--border-subtle)] p-3 flex flex-col items-center justify-center relative overflow-hidden group">
                    <div className="absolute inset-0 bg-[var(--accent-secondary)]/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="text-xl font-mono font-bold text-[var(--accent-secondary-light)]">+{reward.xp}</div>
                    <div className="text-[9px] text-slate-500 uppercase tracking-widest mt-1 font-bold">Experience</div>
                  </div>
                </div>

                {reward.leveledUp && (
                  <div className="mb-4 py-2 border-y border-amber-500/30 text-[10px] text-amber-400 uppercase tracking-widest font-bold animate-pulse">
                    System Upgrade: Level Up
                  </div>
                )}

                {reward.crateDropped && (
                  <div className="mb-6 py-2 border-y border-fuchsia-500/30 text-[10px] text-fuchsia-400 uppercase tracking-widest font-bold animate-pulse">
                    Rare Drop: Data Cache
                  </div>
                )}

                <button
                  onClick={handleClose}
                  className="w-full py-3 bg-[var(--accent-primary-dark)] text-white font-bold text-[11px] uppercase tracking-widest hover:bg-[var(--accent-primary)] transition-colors skew-x-[-12deg]"
                >
                  <div className="skew-x-[12deg]">Acknowledge</div>
                </button>
              </div>
            </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      <AttributeAllocationModal 
        isOpen={showAttributeModal} 
        onClose={handleAttributeModalClose} 
      />
    </>
  );
}
