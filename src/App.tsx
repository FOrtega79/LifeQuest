import React, { useState, useEffect } from 'react';
import { GameProvider, useGame } from './context/GameContext';
import { Joyride, STATUS } from 'react-joyride';
import { ToastProvider } from './context/ToastContext';
import { SplashScreen } from './components/SplashScreen';
import { QuestsScreen } from './screens/QuestsScreen';
import { CreateQuestScreen } from './screens/CreateQuestScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { StoreScreen } from './screens/StoreScreen';
import { LoginScreen } from './screens/LoginScreen';
import { DailyLoginModal } from './components/DailyLoginModal';
import { MobileShortcutModal } from './components/MobileShortcutModal';
import { auth } from './lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { motion, AnimatePresence } from 'motion/react';
import { vibrate, haptics } from './lib/utils';
import { calculateRequiredXp } from './lib/gameLogic';
import { Coins, Zap, Flame, User as UserIcon, Skull, Ghost, Star, Shield, Crown, Award } from 'lucide-react';
import { isSameDay, isYesterday } from 'date-fns';

type Tab = 'quests' | 'create' | 'store' | 'profile' | 'debug';

function AppContent() {
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('quests');
  const { stats, loading, quests } = useGame();
  const [user, authLoading] = useAuthState(auth);
  const [isXpGaining, setIsXpGaining] = useState(false);
  const prevXpRef = React.useRef(stats?.xp || 0);

  // Check for XP and level gain
  React.useEffect(() => {
    if (!stats) return;
    
    if (stats.xp > prevXpRef.current) {
      setIsXpGaining(true);
      const timer = setTimeout(() => setIsXpGaining(false), 1500);
      prevXpRef.current = stats.xp;
      return () => clearTimeout(timer);
    } else if (stats.xp < prevXpRef.current) {
      // In case XP resets or something
      prevXpRef.current = stats.xp;
    }
  }, [stats?.xp]);

  // Register service worker for push notifications
  React.useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => {
          console.log('Service Worker registered successfully with scope:', reg.scope);
        })
        .catch((err) => {
          console.error('Service Worker registration failed:', err);
        });
    }
    if (typeof window !== 'undefined' && 'Notification' in window && window.Notification && window.Notification.permission !== 'granted' && window.Notification.permission !== 'denied') {
      window.Notification.requestPermission();
    }
  }, []);

  // Schedule 6 PM push notification if there are pending recurring quests
  React.useEffect(() => {
    if (!quests) return;
    
    const now = new Date();
    const target = new Date();
    target.setHours(18, 0, 0, 0);

    const hasPendingRecurring = quests.some(q => q.status === 'active' && q.recurrence && q.recurrence !== 'none');

    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      if (hasPendingRecurring && now.getTime() < target.getTime()) {
        const delay = target.getTime() - now.getTime();
        navigator.serviceWorker.controller.postMessage({
          type: 'TRIGGER_NOTIFICATION',
          id: 'daily_6pm_reminder',
          title: 'Daily Missions Pending',
          body: 'You have unfinished recurring missions! Log in before the day ends to maintain your streak.',
          delay: delay,
          icon: '/icon.png'
        });
      } else {
        // Cancel notification if quests are completed or time has passed
        navigator.serviceWorker.controller.postMessage({
          type: 'CANCEL_NOTIFICATION',
          id: 'daily_6pm_reminder'
        });
      }
    }
  }, [quests]);

  React.useEffect(() => {
    if (stats.theme) {
      document.documentElement.setAttribute('data-theme', stats.theme);
    } else {
      document.documentElement.setAttribute('data-theme', 'cyberpunk');
    }
  }, [stats.theme]);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    haptics.tap();
  };

  const requiredXp = calculateRequiredXp(stats.level);
  const xpPercent = Math.min(100, Math.max(0, (stats.xp / requiredXp) * 100));

  // Calculate display streak
  let displayStreak = stats.streak || 0;
  if (stats.lastActiveDate) {
    const now = Date.now();
    if (!isSameDay(stats.lastActiveDate, now) && !isYesterday(stats.lastActiveDate)) {
      displayStreak = 0;
    }
  }
  const isMilestone = [3, 7, 10, 15, 21, 30, 100].includes(displayStreak);

  // Render Avatar based on selected option
  // --- TOUR STATE ---
  const [{ run, steps }, setTourState] = useState({
    run: false,
    steps: [
      {
        target: '#tour-xp-bar',
        content: 'This is your XP Bar. Complete missions to gain XP and level up!',
        disableBeacon: true,
      },
      {
        target: '#tour-create-tab',
        content: 'Deploy new missions here. Build your daily routines and tasks.',
      },
      {
        target: '#tour-store-tab',
        content: 'Spend your hard-earned LQ coins in the Store to unlock cosmetics and themes!',
      }
    ]
  });

  useEffect(() => {
    // Only run the tour once if the user has stats and hasn't seen the tour yet
    // For this example, we'll run it if the user is level 1 and has no completed quests
    if (user && stats && stats.level === 1 && (stats.completedQuests || 0) === 0) {
      const hasSeenTour = localStorage.getItem('lifequest_has_seen_tour');
      if (!hasSeenTour) {
        setTourState(prev => ({ ...prev, run: true }));
      }
    }
  }, [user, stats]);

  const handleJoyrideCallback = (data: any) => {
    const { status } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];
    
    if (finishedStatuses.includes(status)) {
      setTourState(prev => ({ ...prev, run: false }));
      localStorage.setItem('lifequest_has_seen_tour', 'true');
    }
  };
  // --- END TOUR STATE ---


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
    }[activeAvatar as 'skull' | 'ghost' | 'star' | 'shield' | 'crown' | 'award'] || UserIcon;

    return <AvatarIcon className="w-5 h-5 text-[var(--accent-primary-light)] relative z-10" />;
  };

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  if (authLoading || loading) {
    return <div className="h-[100dvh] bg-[var(--bg-base)] flex items-center justify-center"><div className="w-8 h-8 border-2 border-[var(--accent-primary)]/20 border-t-cyan-500 rounded-full animate-spin"></div></div>;
  }

  if (!user) {
    return <LoginScreen />;
  }


  return (
    <div className="h-[100dvh] bg-[var(--bg-base)] flex justify-center selection:bg-[var(--accent-primary)]/30 overflow-hidden">
      <Joyride
        onEvent={handleJoyrideCallback}
        continuous
        run={run}
        scrollToFirstStep
        steps={steps}
        options={{
          buttons: ['back', 'skip', 'primary'],
          showProgress: true,
          primaryColor: '#d946ef',
          backgroundColor: '#1A1A24',
          textColor: '#f1f5f9',
          overlayColor: 'rgba(0, 0, 0, 0.7)',
        }}
                styles={{
          floater: {
            backgroundColor: '#1A1A24',
          },
          tooltip: {
            backgroundColor: '#1A1A24',
            color: '#f1f5f9',
            borderRadius: '12px',
            border: '1px solid rgba(217, 70, 239, 0.3)',
            fontFamily: 'monospace',
          },
          buttonPrimary: {
            backgroundColor: '#d946ef',
            borderRadius: '8px',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            fontSize: '10px',
          },
          buttonBack: {
            color: '#94a3b8',
            fontSize: '10px',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          },
          buttonSkip: {
            color: '#64748b',
            fontSize: '10px',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          },
          overlay: {
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
          }
        }}
      />
      <div className="w-full max-w-md bg-[var(--bg-base)] h-full relative flex flex-col font-sans border-x border-[var(--bg-card)]">
        <DailyLoginModal />
        <MobileShortcutModal />
        
        {/* TOP BAR: PLAYER STATS */}
        <header 
          className="h-16 bg-[var(--bg-panel)] flex flex-col justify-between shrink-0 z-10 relative cursor-pointer hover:bg-[var(--bg-card)] transition-colors"
          onClick={() => handleTabChange('profile')}
        >
          <div className="flex items-center justify-between px-4 h-full">
            <div className="flex items-center space-x-3">
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full border border-[var(--accent-primary)]/30 flex items-center justify-center relative overflow-hidden shrink-0 animate-breathe group hover:border-[var(--accent-primary-light)]/50 transition-colors">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-transparent"></div>
                {renderAvatar()}
              </div>

              <div className="flex flex-col">
                {/* Name and Level badge */}
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-100 truncate max-w-[100px] sm:max-w-[130px]">
                    {user.displayName ? user.displayName.split(' ')[0] : 'Operator'}
                  </span>
                  {stats.isPro && (
                    <Crown size={12} className="text-fuchsia-400 fill-fuchsia-400 drop-shadow-[0_0_8px_rgba(217,70,239,0.5)] -ml-1" />
                  )}
                  <span className="text-[10px] font-mono font-bold text-[var(--accent-primary-light)]">
                    LVL {stats.level}
                  </span>
                </div>

                {/* Sub-stats: Streak, Multiplier, XP Text */}
                <div className="flex items-center space-x-3 mt-0.5 text-[10px] font-mono">
                  <div className={`flex items-center relative ${displayStreak > 0 ? 'text-orange-400' : 'text-slate-500'} ${isMilestone ? 'animate-pulse drop-shadow-[0_0_8px_rgba(251,146,60,0.8)] text-orange-300' : ''}`} title="Active Streak">
                    {isMilestone && (
                      <div className="absolute inset-0 bg-orange-500/20 blur-md rounded-full"></div>
                    )}
                    <Flame size={12} className={`mr-1 ${displayStreak > 0 ? 'fill-orange-500/20' : ''} ${isMilestone ? 'fill-orange-400 text-orange-400' : ''}`} />
                    <span className="relative z-10">{displayStreak}</span>
                  </div>
                  <div className="flex items-center text-[var(--accent-secondary-light)]" title="Multiplier">
                    <Zap size={12} className="mr-1 fill-fuchsia-500/10" />
                    x{stats.multiplier.toFixed(2)}
                  </div>
                  <div className="text-slate-500 tracking-tighter" title="Experience">
                    {stats.xp}/{requiredXp} XP
                  </div>
                </div>
              </div>
            </div>

            {/* Right side: Ledger */}
            <div className="flex items-center text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.05)]">
              <Coins size={14} className="mr-1.5" />
              <span className="font-mono font-bold text-sm">${stats.balance.toFixed(2)}</span>
            </div>
          </div>

          {/* XP Bar spanning full width at bottom of header */}
          <div id="tour-xp-bar" className={`w-full h-[3px] bg-[var(--bg-card)] relative ${isXpGaining ? 'overflow-visible' : 'overflow-hidden'}`}>
            <motion.div 
              className={`h-full bg-gradient-to-r from-cyan-500 to-blue-500 relative ${isXpGaining ? 'shadow-[0_0_15px_rgba(34,211,238,1)] brightness-150' : ''}`}
              initial={{ width: 0 }}
              animate={{ width: `${xpPercent}%` }}
              transition={{ duration: 0.8, type: "spring", bounce: 0.2 }}
            >
              <AnimatePresence>
                {isXpGaining && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 1 }}
                    animate={{ opacity: [0, 1, 0], scale: [1, 1.02, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="absolute inset-0 bg-white shadow-[0_0_20px_rgba(255,255,255,0.8)]"
                  />
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </header>

        {/* Main Scrollable Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 pb-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
            >
              {activeTab === 'quests' && <QuestsScreen />}
              {activeTab === 'create' && <CreateQuestScreen onSuccess={() => handleTabChange('quests')} />}
              {activeTab === 'store' && <StoreScreen />}
              {activeTab === 'profile' && <ProfileScreen />}
            </motion.div>
          </AnimatePresence>
        </main>
        {/* Bottom Navigation */}
        <nav className="bg-[var(--bg-card)] border-t border-[var(--border-subtle)] pb-safe z-50 shrink-0">
          <div className="flex justify-around items-center h-16">
            <button
              onClick={() => handleTabChange('quests')}
              className={`flex flex-col items-center justify-center w-full h-full font-bold text-[10px] tracking-widest uppercase transition-colors ${activeTab === 'quests' ? 'text-[var(--accent-primary-light)] border-t-2 border-[var(--accent-primary-light)] bg-[var(--bg-highlight)]' : 'text-slate-500 hover:text-slate-300'}`}
            >
              DASHBOARD
            </button>
            <button
              id="tour-create-tab"
              onClick={() => handleTabChange('create')}
              className={`flex flex-col items-center justify-center w-full h-full font-bold text-[10px] tracking-widest uppercase transition-colors ${activeTab === 'create' ? 'text-[var(--accent-secondary-light)] border-t-2 border-fuchsia-400 bg-[var(--bg-highlight)]' : 'text-slate-500 hover:text-slate-300'}`}
            >
              DEPLOY
            </button>
            <button
              id="tour-store-tab"
              onClick={() => handleTabChange('store')}
              className={`flex flex-col items-center justify-center w-full h-full font-bold text-[10px] tracking-widest uppercase transition-colors ${activeTab === 'store' ? 'text-[var(--accent-primary)] border-t-2 border-[var(--accent-primary)] bg-[var(--bg-highlight)]' : 'text-slate-500 hover:text-slate-300'}`}
            >
              STORE
            </button>
            <button
              onClick={() => handleTabChange('profile')}
              className={`flex flex-col items-center justify-center w-full h-full font-bold text-[10px] tracking-widest uppercase transition-colors ${activeTab === 'profile' ? 'text-indigo-400 border-t-2 border-indigo-400 bg-[var(--bg-highlight)]' : 'text-slate-500 hover:text-slate-300'}`}
            >
              PROFILE
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <GameProvider>
        <AppContent />
      </GameProvider>
    </ToastProvider>
  );
}
