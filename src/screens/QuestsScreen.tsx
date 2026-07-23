import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { QuestCard } from '../components/QuestCard';
import { LootboxOverlay } from '../components/LootboxOverlay';
import { motion } from 'motion/react';
import { ShieldCheck, Sparkles } from 'lucide-react';

type SortOption = 'time_asc' | 'time_desc' | 'difficulty_desc' | 'difficulty_asc';

export function QuestsScreen() {
  const { quests, completeQuest, failQuest, snoozeQuest, completeSubtask, cancelQuest, toggleRecurrence } = useGame();
  const [rewardData, setRewardData] = useState<{ coins: number; xp: number; leveledUp: boolean; crateDropped?: boolean } | null>(null);
  const [sortOption, setSortOption] = useState<SortOption>('time_asc');
  
  const [activeReminders, setActiveReminders] = useState<Record<string, { startTime: number, targetTime: number }>>({});
  const [snoozeModalQuest, setSnoozeModalQuest] = useState<string | null>(null);
  const [snoozeReason, setSnoozeReason] = useState('');
  const [snoozeHours, setSnoozeHours] = useState(1);

  const [remindModalQuest, setRemindModalQuest] = useState<string | null>(null);
  const [remindMinutes, setRemindMinutes] = useState(15);
  const [remindPermissionStatus, setRemindPermissionStatus] = useState<NotificationPermission | null>(null);

  const handleRemindClick = async (questId: string) => {
    if (typeof window !== 'undefined' && 'Notification' in window && window.Notification) {
      const perm = window.Notification.permission;
      setRemindPermissionStatus(perm);
      if (perm === 'default') {
        const newPerm = await window.Notification.requestPermission();
        setRemindPermissionStatus(newPerm);
      }
    }
    setRemindModalQuest(questId);
  };

  const activeQuests = quests.filter(q => q.status === 'active').sort((a, b) => {
    if (sortOption === 'time_asc') return a.deadline - b.deadline;
    if (sortOption === 'time_desc') return b.deadline - a.deadline;
    
    const diffWeights = { 'Fácil': 1, 'Medio': 2, 'Difícil': 3 };
    if (sortOption === 'difficulty_desc') return diffWeights[b.difficulty] - diffWeights[a.difficulty];
    if (sortOption === 'difficulty_asc') return diffWeights[a.difficulty] - diffWeights[b.difficulty];
    
    return a.deadline - b.deadline;
  });
  // Last 3 to save space
  const pastQuests = quests.filter(q => q.status !== 'active').sort((a, b) => b.createdAt - a.createdAt).slice(0, 3); 

  const handleComplete = async (id: string) => {
    const result = await completeQuest(id);
    if (result) {
      setRewardData(result);
    }
  };

  return (
    <div className="pb-24 pt-2">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-4 gap-2">
        <h2 className="text-sm font-bold flex items-center tracking-wider uppercase text-slate-100">
          <span className="w-2 h-2 bg-[var(--accent-primary)] mr-2"></span> ACTIVE MISSIONS
        </h2>
        <div className="flex items-center gap-3">
          <select 
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as SortOption)}
            className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] text-slate-400 text-[10px] font-bold uppercase tracking-widest px-2 py-1 outline-none focus:border-[var(--accent-primary)] transition-colors"
          >
            <option value="time_asc">Time (Earliest)</option>
            <option value="time_desc">Time (Latest)</option>
            <option value="difficulty_desc">Diff (Hardest)</option>
            <option value="difficulty_asc">Diff (Easiest)</option>
          </select>
          <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Count: {activeQuests.length}</span>
        </div>
      </div>

      {activeQuests.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] p-8 flex flex-col items-center justify-center text-center mt-8 shadow-2xl relative overflow-hidden"
        >
          {/* Decorative background grid */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:16px_16px]"></div>
          
          <div className="relative mb-6 mt-4 w-full max-w-[240px] z-10 overflow-hidden rounded-lg border border-[var(--border-subtle)] shadow-[0_0_20px_rgba(34,211,238,0.1)]">
            <img
              src="https://picsum.photos/seed/cyberpunk_missions/400/300?blur=1"
              alt="No active missions"
              referrerPolicy="no-referrer"
              className="w-full h-32 object-cover opacity-80 mix-blend-luminosity"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-panel)] to-transparent pointer-events-none"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-cyan-900/50 rounded-full flex items-center justify-center border border-[var(--accent-primary)]/50 shadow-[0_0_20px_rgba(34,211,238,0.2)]">
              <ShieldCheck className="w-6 h-6 text-[var(--accent-primary-light)] drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
            </div>
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute top-1/2 right-1/4 -translate-y-1/2"
            >
              <Sparkles className="w-4 h-4 text-cyan-300" />
            </motion.div>
          </div>
          
          <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--accent-primary-light)] mb-2 drop-shadow-[0_0_8px_rgba(34,211,238,0.3)] relative z-10">
            Mission Accomplished
          </h3>
          <p className="text-[10px] text-slate-400 max-w-[220px] leading-relaxed relative z-10">
            All active targets cleared. Excellent work, Operator. Stand by for new directives or create your own.
          </p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {activeQuests.map((quest) => (
            <QuestCard 
              key={quest.id} 
              quest={quest} 
              onComplete={handleComplete} 
              onFail={failQuest} 
              onSnooze={() => setSnoozeModalQuest(quest.id)}
              onRemind={() => handleRemindClick(quest.id)}
              activeReminder={activeReminders[quest.id]}
              onCompleteSubtask={completeSubtask}
              onCancel={cancelQuest}
              onToggleRecurrence={toggleRecurrence}
            />
          ))}
        </div>
      )}

      {pastQuests.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xs font-bold flex items-center tracking-wider uppercase text-slate-500 mb-3">
            <span className="w-1.5 h-1.5 bg-slate-600 mr-2"></span> MISSION LOG
          </h2>
          <div className="space-y-1">
            {pastQuests.map((quest) => (
              <QuestCard 
                key={quest.id} 
                quest={quest} 
                onComplete={() => {}} 
                onFail={() => {}} 
                onSnooze={() => {}}
              />
            ))}
          </div>
        </div>
      )}

      <LootboxOverlay 
        isOpen={!!rewardData} 
        reward={rewardData} 
        onClose={() => setRewardData(null)} 
      />

      {snoozeModalQuest && (
        <div className="fixed inset-0 z-50 bg-[var(--bg-base)]/90 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }} 
            className="w-full max-w-sm bg-[var(--bg-panel)] border border-[var(--border-subtle)] p-6 shadow-2xl"
          >
            <h3 className="text-xs font-bold uppercase tracking-widest text-amber-400 mb-4 flex items-center">
              <span className="w-2 h-2 bg-amber-500 mr-2"></span> INITIATE SNOOZE PROTOCOL
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-[9px] uppercase font-bold tracking-widest text-slate-500 mb-1 block">Delay (Hours)</label>
                <input 
                  type="number" min="1" max="72"
                  value={snoozeHours}
                  onChange={e => setSnoozeHours(parseInt(e.target.value) || 1)}
                  className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none font-mono"
                />
              </div>
              
              <div>
                <label className="text-[9px] uppercase font-bold tracking-widest text-slate-500 mb-1 block">Reason for Delay</label>
                <input 
                  type="text" 
                  value={snoozeReason}
                  onChange={e => setSnoozeReason(e.target.value)}
                  placeholder="e.g. Need more intel"
                  className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none font-mono"
                />
              </div>

              <div className="flex gap-2 mt-6">
                <button 
                  onClick={() => {
                    setSnoozeModalQuest(null);
                    setSnoozeReason('');
                  }}
                  className="flex-1 py-2 bg-[var(--border-subtle)] text-slate-300 text-[10px] font-bold uppercase tracking-widest hover:bg-[var(--border-strong)] transition-colors"
                >
                  Cancel
                </button>
                <button 
                  disabled={!snoozeReason.trim()}
                  onClick={() => {
                    if (snoozeModalQuest && snoozeReason.trim()) {
                      snoozeQuest(snoozeModalQuest, snoozeReason, snoozeHours);
                      setSnoozeModalQuest(null);
                      setSnoozeReason('');
                    }
                  }}
                  className="flex-1 py-2 bg-amber-600 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-amber-500 transition-colors disabled:opacity-50"
                >
                  Confirm Delay
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {remindModalQuest && (
        <div className="fixed inset-0 z-50 bg-[var(--bg-base)]/90 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }} 
            className="w-full max-w-sm bg-[var(--bg-panel)] border border-[var(--border-subtle)] p-6 shadow-2xl"
          >
            <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--accent-secondary-light)] mb-4 flex items-center">
              <span className="w-2 h-2 bg-[var(--accent-secondary)] mr-2"></span> SCHEDULE REMINDER
            </h3>
            
            {remindPermissionStatus === 'denied' ? (
               <div className="text-[10px] text-rose-400 mb-4 border border-rose-500/20 bg-rose-500/10 p-3">
                 Notification permission is denied. Please enable notifications in your browser settings to use this feature.
               </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-[9px] uppercase font-bold tracking-widest text-slate-500 mb-1 block">Remind me in (Minutes)</label>
                  <select 
                    value={remindMinutes}
                    onChange={e => setRemindMinutes(parseInt(e.target.value))}
                    className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] px-3 py-2 text-sm text-white focus:border-[var(--accent-secondary)] focus:outline-none font-mono"
                  >
                    <option value={1}>1 Minute (Test)</option>
                    <option value={5}>5 Minutes</option>
                    <option value={15}>15 Minutes</option>
                    <option value={30}>30 Minutes</option>
                    <option value={60}>1 Hour</option>
                    <option value={120}>2 Hours</option>
                  </select>
                </div>

                <div className="flex gap-2 mt-6">
                  <button 
                    onClick={() => setRemindModalQuest(null)}
                    className="flex-1 py-2 bg-[var(--border-subtle)] text-slate-300 text-[10px] font-bold uppercase tracking-widest hover:bg-[var(--border-strong)] transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => {
                      if (remindModalQuest) {
                        const quest = quests.find(q => q.id === remindModalQuest);
                        if (quest) {
                          if ('serviceWorker' in navigator) {
                            navigator.serviceWorker.ready.then((reg) => {
                              if (reg.active) {
                                reg.active.postMessage({
                                  type: 'TRIGGER_NOTIFICATION',
                                  title: 'Mission Reminder',
                                  body: `Time to focus on: ${quest.title}`,
                                  delay: remindMinutes * 60 * 1000,
                                  icon: '/icon.png'
                                });
                              }
                            });
                          } else {
                            // Fallback if no service worker
                            setTimeout(() => {
                              if (typeof window !== 'undefined' && 'Notification' in window && window.Notification && window.Notification.permission === 'granted') {
                                new window.Notification('Mission Reminder', {
                                  body: `Time to focus on: ${quest.title}`,
                                  icon: '/icon.png'
                                });
                              }
                            }, remindMinutes * 60 * 1000);
                          }
                        }
                        setActiveReminders(prev => ({ ...prev, [remindModalQuest]: { startTime: Date.now(), targetTime: Date.now() + remindMinutes * 60 * 1000 } }));
                        setRemindModalQuest(null);
                      }
                    }}
                    className="flex-1 py-2 bg-fuchsia-600 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-[var(--accent-secondary)] transition-colors"
                  >
                    Set Reminder
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}
