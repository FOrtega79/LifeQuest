import React, { useEffect, useState } from 'react';
import { Quest } from '../types';
import { cn, haptics } from '../lib/utils';
import { isPast } from 'date-fns';
import { motion } from 'motion/react';
import { RotateCw, CheckCircle2, Sparkles, CalendarOff, Ban, Trash2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { ProgressBar } from './ProgressBar';
import { AnimatePresence } from 'motion/react';

interface QuestCardProps {
  quest: Quest;
  onComplete: (id: string) => void | Promise<void>;
  onFail: (id: string) => void;
  onSnooze: () => void;
  onRemind?: () => void;
  onCompleteSubtask?: (questId: string, subtaskId: string) => void;
  activeReminder?: { startTime: number, targetTime: number };
  onCancel?: (id: string) => void;
  onToggleRecurrence?: (id: string) => void;
}

export const QuestCard: React.FC<QuestCardProps> = ({ quest, onComplete, onFail, onSnooze, onRemind, onCompleteSubtask, activeReminder, onCancel, onToggleRecurrence }) => {
  const [timeLeft, setTimeLeft] = useState('');
  const [expired, setExpired] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [showCompletionAnim, setShowCompletionAnim] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmStopRecurrence, setConfirmStopRecurrence] = useState(false);

  const totalSubtasks = quest.subtasks?.length || 0;
  const completedSubtasks = quest.subtasks?.filter(st => st.completed).length || 0;
  const subtaskProgress = totalSubtasks > 0 ? completedSubtasks / totalSubtasks : 0;

  useEffect(() => {
    if (totalSubtasks > 0 && completedSubtasks === totalSubtasks && quest.status === 'active') {
      setShowCompletionAnim(true);
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#34d399', '#fcd34d', '#f472b6']
      });
      const t = setTimeout(() => setShowCompletionAnim(false), 2000);
      return () => clearTimeout(t);
    }
  }, [completedSubtasks, totalSubtasks, quest.status]);

  const [reminderRemaining, setReminderRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!activeReminder) {
      setReminderRemaining(null);
      return;
    }
    const updateReminder = () => {
       const remaining = Math.max(0, activeReminder.targetTime - Date.now());
       const total = activeReminder.targetTime - activeReminder.startTime;
       if (remaining <= 0) setReminderRemaining(null);
       else setReminderRemaining(remaining / total); // 0 to 1
    }
    updateReminder();
    const int = setInterval(updateReminder, 1000);
    return () => clearInterval(int);
  }, [activeReminder]);


  useEffect(() => {
    if (quest.status !== 'active') return;
    
    const updateTime = () => {
      if (isPast(quest.deadline)) {
        setExpired(true);
        setTimeLeft('CRITICAL');
      } else {
        const diff = quest.deadline - Date.now();
        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
        setExpired(false);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [quest.deadline, quest.status]);

  const diffColors = {
    'Fácil': 'text-emerald-400 border-emerald-500 bg-emerald-500/10',
    'Medio': 'text-amber-400 border-amber-500 bg-amber-500/10',
    'Difícil': 'text-rose-500 border-rose-600 bg-rose-500/10',
  };
  
  const borderColor = {
    'Fácil': 'border-emerald-500',
    'Medio': 'border-amber-500',
    'Difícil': 'border-rose-500',
  };

  const tagColors: Record<string, string> = {
    'Work': 'text-[var(--accent-primary-light)] bg-[var(--accent-primary)]/10 border-[var(--accent-primary)]/30',
    'Fitness': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    'Learning': 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
    'Finance': 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    'Social': 'text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/30',
    'Life': 'text-rose-400 bg-rose-500/10 border-rose-500/30',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "bg-[var(--bg-card)] border-l-4 p-4 flex flex-col relative transition-all duration-300",
        quest.status === 'active' ? borderColor[quest.difficulty] : 
        quest.status === 'completed' ? 'border-slate-800 opacity-40 grayscale-[60%] hover:opacity-60 scale-[0.98] origin-left' : 'border-rose-900/40 opacity-30 grayscale-[80%] hover:opacity-50 scale-[0.98] origin-left'
      )}
    >
      <div className="flex justify-between mb-3">
        <div className="flex-1 pr-2">
          <div className="flex flex-wrap items-center">
            <span className={cn("text-[10px] px-2 py-0.5 border font-mono mb-2 inline-flex items-center gap-1.5 uppercase tracking-wider", diffColors[quest.difficulty])}>
              {quest.recurrence && quest.recurrence !== 'none' && <RotateCw className="w-3 h-3 animate-[spin_4s_linear_infinite]" />}
              <span>
                {quest.recurrence && quest.recurrence !== 'none' ? `${quest.recurrence} • ` : 'ONCE • '}{quest.difficulty}
              </span>
            </span>
            {quest.recurrence && quest.recurrence !== 'none' && quest.status === 'active' && onToggleRecurrence && (
              <button
                onClick={() => {
                  if (confirmStopRecurrence) {
                    haptics.tap();
                    onToggleRecurrence(quest.id);
                  } else {
                    haptics.tap();
                    setConfirmStopRecurrence(true);
                    setTimeout(() => setConfirmStopRecurrence(false), 3000);
                  }
                }}
                className={cn(
                  "text-[9px] font-mono mb-2 rounded ml-2 uppercase tracking-wider transition-colors flex items-center gap-1 px-2 py-0.5 border",
                  confirmStopRecurrence 
                    ? "bg-rose-600/30 text-rose-300 border-rose-500 animate-pulse font-bold" 
                    : "bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20 hover:text-rose-300"
                )}
                title="Stop this mission from repeating in the future"
              >
                <CalendarOff className="w-2.5 h-2.5" />
                <span>{confirmStopRecurrence ? "Confirm Stop?" : "Stop Recurrence"}</span>
              </button>
            )}
            {quest.tag && (
              <span className={cn("text-[10px] px-2 py-0.5 border font-mono mb-2 inline-flex items-center uppercase tracking-wider ml-2", tagColors[quest.tag])}>
                {quest.tag}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <h3 className={cn("text-lg font-semibold tracking-tight leading-tight", quest.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-100')}>
              {quest.title}
            </h3>
            {quest.isRushMode && quest.status === 'active' && (
              <span className="flex items-center gap-1 bg-fuchsia-500/20 text-fuchsia-400 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-widest border border-fuchsia-500/30">
                <Sparkles size={10} className="animate-pulse" />
                RUSH
              </span>
            )}
          </div>
          {quest.description && (
            <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
              {quest.description}
            </p>
          )}
          {quest.subtasks && quest.subtasks.length > 0 && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2 mb-2">
                 <ProgressBar progress={subtaskProgress} colorClass={completedSubtasks === totalSubtasks ? "bg-emerald-400" : "bg-fuchsia-500"} className="flex-1 h-1.5" />
                 <span className="text-[9px] font-mono font-bold text-slate-400">{completedSubtasks}/{totalSubtasks}</span>
              </div>
              <AnimatePresence>
                {showCompletionAnim && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none bg-[var(--bg-card)]/80 backdrop-blur-sm"
                  >
                    <div className="text-emerald-400 flex flex-col items-center gap-2 drop-shadow-[0_0_15px_rgba(52,211,153,0.5)]">
                      <CheckCircle2 className="w-12 h-12 animate-pulse" />
                      <span className="font-bold tracking-widest uppercase text-sm">Steps Completed</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="space-y-1 relative z-0">
              {quest.subtasks.map(st => (
                <div key={st.id} className={cn("flex items-center gap-2", st.completed ? "opacity-50" : "opacity-100")}>
                  <button
                    onClick={() => {
                      haptics.tap();
                      if (!st.completed && onCompleteSubtask && quest.status === 'active') {
                        onCompleteSubtask(quest.id, st.id);
                      }
                    }}
                    disabled={st.completed || quest.status !== 'active' || isCompleting}
                    className={cn(
                      "w-4 h-4 border flex items-center justify-center transition-colors",
                      st.completed ? "bg-emerald-500/20 border-emerald-500 text-emerald-400" : "bg-[var(--bg-base)] border-[var(--border-subtle)]"
                    )}
                  >
                    {st.completed && <span className="text-[10px] font-bold">✓</span>}
                  </button>
                  <span className={cn("text-[11px] font-mono", st.completed ? "line-through text-slate-500" : "text-slate-300")}>
                    {st.title}
                  </span>
                </div>
              ))}
            </div>
            </div>
          )}
          {quest.snoozed && quest.status === 'active' && (
            <div className="mt-2 inline-flex items-center text-[9px] font-mono tracking-widest text-amber-500 bg-amber-500/10 px-2 py-0.5 border border-amber-500/20 uppercase">
              Delayed: {quest.snoozeReason || 'No reason provided'}
            </div>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className={cn("text-[10px] uppercase font-bold", expired ? "text-rose-500 animate-pulse" : "text-slate-500")}>
            {quest.status === 'active' ? 'Countdown' : quest.status === 'completed' ? 'Done' : 'Failed'}
          </p>
          <p className={cn("text-lg font-mono", 
            quest.status === 'active' ? (expired ? "text-rose-500" : "text-white") : "text-slate-500"
          )}>
            {quest.status === 'active' ? timeLeft : '- - -'}
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-end gap-3 mt-3">
        <div className="flex gap-1 mb-1 order-2 sm:order-1 opacity-50 sm:opacity-100">
          <div className={cn("w-6 h-1", quest.status === 'active' ? 'bg-slate-700' : 'bg-slate-800')}></div>
          <div className={cn("w-6 h-1", quest.status === 'active' ? 'bg-slate-700' : 'bg-slate-800')}></div>
        </div>
        
        {quest.status === 'active' && (
          <div className="flex flex-wrap gap-2 order-1 sm:order-2 w-full sm:w-auto justify-end">
            {onRemind && (
              <button
                onClick={() => { haptics.tap(); onRemind(); }}
                className="bg-[var(--border-subtle)] text-[var(--accent-secondary-light)] border border-[var(--accent-secondary-dark)]/30 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider skew-x-[-12deg] hover:bg-[var(--accent-secondary-dark)]/50 transition-colors flex-1 sm:flex-none text-center justify-center flex"
                title="Set local browser reminder"
              >
                <div className="skew-x-[12deg] flex items-center gap-1.5">
                  {reminderRemaining !== null && (
                    <div className="relative w-3 h-3 rounded-full overflow-hidden border border-[var(--accent-secondary-light)] bg-black/40">
                      <div 
                        className="absolute bottom-0 left-0 right-0 bg-[var(--accent-secondary-light)] transition-all duration-1000 ease-linear"
                        style={{ height: `${reminderRemaining * 100}%` }}
                      ></div>
                    </div>
                  )}
                  <span>Remind</span>
                </div>
              </button>
            )}
            {!quest.snoozed && (
              <button
                onClick={() => { haptics.tap(); onSnooze(); }}
                className="bg-[var(--border-subtle)] text-amber-500/80 border border-amber-900/30 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider skew-x-[-12deg] hover:bg-amber-900/50 hover:text-amber-400 transition-colors flex-1 sm:flex-none text-center justify-center flex"
              >
                <div className="skew-x-[12deg]">Delay</div>
              </button>
            )}
             {onCancel && (
               <button
                 onClick={() => {
                   if (confirmCancel) {
                     haptics.tap();
                     onCancel(quest.id);
                   } else {
                     haptics.tap();
                     setConfirmCancel(true);
                     setTimeout(() => setConfirmCancel(false), 3000);
                   }
                 }}
                 className={cn(
                   "text-[10px] font-bold uppercase tracking-wider skew-x-[-12deg] px-3 py-1.5 transition-colors flex-1 sm:flex-none text-center justify-center flex",
                   confirmCancel 
                     ? "bg-rose-900/80 text-rose-100 border border-rose-600 animate-pulse" 
                     : "bg-[var(--border-subtle)] text-slate-400 border border-slate-700/30 hover:bg-slate-800 hover:text-slate-300"
                 )}
                 title="Cancel this mission without any penalization"
               >
                 <div className="skew-x-[12deg] flex items-center gap-1.5">
                   <Ban className="w-3.5 h-3.5" />
                   <span>{confirmCancel ? "Confirm?" : "Cancel"}</span>
                 </div>
               </button>
             )}
             <button
              onClick={() => { haptics.error(); onFail(quest.id); }}
              className="bg-[var(--border-subtle)] text-slate-400 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider skew-x-[-12deg] hover:bg-rose-900 hover:text-white transition-colors flex-1 sm:flex-none text-center justify-center flex"
            >
              <div className="skew-x-[12deg]">Abort</div>
            </button>
            <button
              onClick={async () => { haptics.tap(); setIsCompleting(true); try { await onComplete(quest.id); } finally { setIsCompleting(false); } }}
              disabled={isCompleting}
              className="bg-[var(--accent-primary-dark)] text-white px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider skew-x-[-12deg] hover:bg-[var(--accent-primary)] disabled:opacity-50 transition-colors flex-1 sm:flex-none text-center justify-center flex basis-full sm:basis-auto"
            >
              <div className="skew-x-[12deg] flex items-center justify-center">{isCompleting && <RotateCw className="w-3 h-3 animate-spin mr-1.5" />}Complete</div>
            </button>
          </div>
        )}
        
        {quest.status === 'completed' && (
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest skew-x-[-12deg] border border-slate-700 px-3 py-1 order-1 sm:order-2 ml-auto">
            <div className="skew-x-[12deg]">Verified</div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
