import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGame } from '../context/GameContext';
import { Brain, Heart, Coins, MessageSquare, Shield } from 'lucide-react';

const SKILLS_CONFIG = [
  { id: 'strength', name: 'Strength', color: 'text-emerald-400', bg: 'bg-emerald-500', border: 'border-emerald-500/30', icon: Heart },
  { id: 'intelligence', name: 'Intelligence', color: 'text-indigo-400', bg: 'bg-indigo-500', border: 'border-indigo-500/30', icon: Brain },
  { id: 'finance', name: 'Finance', color: 'text-amber-400', bg: 'bg-amber-500', border: 'border-amber-500/30', icon: Coins },
  { id: 'charisma', name: 'Charisma', color: 'text-fuchsia-400', bg: 'bg-fuchsia-500', border: 'border-fuchsia-500/30', icon: MessageSquare },
  { id: 'resolve', name: 'Resolve', color: 'text-rose-400', bg: 'bg-rose-500', border: 'border-rose-500/30', icon: Shield },
] as const;

interface AttributeAllocationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AttributeAllocationModal({ isOpen, onClose }: AttributeAllocationModalProps) {
  const { stats, allocateStatPoint } = useGame();

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-[var(--bg-base)]/90 backdrop-blur-sm flex items-center justify-center p-4"
      >
        <motion.div 
          initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
          className="w-full max-w-sm bg-[var(--bg-panel)] border border-[var(--border-subtle)] p-6 shadow-2xl flex flex-col max-h-[80vh]"
        >
          <div className="flex justify-between items-center mb-4 border-b border-[var(--border-subtle)] pb-2">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--accent-primary-light)] flex items-center">
              <span className="w-2 h-2 bg-[var(--accent-primary)] mr-2 animate-pulse"></span> ATTRIBUTE ALLOCATION
            </h3>
            <span className="text-[10px] font-bold text-fuchsia-400 uppercase tracking-widest bg-fuchsia-900/30 px-2 py-0.5 border border-fuchsia-500/30">
              {stats.statPoints} Pts
            </span>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-3 mb-4">
            <p className="text-[10px] text-slate-400 mb-4 leading-relaxed">
              You have leveled up! Allocate your bonus stat points to customize your operative profile.
            </p>
            
            {SKILLS_CONFIG.map(skill => {
              const SIcon = skill.icon;
              const skillValue = stats.skills?.[skill.id as keyof typeof stats.skills] || 0;
              return (
                <div key={skill.id} className="bg-[var(--bg-base)] border border-white/5 p-3 flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded flex items-center justify-center bg-black/40 border ${skill.border}`}>
                      <SIcon className={`w-4 h-4 ${skill.color}`} />
                    </div>
                    <div>
                      <div className={`text-[10px] font-bold uppercase tracking-widest ${skill.color}`}>{skill.name}</div>
                      <div className="text-[9px] text-slate-500 font-mono">Level {skillValue}</div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => allocateStatPoint(skill.id as keyof typeof stats.skills)}
                    disabled={!stats.statPoints || stats.statPoints <= 0}
                    className="w-8 h-8 flex items-center justify-center bg-[var(--border-subtle)] border border-[var(--border-strong)] text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-fuchsia-900/40 hover:text-fuchsia-400 hover:border-fuchsia-500/50 transition-colors"
                  >
                    +
                  </button>
                </div>
              );
            })}
          </div>
          
          <button 
            onClick={onClose}
            className="w-full py-2 bg-[var(--border-subtle)] text-slate-300 text-[10px] font-bold uppercase tracking-widest hover:bg-[var(--border-strong)] transition-colors"
          >
            {stats.statPoints && stats.statPoints > 0 ? 'Save For Later' : 'Complete Allocation'}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
