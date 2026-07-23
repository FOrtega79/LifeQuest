import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface ProgressBarProps {
  progress: number; // 0 to 1
  colorClass?: string;
  className?: string;
}

export function ProgressBar({ progress, colorClass = "bg-cyan-400", className }: ProgressBarProps) {
  return (
    <div className={cn("h-2 w-full bg-slate-800 rounded-full overflow-hidden", className)}>
      <motion.div
        className={cn("h-full rounded-full", colorClass)}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
        transition={{ duration: 1, type: "spring", bounce: 0.2 }}
      />
    </div>
  );
}
