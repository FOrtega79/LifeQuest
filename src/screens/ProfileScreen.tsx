import React, { useState, useMemo, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { motion, AnimatePresence } from 'motion/react';
import { calculateRequiredXp } from '../lib/gameLogic';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { useAuthState } from 'react-firebase-hooks/auth';
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { subDays, format, startOfDay } from 'date-fns';
import { Bell, ShieldAlert, Send, Clock, Zap, Shield, Crosshair, Crown, Target, Award, Flame, User, Skull, Ghost, Star, Brain, Heart, Coins, MessageSquare, Lock } from 'lucide-react';

const SKILLS_CONFIG = [
  { id: 'strength', name: 'Strength', color: 'text-emerald-400', bg: 'bg-emerald-500', border: 'border-emerald-500/30', icon: Heart },
  { id: 'intelligence', name: 'Intelligence', color: 'text-indigo-400', bg: 'bg-indigo-500', border: 'border-indigo-500/30', icon: Brain },
  { id: 'finance', name: 'Finance', color: 'text-amber-400', bg: 'bg-amber-500', border: 'border-amber-500/30', icon: Coins },
  { id: 'charisma', name: 'Charisma', color: 'text-fuchsia-400', bg: 'bg-fuchsia-500', border: 'border-fuchsia-500/30', icon: MessageSquare },
  { id: 'resolve', name: 'Resolve', color: 'text-rose-400', bg: 'bg-rose-500', border: 'border-rose-500/30', icon: Shield },
] as const;

const BADGE_DEFINITIONS: Record<string, {
  name: string;
  description: string;
  icon: React.ElementType;
  colorClass: string;
  bgClass: string;
  glowClass: string;
}> = {
  'Initiate': {
    name: 'Initiate',
    description: 'Level 1 Achieved',
    icon: Shield,
    colorClass: 'text-slate-300',
    bgClass: 'from-slate-800 to-slate-900 border-slate-700/50',
    glowClass: 'shadow-[0_0_15px_rgba(148,163,184,0.15)]',
  },
  'Adept': {
    name: 'Adept',
    description: 'Level 5 Achieved',
    icon: Crosshair,
    colorClass: 'text-[var(--accent-primary-light)]',
    bgClass: 'from-cyan-950 to-[#0D0D12] border-[var(--accent-primary)]/30',
    glowClass: 'shadow-[0_0_15px_rgba(34,211,238,0.2)]',
  },
  'Master': {
    name: 'Master',
    description: 'Level 10 Achieved',
    icon: Crown,
    colorClass: 'text-amber-400',
    bgClass: 'from-amber-950 to-[#0D0D12] border-amber-500/30',
    glowClass: 'shadow-[0_0_15px_rgba(251,191,36,0.2)]',
  },
  'First Blood': {
    name: 'First Blood',
    description: 'First Quest Completed',
    icon: Target,
    colorClass: 'text-rose-500',
    bgClass: 'from-rose-950 to-[#0D0D12] border-rose-500/30',
    glowClass: 'shadow-[0_0_15px_rgba(244,63,94,0.2)]',
  },
  'Vanguard': {
    name: 'Vanguard',
    description: '10 Quests Completed',
    icon: Star,
    colorClass: 'text-indigo-400',
    bgClass: 'from-indigo-950 to-[#0D0D12] border-indigo-500/30',
    glowClass: 'shadow-[0_0_15px_rgba(99,102,241,0.2)]',
  },
  'Veteran': {
    name: 'Veteran',
    description: '50 Quests Completed',
    icon: Award,
    colorClass: 'text-[var(--accent-secondary-light)]',
    bgClass: 'from-fuchsia-950 to-[#0D0D12] border-[var(--accent-secondary)]/30',
    glowClass: 'shadow-[0_0_15px_rgba(232,121,249,0.2)]',
  },
  'Centurion': {
    name: 'Centurion',
    description: '100 Quests Completed',
    icon: Crown,
    colorClass: 'text-fuchsia-400',
    bgClass: 'from-fuchsia-950 to-[#0D0D12] border-fuchsia-500/30',
    glowClass: 'shadow-[0_0_15px_rgba(217,70,239,0.25)]',
  },
  'Streak Rookie': {
    name: 'Streak Rookie',
    description: '3 Day Streak',
    icon: Zap,
    colorClass: 'text-orange-400',
    bgClass: 'from-orange-950 to-[#0D0D12] border-orange-500/30',
    glowClass: 'shadow-[0_0_15px_rgba(251,146,60,0.2)]',
  },
  'Streak Master': {
    name: 'Streak Master',
    description: '7 Day Streak',
    icon: Flame,
    colorClass: 'text-amber-500',
    bgClass: 'from-amber-950 to-[#0D0D12] border-amber-500/30',
    glowClass: 'shadow-[0_0_15px_rgba(245,158,11,0.2)]',
  },
  'Fort Knox': {
    name: 'Fort Knox',
    description: '100 Coins Accumulated',
    icon: Coins,
    colorClass: 'text-yellow-400',
    bgClass: 'from-yellow-950 to-[#0D0D12] border-yellow-500/30',
    glowClass: 'shadow-[0_0_15px_rgba(234,179,8,0.2)]',
  }
};

export function ProfileScreen() {
  const [user] = useAuthState(auth);
  const { stats, quests, transactions, redeemCoins, toggleSound, toggleHaptics, updateTheme, updateAvatar, purchaseCosmetic, allocateStatPoint } = useGame();
  const [showRedeem, setShowRedeem] = useState(false);
  const [showLevels, setShowLevels] = useState(false);
  const [redeemAmount, setRedeemAmount] = useState('');
  const [redeemConcept, setRedeemConcept] = useState('');
  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'achievements' | 'history'>('overview');

  // Push notifications state and simulation helpers
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window && window.Notification ? window.Notification.permission : 'default'
  );
  const [testDelay, setTestDelay] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('quest_reminder');

  // Monitor permission updates
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && window.Notification) {
      const checkPermission = () => {
        if (window.Notification) {
          setPermission(window.Notification.permission);
        }
      };
      
      // Periodically check or check on focus
      window.addEventListener('focus', checkPermission);
      return () => window.removeEventListener('focus', checkPermission);
    }
  }, []);

  const requestNotificationPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window && window.Notification) {
      const res = await window.Notification.requestPermission();
      setPermission(res);
      if (res === 'granted') {
        new window.Notification('System Link Established', {
          body: 'You are now connected to the LifeQuest notification network.',
          icon: '/icon.png'
        });
      }
    }
  };

  const notificationTemplates = {
    quest_reminder: {
      title: '🚨 Mission Critical Threat!',
      body: 'Your active quest is about to expire in 5 minutes! Complete it to preserve your streak.'
    },
    reward_earned: {
      title: '💰 Supply Drop Delivered',
      body: 'You have been awarded +$5.50 LQ for completing your Daily Login Protocol!'
    },
    motivational: {
      title: '⚡ Cybernetic Insight',
      body: 'The only bad quest is the one you did not register. Access your terminal now.'
    }
  };

  const triggerTestNotification = (delaySeconds: number = 0) => {
    if (permission !== 'granted') return;

    const template = notificationTemplates[selectedTemplate as keyof typeof notificationTemplates] || notificationTemplates.quest_reminder;

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        if (reg.active) {
          reg.active.postMessage({
            type: 'TRIGGER_NOTIFICATION',
            title: template.title,
            body: template.body,
            delay: delaySeconds * 1000,
            icon: '/icon.png'
          });
          
          if (delaySeconds > 0) {
            setTestDelay(true);
            setTimeout(() => setTestDelay(false), delaySeconds * 1000);
          }
        } else {
          // Fallback to local notification if SW active state is not ready
          if (delaySeconds > 0) {
            setTestDelay(true);
            setTimeout(() => {
              if (typeof window !== 'undefined' && 'Notification' in window && window.Notification) {
                new window.Notification(template.title, { body: template.body, icon: '/icon.png' });
              }
              setTestDelay(false);
            }, delaySeconds * 1000);
          } else {
            if (typeof window !== 'undefined' && 'Notification' in window && window.Notification) {
              new window.Notification(template.title, { body: template.body, icon: '/icon.png' });
            }
          }
        }
      });
    } else {
      // Direct notification fallback
      if (delaySeconds > 0) {
        setTestDelay(true);
        setTimeout(() => {
          if (typeof window !== 'undefined' && 'Notification' in window && window.Notification) {
            new window.Notification(template.title, { body: template.body, icon: '/icon.png' });
          }
          setTestDelay(false);
        }, delaySeconds * 1000);
      } else {
        if (typeof window !== 'undefined' && 'Notification' in window && window.Notification) {
          new window.Notification(template.title, { body: template.body, icon: '/icon.png' });
        }
      }
    }
  };


  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(redeemAmount);
    if (!isNaN(amount) && amount > 0 && amount <= stats.balance) {
      const success = await redeemCoins(amount, redeemConcept || 'Retiro general');
      if (success) {
        setShowRedeem(false);
        setRedeemAmount('');
        setRedeemConcept('');
      }
    }
  };

  const chartData = useMemo(() => {
    const data = [];
    const now = new Date();
    
    const earnTx = transactions.filter(tx => tx.type === 'earn');
    
    for (let i = 29; i >= 0; i--) {
      const d = startOfDay(subDays(now, i));
      const nextD = startOfDay(subDays(now, i - 1));
      
      const dayCompletions = earnTx.filter(tx => tx.date >= d.getTime() && tx.date < nextD.getTime()).length;
      
      data.push({
        name: format(d, 'MMM dd'),
        completions: dayCompletions
      });
    }
    return data;
  }, [transactions]);

  const xpChartData = useMemo(() => {
    const data = [];
    const now = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const d = startOfDay(subDays(now, i));
      const nextD = startOfDay(subDays(now, i - 1));
      
      const dayTransactions = transactions.filter(tx => tx.type === 'earn' && tx.date >= d.getTime() && tx.date < nextD.getTime());
      
      const dayXp = dayTransactions.reduce((acc, tx) => acc + (tx.xp || 0), 0);
      
      data.push({
        name: format(d, 'EEE'), // Short day name e.g., Mon, Tue
        xp: dayXp
      });
    }
    return data;
  }, [transactions]);

  // Derived stats
  const totalQuests = (stats.completedQuests || 0) + (stats.failedQuests || 0);
  const successRate = totalQuests > 0 ? ((stats.completedQuests || 0) / totalQuests) * 100 : 0;
  
  const ratioData = [
    { name: 'Completed', value: stats.completedQuests || 0, color: '#22d3ee' },
    { name: 'Failed', value: stats.failedQuests || 0, color: '#f43f5e' }
  ];

  let cumulativeXp = 0;
  for (let i = 1; i < stats.level; i++) {
    cumulativeXp += calculateRequiredXp(i);
  }
  cumulativeXp += stats.xp;

  const badges = [];
  if (stats.level >= 1) badges.push('Initiate');
  if (stats.level >= 5) badges.push('Adept');
  if (stats.level >= 10) badges.push('Master');
  if ((stats.completedQuests || 0) > 0) badges.push('First Blood');
  if ((stats.completedQuests || 0) >= 10) badges.push('Vanguard');
  if ((stats.completedQuests || 0) >= 50) badges.push('Veteran');
  if ((stats.completedQuests || 0) >= 100) badges.push('Centurion');
  if ((stats.streak || 0) >= 3) badges.push('Streak Rookie');
  if ((stats.streak || 0) >= 7) badges.push('Streak Master');
  if ((stats.balance || 0) >= 100) badges.push('Fort Knox');

  const renderAvatar = () => {
    const activeAvatar = stats.avatar || 'default';
    
    if (activeAvatar === 'default') {
      if (user?.photoURL) {
        return (
          <img 
            src={user.photoURL} 
            alt="Profile" 
            className="w-full h-full object-cover relative z-10" 
            referrerPolicy="no-referrer" 
          />
        );
      }
      return (
        <span className="text-xs font-black tracking-widest text-[var(--accent-primary-light)] relative z-10 font-mono">
          {user?.displayName ? user.displayName.substring(0, 2).toUpperCase() : 'OP'}
        </span>
      );
    }
    
    const AvatarIcon = {
      skull: Skull,
      ghost: Ghost,
      star: Star,
      shield: Shield,
      crown: Crown,
      award: Award,
    }[activeAvatar as 'skull' | 'ghost' | 'star' | 'shield' | 'crown' | 'award'] || User;

    return <AvatarIcon className="w-5 h-5" />;
  };

  return (
    <div className="pb-24 pt-2 flex flex-col gap-4">
      <div className="flex justify-between items-center bg-[var(--bg-panel)] p-3 border border-[var(--border-subtle)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[var(--bg-base)] border border-[var(--accent-primary)]/50 flex items-center justify-center text-[var(--accent-primary-light)] relative overflow-hidden">
            {renderAvatar()}
          </div>
          <div className="flex flex-col">
            <h2 className="text-[11px] font-bold tracking-widest text-slate-200 uppercase">Operative {stats.level}</h2>
            <span className="text-[9px] text-[var(--accent-primary-light)] uppercase font-mono">{stats.theme || 'cyberpunk'} protocol</span>
          </div>
        </div>
        <button
          onClick={() => signOut(auth)}
          className="text-[9px] text-rose-500 hover:text-rose-400 uppercase tracking-widest font-bold border border-rose-500/30 px-2 py-1 bg-rose-500/10"
        >
          Disconnect
        </button>
      </div>
      

      {/* TABS */}
      <div className="flex border-b border-[var(--border-subtle)] mb-2">
        <button 
          onClick={() => setActiveTab('overview')}
          className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest transition-colors ${activeTab === 'overview' ? 'text-[var(--accent-primary-light)] border-b-2 border-[var(--accent-primary-light)] bg-[var(--accent-primary)]/5' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
        >
          Overview
        </button>
        <button 
          onClick={() => setActiveTab('achievements')}
          className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest transition-colors ${activeTab === 'achievements' ? 'text-[var(--accent-primary-light)] border-b-2 border-[var(--accent-primary-light)] bg-[var(--accent-primary)]/5' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
        >
          Achievements
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest transition-colors ${activeTab === 'history' ? 'text-[var(--accent-primary-light)] border-b-2 border-[var(--accent-primary-light)] bg-[var(--accent-primary)]/5' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
        >
          History
        </button>
      </div>

      {activeTab === 'overview' && (
        <>

      {/* STATS BOARD */}
      <div className="bg-gradient-to-br from-[#1A1A24] to-[#0D0D12] border border-cyan-900/50 p-4 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[11px] font-bold tracking-widest text-[var(--accent-primary-light)] uppercase">Biometric Overview</h2>
          <span className="text-[10px] font-bold tracking-widest text-white uppercase bg-cyan-900/50 px-2 py-0.5 border border-[var(--accent-primary)]/30">
            Level {stats.level}
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-[var(--bg-panel)] p-2 border border-[var(--accent-primary)]/20">
            <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest flex items-center">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full mr-1.5"></span>
              Balance
            </p>
            <p className="text-xl font-mono text-emerald-400">${stats.balance.toFixed(2)}</p>
          </div>
          <div className="bg-[var(--bg-panel)] p-2 border border-[var(--accent-secondary)]/20">
            <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest flex items-center">
              <Zap className="w-3 h-3 text-[var(--accent-secondary-light)] mr-1" />
              Multiplier
            </p>
            <p className="text-xl font-mono text-[var(--accent-secondary-light)]">x{stats.multiplier.toFixed(2)}</p>
          </div>
          <div className="bg-[var(--bg-panel)] p-2 border border-orange-500/20">
            <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest flex items-center">
              <span className="w-1.5 h-1.5 bg-orange-400 rounded-full mr-1.5 animate-pulse"></span>
              Active Streak
            </p>
            <p className="text-xl font-mono text-orange-400">{stats.streak} Days</p>
          </div>
          <div className="bg-[var(--bg-panel)] p-2 border border-blue-500/20">
            <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest flex items-center">
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-1.5"></span>
              Total XP
            </p>
            <p className="text-xl font-mono text-blue-400">{cumulativeXp}</p>
          </div>
        </div>

        <div className="flex gap-4 mb-4 items-center bg-[var(--bg-panel)] p-3 border border-[var(--border-subtle)]">
          <div className="w-24 h-24 shrink-0 relative">
            {totalQuests > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={ratioData}
                    cx="50%"
                    cy="50%"
                    innerRadius={25}
                    outerRadius={40}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {ratioData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1A1A24', border: '1px solid #2D2D3F', borderRadius: '4px' }}
                    itemStyle={{ fontFamily: 'monospace', fontSize: 10 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[9px] text-slate-600 font-mono text-center">NO DATA</div>
            )}
            {totalQuests > 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-[10px] font-bold font-mono text-slate-300">{Math.round(successRate)}%</span>
              </div>
            )}
          </div>
          
          <div className="flex-1 flex flex-col justify-center gap-2">
            <div>
              <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Missions Done</p>
              <p className="text-lg font-mono text-[var(--accent-primary-light)]">{stats.completedQuests}</p>
            </div>
            <div>
              <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Failures</p>
              <p className="text-lg font-mono text-rose-500">{stats.failedQuests}</p>
            </div>
          </div>
        </div>

        <div className="mb-4 bg-[var(--bg-panel)] p-3 border border-[var(--border-subtle)]">
          <h3 className="text-[9px] font-bold tracking-widest text-slate-400 uppercase mb-2">7-Day XP Progression</h3>
          <div className="h-32 w-full">
            {xpChartData.every(d => d.xp === 0) ? (
              <div className="w-full h-full flex items-center justify-center text-[9px] text-slate-600 font-mono text-center border border-dashed border-[var(--border-subtle)]">NO XP IN LAST 7 DAYS</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={xpChartData}>
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: '#64748b', fontSize: 8, fontFamily: 'monospace' }} 
                    axisLine={{ stroke: '#2D2D3F' }}
                    tickLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1A1A24', border: '1px solid #2D2D3F', borderRadius: '4px' }}
                    labelStyle={{ color: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}
                    itemStyle={{ color: '#60a5fa', fontSize: 10, fontFamily: 'monospace' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="xp" 
                    stroke="#60a5fa" 
                    strokeWidth={2}
                    dot={{ fill: '#1A1A24', stroke: '#60a5fa', strokeWidth: 2, r: 3 }}
                    activeDot={{ r: 5, fill: '#60a5fa' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-[9px] font-bold tracking-widest text-slate-400 uppercase">Operative Attributes</h3>
            {stats.statPoints !== undefined && stats.statPoints > 0 && (
              <span className="text-[9px] font-bold text-fuchsia-400 animate-pulse uppercase tracking-widest bg-fuchsia-900/30 px-2 py-0.5 border border-fuchsia-500/30">
                {stats.statPoints} Pts Available
              </span>
            )}
          </div>
          <div className="space-y-2">
            {SKILLS_CONFIG.map(skill => {
              const SIcon = skill.icon;
              const skillValue = stats.skills?.[skill.id] || 0;
              const skillXp = stats.skillXp?.[skill.id] || 0;
              const xpProgress = Math.min((skillXp % 100), 100);
              return (
                <div key={skill.id} className="bg-[var(--bg-panel)] border border-white/5 p-2 flex items-center justify-between group">
                  <div className="flex items-center gap-3 w-1/3">
                    <div className={`w-6 h-6 rounded flex items-center justify-center bg-black/40 border ${skill.border}`}>
                      <SIcon className={`w-3 h-3 ${skill.color}`} />
                    </div>
                    <div>
                      <div className={`text-[10px] font-bold uppercase tracking-widest ${skill.color}`}>{skill.name}</div>
                      <div className="text-[9px] text-slate-500 font-mono">LVL {skillValue}</div>
                    </div>
                  </div>
                  
                  <div className="flex-1 px-4 relative flex items-center">
                    <div className="w-full h-1.5 bg-black/60 rounded-full overflow-hidden border border-white/5">
                      <div className={`h-full ${skill.bg} shadow-[0_0_8px_currentColor]`} style={{ width: `${xpProgress}%` }}></div>
                    </div>
                  </div>

                  <button
                    onClick={() => allocateStatPoint(skill.id)}
                    disabled={!stats.statPoints || stats.statPoints <= 0}
                    className="w-7 h-7 flex items-center justify-center bg-[var(--border-subtle)] border border-[var(--border-strong)] text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-fuchsia-900/40 hover:text-fuchsia-400 hover:border-fuchsia-500/50 transition-colors"
                  >
                    +
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mb-2">
          <h3 className="text-[9px] font-bold tracking-widest text-[var(--accent-primary)] uppercase mb-2">Acquired Badges</h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {badges.map((badgeName, idx) => {
              const badgeDef = BADGE_DEFINITIONS[badgeName];
              if (!badgeDef) return null;
              const Icon = badgeDef.icon;
              return (
                <div key={idx} className={`relative flex flex-col items-center justify-center p-3 border bg-gradient-to-b ${badgeDef.bgClass} ${badgeDef.glowClass} overflow-hidden group`}>
                  <div className="absolute top-0 right-0 w-8 h-8 bg-white/5 rotate-45 transform translate-x-4 -translate-y-4"></div>
                  <div className="absolute bottom-0 left-0 w-8 h-8 bg-black/20 rotate-45 transform -translate-x-4 translate-y-4"></div>
                  <Icon className={`w-6 h-6 mb-2 ${badgeDef.colorClass} drop-shadow-lg group-hover:scale-110 transition-transform`} strokeWidth={1.5} />
                  <span className={`text-[8px] font-bold uppercase tracking-widest text-center ${badgeDef.colorClass}`}>
                    {badgeDef.name}
                  </span>
                  <span className="text-[6.5px] text-slate-400 text-center uppercase tracking-wide mt-0.5 max-w-full leading-tight px-1 opacity-80" title={badgeDef.description}>
                    {badgeDef.description}
                  </span>
                </div>
              );
            })}
            {badges.length === 0 && (
               <div className="col-span-full py-6 border border-dashed border-[var(--border-subtle)] flex flex-col items-center justify-center text-slate-500">
                  <Shield className="w-5 h-5 mb-2 opacity-20" />
                  <span className="text-[9px] uppercase tracking-widest font-bold">No Badges Yet</span>
                  <span className="text-[8px] uppercase tracking-wide mt-1">Complete quests to earn</span>
               </div>
            )}
          </div>
        </div>


        
        <button
          onClick={() => setShowLevels(true)}
          className="mt-4 w-full border border-cyan-900/50 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--accent-primary)] hover:bg-cyan-900/20 transition-colors"
        >
          View Level Milestones
        </button>
      </div>

      {/* SYSTEM PREFERENCES */}
      <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] p-4 flex flex-col relative overflow-hidden">
        <h2 className="text-[11px] font-bold tracking-widest text-slate-400 uppercase mb-4 flex items-center justify-between">
          <span className="flex items-center">
            <span className="w-1 h-4 bg-[var(--accent-secondary)] mr-2"></span> SYSTEM PREFERENCES
          </span>
        </h2>
        
        <div className="flex items-center justify-between bg-[var(--bg-base)]/60 border border-[var(--border-subtle)] p-3 mb-2">
          <div className="flex gap-2.5 items-center">
            <div className={`p-1.5 rounded ${stats.soundEnabled !== false ? 'bg-[var(--accent-secondary)]/20 text-[var(--accent-secondary-light)]' : 'bg-[var(--border-subtle)] text-slate-500'}`}>
              <Bell className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-[10px] font-bold text-slate-200 uppercase tracking-wide">Audio Feedback</h4>
              <p className="text-[9px] text-slate-400 leading-relaxed max-w-[200px]">
                System alerts, mission complete tones, and failure feedback.
              </p>
            </div>
          </div>
          
          <button 
            onClick={toggleSound}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border ${
              stats.soundEnabled !== false ? 'border-[var(--accent-secondary)]/50 bg-[var(--accent-secondary-dark)]/20' : 'border-[var(--border-subtle)] bg-[var(--bg-card)]'
            } transition-colors focus:outline-none`}
          >
            <span
              className={`inline-block h-3 w-3 transform rounded-full bg-slate-200 transition-transform ${
                stats.soundEnabled !== false ? 'translate-x-1.5 bg-fuchsia-400' : '-translate-x-1.5'
              }`}
            />
          </button>
        </div>
        <div className="flex items-center justify-between bg-[var(--bg-base)]/60 border border-[var(--border-subtle)] p-3 mb-2">
          <div className="flex gap-2.5 items-center">
            <div className={`p-1.5 rounded ${stats.hapticsEnabled !== false ? 'bg-[var(--accent-secondary)]/20 text-[var(--accent-secondary-light)]' : 'bg-[var(--border-subtle)] text-slate-500'}`}>
              <Zap className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-[10px] font-bold text-slate-200 uppercase tracking-wide">Haptic Feedback</h4>
              <p className="text-[9px] text-slate-400 leading-relaxed max-w-[200px]">
                Tactile vibrations for interactions and mission events.
              </p>
            </div>
          </div>
          
          <button 
            onClick={toggleHaptics}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border ${
              stats.hapticsEnabled !== false ? 'border-[var(--accent-secondary)]/50 bg-[var(--accent-secondary-dark)]/20' : 'border-[var(--border-subtle)] bg-[var(--bg-card)]'
            } transition-colors focus:outline-none`}
          >
            <span
              className={`inline-block h-3 w-3 transform rounded-full bg-slate-200 transition-transform ${
                stats.hapticsEnabled !== false ? 'translate-x-1.5 bg-fuchsia-400' : '-translate-x-1.5'
              }`}
            />
          </button>
        </div>
      </div>

      {/* TRANSMISSION CHANNELS (PUSH NOTIFICATIONS) */}
      <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] p-4 flex flex-col relative overflow-hidden">
        {/* Decorative corner glow */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-[var(--accent-primary)]/5 blur-xl pointer-events-none rounded-full" />
        
        <h2 className="text-[11px] font-bold tracking-widest text-slate-400 uppercase mb-4 flex items-center justify-between">
          <span className="flex items-center">
            <span className="w-1 h-4 bg-[var(--accent-primary)] mr-2"></span> TRANSMISSION CHANNELS
          </span>
          <span className={`text-[9px] font-mono font-bold flex items-center px-1.5 py-0.5 rounded ${
            permission === 'granted' 
              ? 'text-[var(--accent-primary-light)] bg-cyan-950/40 border border-[var(--accent-primary)]/30' 
              : permission === 'denied' 
              ? 'text-rose-500 bg-rose-950/40 border border-rose-500/30' 
              : 'text-amber-500 bg-amber-950/40 border border-amber-500/30'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 animate-pulse ${
              permission === 'granted' ? 'bg-cyan-400' : permission === 'denied' ? 'bg-rose-500' : 'bg-amber-500'
            }`} />
            {permission.toUpperCase()}
          </span>
        </h2>

        {permission !== 'granted' ? (
          <div className="bg-[var(--bg-base)]/60 border border-[var(--border-subtle)] p-3 mb-4">
            <div className="flex gap-2.5 items-start">
              <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-[10px] font-bold text-slate-200 uppercase tracking-wide">Link Status: Offline</h4>
                <p className="text-[9px] text-slate-400 leading-relaxed">
                  {permission === 'denied' 
                    ? 'Transmissions are blocked by your browser. Please reset notification permissions in your browser address bar to allow alerts.'
                    : 'Establish a secure telemetry link to receive real-time alerts before your daily quests expire.'}
                </p>
              </div>
            </div>
            
            {permission !== 'denied' && (
              <button
                onClick={requestNotificationPermission}
                className="mt-3 w-full bg-gradient-to-r from-cyan-500 to-cyan-600 text-[#0d0d12] hover:from-cyan-400 hover:to-cyan-500 py-2 text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Bell className="w-3.5 h-3.5 fill-[#0d0d12]/10" />
                CONNECT TELEMETRY LINK
              </button>
            )}
          </div>
        ) : (
          <div className="bg-[var(--bg-base)]/40 border border-[var(--accent-primary)]/10 p-3 mb-4 rounded">
            <div className="flex gap-2.5 items-start">
              <Bell className="w-4 h-4 text-[var(--accent-primary-light)] shrink-0 mt-0.5 animate-pulse" />
              <div className="space-y-0.5">
                <h4 className="text-[10px] font-bold text-[var(--accent-primary-light)] uppercase tracking-wide">Telemetry Link Active</h4>
                <p className="text-[9px] text-slate-400 leading-relaxed">
                  Real-time push protocol is fully synchronized. Your system will alert you 5 minutes before any active quest deadline.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Simulator block */}
        <div className="border border-[var(--border-subtle)] bg-[var(--bg-base)]/30 p-3 flex flex-col">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1 font-mono">
            <Zap className="w-3 h-3 text-[var(--accent-primary-light)]" />
            TELEMETRY SIMULATOR
          </h3>
          
          <div className="space-y-2.5">
            <div>
              <label className="text-[8px] uppercase font-bold tracking-wider text-slate-500 block mb-1">Select Alert Payload</label>
              <select
                value={selectedTemplate}
                onChange={e => setSelectedTemplate(e.target.value)}
                className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] px-2 py-1.5 text-[10px] font-mono text-slate-300 focus:border-[var(--accent-primary)] focus:outline-none"
              >
                <option value="quest_reminder">🚨 MISSION CRITICAL REMINDER</option>
                <option value="reward_earned">💰 REWARD RECEIVED</option>
                <option value="motivational">⚡ CYBERNETIC INSIGHT</option>
              </select>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => triggerTestNotification(0)}
                disabled={permission !== 'granted'}
                className="flex-1 border border-[var(--border-subtle)] hover:border-[var(--accent-primary)]/50 hover:bg-[var(--accent-primary)]/5 text-slate-300 hover:text-[var(--accent-primary-light)] disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-300 disabled:hover:border-[var(--border-subtle)] py-2 text-[9px] font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-1 cursor-pointer font-mono"
              >
                <Send className="w-3 h-3" />
                SEND INSTANT
              </button>

              <button
                onClick={() => triggerTestNotification(5)}
                disabled={permission !== 'granted' || testDelay}
                className="flex-1 border border-[var(--border-subtle)] hover:border-[var(--accent-primary)]/50 hover:bg-[var(--accent-primary)]/5 text-slate-300 hover:text-[var(--accent-primary-light)] disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-300 disabled:hover:border-[var(--border-subtle)] py-2 text-[9px] font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-1 cursor-pointer font-mono"
              >
                <Clock className="w-3 h-3" />
                {testDelay ? 'DELAY (5S)...' : 'DELAY (5S)'}
              </button>
            </div>

            {testDelay && (
              <div className="text-[8px] text-center text-[var(--accent-primary-light)] font-mono tracking-wider uppercase animate-pulse mt-2">
                TRANSMISSION QUEUED. LOCK YOUR DEVICE OR SWITCH TABS TO TEST BACKGROUND PROTOCOL!
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PERFORMANCE TRENDS */}
      <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] p-4 flex flex-col">
        <h2 className="text-[11px] font-bold tracking-widest text-slate-400 uppercase mb-4 flex items-center">
          <span className="w-1 h-4 bg-orange-500 mr-2"></span> PERFORMANCE TRENDS (30 DAYS)
        </h2>
        <div className="h-40 w-full mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis 
                dataKey="name" 
                tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }} 
                tickLine={false} 
                axisLine={false}
                minTickGap={20}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1A1A24', border: '1px solid #2D2D3F', borderRadius: '4px' }}
                itemStyle={{ color: '#22d3ee', fontFamily: 'monospace', fontSize: 12 }}
                labelStyle={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: 10 }}
              />
              <Line 
                type="step" 
                dataKey="completions" 
                stroke="#22d3ee" 
                strokeWidth={2} 
                dot={false}
                activeDot={{ r: 4, fill: '#22d3ee', stroke: '#0D0D12', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ECONOMY LEDGER */}
      <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] p-4 flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-[11px] font-bold tracking-widest text-slate-400 flex items-center">
            <span className="w-1 h-4 bg-emerald-500 mr-2"></span> TRANSACTION HISTORY
          </h2>
          <span className="text-[10px] text-emerald-400 font-mono font-bold">${stats.balance.toFixed(2)} LQ</span>
        </div>
        
        <div className={`space-y-0 text-[10px] font-mono flex-1 pr-1 ${showAllTransactions ? 'max-h-64 overflow-y-auto' : 'overflow-hidden'}`}>
          {transactions.length === 0 ? (
            <div className="text-slate-600 text-center py-4 border-b border-white/5 uppercase">No records found</div>
          ) : (
            (showAllTransactions ? transactions : transactions.slice(0, 5)).map(tx => (
              <div key={tx.id} className="flex justify-between py-2 border-b border-white/5 items-center">
                <span className={`w-16 uppercase font-bold ${tx.type === 'earn' ? 'text-emerald-400' : tx.type === 'spend' ? 'text-[var(--accent-secondary)]' : 'text-rose-500'}`}>
                  [{tx.type === 'earn' ? 'RWD' : tx.type === 'spend' ? 'SPND' : 'FAIL'}]
                </span>
                <span className="flex-1 mx-2 text-slate-400 truncate">{tx.concept}</span>
                <span className={`font-bold ${tx.type === 'earn' ? 'text-emerald-400' : tx.type === 'spend' ? 'text-[var(--accent-secondary)]' : 'text-rose-500'}`}>
                  {tx.amount > 0 ? '+' : ''}{tx.amount.toFixed(2)}
                </span>
              </div>
            ))
          )}
        </div>
        
        {transactions.length > 5 && (
          <button
            onClick={() => setShowAllTransactions(!showAllTransactions)}
            className="mt-2 w-full py-1.5 text-[9px] font-bold uppercase tracking-widest text-slate-500 hover:text-slate-300 transition-colors"
          >
            {showAllTransactions ? 'Show Less' : `View All (${transactions.length})`}
          </button>
        )}

        <button 
          onClick={() => setShowRedeem(true)}
          className="mt-4 w-full bg-[var(--border-subtle)] py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-[var(--border-strong)] text-white transition-colors"
        >
          New Redemption
        </button>
      </div>
        </>
      )}

      {activeTab === 'achievements' && (
        <div className="space-y-4 flex flex-col flex-1">
          {/* Achievements Sync Status */}
          <div className="bg-gradient-to-br from-[#1A1A24] to-[#0D0D12] border border-cyan-900/50 p-4 flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-cyan-500/5 rounded-full blur-xl animate-pulse"></div>
            <div className="flex justify-between items-center mb-3 relative z-10">
              <div>
                <h3 className="text-xs font-black tracking-widest text-white uppercase font-sans">
                  ACHIEVEMENTS SYSTEM
                </h3>
                <p className="text-[9px] text-[var(--accent-primary-light)] font-mono uppercase tracking-wider">
                  Biometric Badge Status
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-white bg-cyan-500/20 px-2 py-0.5 border border-cyan-500/30 font-mono">
                  {badges.length} / {Object.keys(BADGE_DEFINITIONS).length} SECURED
                </span>
              </div>
            </div>

            {/* Total Completion Progress Bar */}
            <div className="space-y-1 relative z-10">
              <div className="flex justify-between text-[8px] font-mono text-slate-400 uppercase tracking-wider">
                <span>Core Synchronization</span>
                <span>{Math.round((badges.length / Object.keys(BADGE_DEFINITIONS).length) * 100)}%</span>
              </div>
              <div className="w-full h-1.5 bg-black/60 rounded-full overflow-hidden border border-white/5">
                <div 
                  className="h-full bg-gradient-to-r from-cyan-500 to-fuchsia-500 shadow-[0_0_8px_rgba(6,182,212,0.5)] transition-all duration-500" 
                  style={{ width: `${(badges.length / Object.keys(BADGE_DEFINITIONS).length) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* BADGES GRID */}
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(BADGE_DEFINITIONS).map(([badgeId, badgeDef]) => {
              const isUnlocked = badges.includes(badgeId);
              const Icon = badgeDef.icon;
              
              // Dynamic progress calculating logic for each badge
              let currentVal = 0;
              let targetVal = 1;
              let progressLabel = '';
              let showProgressBar = true;

              switch (badgeId) {
                case 'Initiate':
                  currentVal = stats.level;
                  targetVal = 1;
                  progressLabel = `Level ${stats.level} / 1`;
                  showProgressBar = false;
                  break;
                case 'Adept':
                  currentVal = stats.level;
                  targetVal = 5;
                  progressLabel = `Level ${stats.level} / 5`;
                  break;
                case 'Master':
                  currentVal = stats.level;
                  targetVal = 10;
                  progressLabel = `Level ${stats.level} / 10`;
                  break;
                case 'First Blood':
                  currentVal = stats.completedQuests || 0;
                  targetVal = 1;
                  progressLabel = `${stats.completedQuests || 0} / 1 Quest`;
                  showProgressBar = false;
                  break;
                case 'Vanguard':
                  currentVal = stats.completedQuests || 0;
                  targetVal = 10;
                  progressLabel = `${stats.completedQuests || 0} / 10 Quests`;
                  break;
                case 'Veteran':
                  currentVal = stats.completedQuests || 0;
                  targetVal = 50;
                  progressLabel = `${stats.completedQuests || 0} / 50 Quests`;
                  break;
                case 'Centurion':
                  currentVal = stats.completedQuests || 0;
                  targetVal = 100;
                  progressLabel = `${stats.completedQuests || 0} / 100 Quests`;
                  break;
                case 'Streak Rookie':
                  currentVal = stats.streak || 0;
                  targetVal = 3;
                  progressLabel = `${stats.streak || 0} / 3 Day Streak`;
                  break;
                case 'Streak Master':
                  currentVal = stats.streak || 0;
                  targetVal = 7;
                  progressLabel = `${stats.streak || 0} / 7 Day Streak`;
                  break;
                case 'Fort Knox':
                  currentVal = Math.floor(stats.balance || 0);
                  targetVal = 100;
                  progressLabel = `${currentVal} / 100 LQ Coins`;
                  break;
                default:
                  showProgressBar = false;
              }

              const progressPct = Math.min(100, Math.round((currentVal / targetVal) * 100));

              return (
                <div 
                  key={badgeId} 
                  className={`relative flex flex-col p-3 border transition-all duration-300 overflow-hidden group ${
                    isUnlocked 
                      ? `bg-gradient-to-b ${badgeDef.bgClass} ${badgeDef.glowClass} border-cyan-500/20` 
                      : 'bg-[#15151e]/40 border-slate-800/60 opacity-60'
                  }`}
                >
                  {/* Decorative background stripes */}
                  <div className="absolute top-0 right-0 w-8 h-8 bg-white/5 rotate-45 transform translate-x-4 -translate-y-4"></div>
                  
                  <div className="flex items-start gap-2.5 mb-2 relative z-10">
                    <div className={`p-2 rounded-lg shrink-0 ${
                      isUnlocked 
                        ? 'bg-black/40 border border-white/5' 
                        : 'bg-black/20 border border-white/5'
                    }`}>
                      {isUnlocked ? (
                        <Icon className={`w-5 h-5 ${badgeDef.colorClass} drop-shadow-lg group-hover:scale-110 transition-transform`} strokeWidth={1.5} />
                      ) : (
                        <Lock className="w-5 h-5 text-slate-600" strokeWidth={1.5} />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className={`text-[10px] font-black uppercase tracking-wider truncate ${
                          isUnlocked ? 'text-white' : 'text-slate-500'
                        }`}>
                          {badgeDef.name}
                        </span>
                        {isUnlocked && (
                          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse shrink-0"></span>
                        )}
                      </div>
                      <p className={`text-[8.5px] font-mono tracking-wide mt-0.5 uppercase truncate ${
                        isUnlocked ? 'text-slate-400' : 'text-slate-600 font-normal'
                      }`}>
                        {badgeDef.description}
                      </p>
                    </div>
                  </div>

                  {/* Unlock Progress inside Badge Card */}
                  <div className="mt-auto pt-2 border-t border-white/5 relative z-10">
                    <div className="flex justify-between items-center text-[7.5px] font-mono tracking-wider">
                      <span className={isUnlocked ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                        {isUnlocked ? 'SYSTEM UNLOCKED' : 'LOCKED'}
                      </span>
                      <span className={isUnlocked ? 'text-slate-400' : 'text-slate-500 font-bold'}>
                        {isUnlocked ? '100%' : `${progressPct}%`}
                      </span>
                    </div>

                    {!isUnlocked && showProgressBar && (
                      <div className="mt-1 space-y-1">
                        <div className="w-full h-1 bg-black/50 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-slate-700 transition-all duration-300" 
                            style={{ width: `${progressPct}%` }}
                          ></div>
                        </div>
                        <div className="text-[6.5px] text-right font-mono text-slate-500 uppercase tracking-widest">
                          {progressLabel}
                        </div>
                      </div>
                    )}
                    
                    {isUnlocked && (
                      <div className="text-[6.5px] text-right font-mono text-emerald-500 uppercase tracking-widest font-bold mt-1">
                        SECURED
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] p-4 flex flex-col flex-1">
          <h2 className="text-[11px] font-bold tracking-widest text-slate-300 uppercase mb-4 flex items-center">
             <span className="w-1.5 h-1.5 bg-emerald-500 mr-2"></span>
             Mission History
          </h2>
          <div className="flex-1 space-y-0">
            {quests.filter(q => q.status === 'completed').length === 0 ? (
               <div className="text-slate-600 text-center py-8 border-b border-white/5 uppercase text-[9px] tracking-widest font-bold">No missions completed yet</div>
            ) : (
               quests.filter(q => q.status === 'completed').sort((a,b) => b.createdAt - a.createdAt).map(q => (
                 <div key={q.id} className="mb-3 border-b border-white/5 pb-3">
                   <div className="flex justify-between items-start mb-1">
                     <span className="text-xs font-bold text-slate-200 uppercase tracking-widest">{q.title}</span>
                     <span className="text-[9px] text-slate-500 font-mono">{format(new Date(q.createdAt), 'MMM dd, HH:mm')}</span>
                   </div>
                   <div className="flex gap-4">
                     <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest">+{q.reward?.coins?.toFixed(2) || '0.00'} LQ</span>
                     <span className="text-[9px] font-bold text-[var(--accent-secondary-light)] uppercase tracking-widest">+{q.reward?.xp || 0} XP</span>
                   </div>
                 </div>
               ))
            )}
          </div>
        </div>
      )}

      {/* Redeem Modal */}
      <AnimatePresence>
        {showRedeem && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[var(--bg-base)]/90 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="w-full max-w-sm bg-[var(--bg-panel)] border border-[var(--border-subtle)] p-6 shadow-2xl"
            >
              <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--accent-secondary-light)] mb-4 flex items-center">
                <span className="w-2 h-2 bg-[var(--accent-secondary)] mr-2"></span> AUTHORIZE REDEMPTION
              </h3>

              <form onSubmit={handleRedeem} className="space-y-4">
                <div>
                  <label className="text-[9px] uppercase font-bold tracking-widest text-slate-500 mb-1 block">Description</label>
                  <input 
                    type="text" required
                    value={redeemConcept} onChange={e => setRedeemConcept(e.target.value)}
                    className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] px-3 py-2 text-sm text-white focus:border-[var(--accent-secondary)] focus:outline-none font-mono"
                    placeholder="e.g. Sushi Dinner"
                  />
                </div>
                <div>
                  <label className="text-[9px] uppercase font-bold tracking-widest text-slate-500 mb-1 block">Cost ($LQ)</label>
                  <input 
                    type="number" step="0.01" min="0.01" max={stats.balance} required
                    value={redeemAmount} onChange={e => setRedeemAmount(e.target.value)}
                    className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] px-3 py-2 text-sm text-[var(--accent-secondary-light)] font-mono focus:border-[var(--accent-secondary)] focus:outline-none"
                    placeholder="0.00"
                  />
                  <p className="text-[9px] text-slate-600 mt-1 uppercase text-right">Available: {stats.balance.toFixed(2)}</p>
                </div>

                <div className="flex gap-2 mt-6">
                  <button 
                    type="button" onClick={() => setShowRedeem(false)}
                    className="flex-1 py-2 bg-[var(--border-subtle)] text-slate-300 text-[10px] font-bold uppercase tracking-widest hover:bg-[var(--border-strong)] transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={!redeemAmount || parseFloat(redeemAmount) <= 0 || parseFloat(redeemAmount) > stats.balance}
                    className="flex-1 py-2 bg-fuchsia-600 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-[var(--accent-secondary)] transition-colors disabled:opacity-50"
                  >
                    Authorize
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
        {showLevels && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[var(--bg-base)]/90 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="w-full max-w-sm bg-[var(--bg-panel)] border border-[var(--border-subtle)] p-6 shadow-2xl flex flex-col max-h-[80vh]"
            >
              <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--accent-primary-light)] mb-4 flex items-center">
                <span className="w-2 h-2 bg-[var(--accent-primary)] mr-2"></span> LEVEL MILESTONES
              </h3>
              
              <div className="flex-1 overflow-y-auto pr-2 space-y-2 mb-6">
                <p className="text-[10px] text-slate-400 mb-4 leading-relaxed">
                  Levels are infinite. Each level increases your base coin reward by 5%. Achieve higher levels to earn faster.
                </p>
                <div className="flex justify-between text-[9px] uppercase font-bold tracking-widest text-slate-500 border-b border-white/5 pb-2 mb-2">
                  <span>Level</span>
                  <span>Coin Bonus</span>
                </div>
                {Array.from({ length: 50 }).map((_, i) => {
                  const level = i + 1;
                  const bonus = (1 + (level * 0.05)).toFixed(2);
                  const isCurrent = level === stats.level;
                  return (
                    <div key={level} className={`flex justify-between py-1.5 text-xs font-mono border-b border-white/5 ${isCurrent ? 'text-[var(--accent-primary-light)] bg-cyan-900/20 px-2' : 'text-slate-300'}`}>
                      <span>LVL {level} {isCurrent && '(CURRENT)'}</span>
                      <span>{bonus}x</span>
                    </div>
                  );
                })}
              </div>

              <button 
                onClick={() => setShowLevels(false)}
                className="w-full py-2 bg-[var(--border-subtle)] text-slate-300 text-[10px] font-bold uppercase tracking-widest hover:bg-[var(--border-strong)] transition-colors"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
