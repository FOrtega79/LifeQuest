import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Smartphone, Share, PlusSquare, MoreVertical, X, Sparkles, Check, ArrowDown, HelpCircle } from 'lucide-react';
import { vibrate, haptics } from '../lib/utils';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function MobileShortcutModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [deviceOS, setDeviceOS] = useState<'ios' | 'android' | 'other'>('other');
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if already in standalone display mode (added to home screen)
    const checkStandalone = 
      (window.navigator as any).standalone || 
      window.matchMedia('(display-mode: standalone)').matches;
    
    setIsStandalone(!!checkStandalone);

    // Detect OS
    const ua = navigator.userAgent;
    const isIos = /iPhone|iPad|iPod/i.test(ua);
    const isAnd = /Android/i.test(ua);
    
    if (isIos) {
      setDeviceOS('ios');
    } else if (isAnd) {
      setDeviceOS('android');
    } else {
      setDeviceOS('other');
    }

    // Is it a mobile device?
    const isMobile = isIos || isAnd || /webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua) || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);

    // Listen to beforeinstallprompt event for Android / Chrome PWA support
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Show modal if it's mobile, not already standalone, and hasn't been dismissed/shown yet
    const hasSeenPrompt = localStorage.getItem('lifequest_shortcut_prompt_seen');
    if (isMobile && !checkStandalone && !hasSeenPrompt) {
      const timer = setTimeout(() => {
        setIsOpen(true);
        vibrate([30, 50]);
      }, 4000); // Show shortly after the daily login modal
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    haptics.tap();
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      localStorage.setItem('lifequest_shortcut_prompt_seen', 'true');
      setIsOpen(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    haptics.tap();
    localStorage.setItem('lifequest_shortcut_prompt_seen', 'true');
    setIsOpen(false);
  };

  if (!isOpen || isStandalone) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-[var(--bg-base)]/90 backdrop-blur-md"
      >
        <motion.div
          initial={{ y: 50, scale: 0.95 }}
          animate={{ y: 0, scale: 1 }}
          exit={{ y: 50, opacity: 0 }}
          className="w-full max-w-sm bg-[var(--bg-panel)] border border-[var(--border-subtle)] shadow-[0_0_50px_rgba(217,70,239,0.15)] relative p-6 overflow-hidden flex flex-col"
        >
          {/* Cyan scanner line */}
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-fuchsia-500 to-transparent animate-pulse" />

          {/* Close button */}
          <button 
            onClick={handleDismiss}
            className="absolute top-4 right-4 text-slate-500 hover:text-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-fuchsia-500/20 to-cyan-500/20 rounded flex items-center justify-center border border-[var(--accent-secondary)]/40 shrink-0">
              <Smartphone className="w-5 h-5 text-[var(--accent-secondary-light)] animate-pulse" />
            </div>
            <div>
              <h2 className="text-xs font-black tracking-widest text-white uppercase font-sans">
                WEBAPP DETECTED
              </h2>
              <p className="text-[9px] text-[var(--accent-secondary-light)] font-mono tracking-widest uppercase">
                MOBILE LAUNCHPROTOCOL
              </p>
            </div>
          </div>

          <p className="text-[10px] text-slate-300 mb-5 leading-relaxed bg-[var(--bg-base)]/40 border border-white/5 p-3 font-mono">
            Deploy LifeQuest directly to your home screen for an immersive fullscreen game mode, standalone speed boosts, and instant system load times.
          </p>

          <div className="space-y-4 mb-6">
            <h3 className="text-[9px] uppercase font-bold tracking-widest text-slate-500 border-b border-white/5 pb-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" /> Installation Steps
            </h3>

            {deviceOS === 'ios' && (
              <div className="space-y-3">
                <div className="flex items-start gap-3 text-xs">
                  <div className="w-5 h-5 bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/30 rounded flex items-center justify-center text-[10px] font-mono font-bold shrink-0 mt-0.5">
                    1
                  </div>
                  <p className="text-[11px] text-slate-300 leading-tight">
                    Tap the <span className="inline-flex items-center text-white font-semibold bg-white/10 px-1 rounded gap-1 font-mono"><Share className="w-3 h-3 inline text-cyan-400" /> Share</span> icon in Safari's bottom browser navigation menu.
                  </p>
                </div>

                <div className="flex items-start gap-3 text-xs">
                  <div className="w-5 h-5 bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/30 rounded flex items-center justify-center text-[10px] font-mono font-bold shrink-0 mt-0.5">
                    2
                  </div>
                  <p className="text-[11px] text-slate-300 leading-tight">
                    Scroll down the options menu and select the <span className="inline-flex items-center text-white font-semibold bg-white/10 px-1 rounded gap-1 font-mono"><PlusSquare className="w-3 h-3 inline text-fuchsia-400" /> Add to Home Screen</span> line.
                  </p>
                </div>

                <div className="flex items-start gap-3 text-xs">
                  <div className="w-5 h-5 bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/30 rounded flex items-center justify-center text-[10px] font-mono font-bold shrink-0 mt-0.5">
                    3
                  </div>
                  <p className="text-[11px] text-slate-300 leading-tight">
                    Tap <span className="text-white font-bold font-mono">Add</span> in the upper-right corner of Safari. Launch the app icon from your home screen!
                  </p>
                </div>
              </div>
            )}

            {deviceOS === 'android' && (
              <div className="space-y-3">
                {deferredPrompt ? (
                  <button
                    onClick={handleInstallClick}
                    className="w-full py-2.5 bg-gradient-to-r from-fuchsia-500 to-fuchsia-600 hover:from-fuchsia-400 hover:to-fuchsia-500 text-white font-black text-xs uppercase tracking-widest transition-all shadow-[0_4px_15px_rgba(217,70,239,0.2)] flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                  >
                    <ArrowDown className="w-4 h-4 animate-bounce" />
                    INSTALL INSTANT APP
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 text-xs">
                      <div className="w-5 h-5 bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/30 rounded flex items-center justify-center text-[10px] font-mono font-bold shrink-0 mt-0.5">
                        1
                      </div>
                      <p className="text-[11px] text-slate-300 leading-tight">
                        Tap the menu icon <span className="inline-flex items-center text-white font-semibold bg-white/10 px-1 rounded gap-1 font-mono"><MoreVertical className="w-3 h-3 inline text-cyan-400" /> More Options</span> (3 dots) in the browser header.
                      </p>
                    </div>

                    <div className="flex items-start gap-3 text-xs">
                      <div className="w-5 h-5 bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/30 rounded flex items-center justify-center text-[10px] font-mono font-bold shrink-0 mt-0.5">
                        2
                      </div>
                      <p className="text-[11px] text-slate-300 leading-tight">
                        Choose <span className="text-white font-bold font-mono bg-white/10 px-1 rounded">Add to Home Screen</span> or <span className="text-white font-bold font-mono bg-white/10 px-1 rounded">Install App</span> from the drop-down.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {deviceOS === 'other' && (
              <div className="space-y-3">
                <div className="flex items-start gap-3 text-xs">
                  <div className="w-5 h-5 bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/30 rounded flex items-center justify-center text-[10px] font-mono font-bold shrink-0 mt-0.5">
                    1
                  </div>
                  <p className="text-[11px] text-slate-300 leading-tight">
                    Open your browser options menu or tap the Share options pane.
                  </p>
                </div>

                <div className="flex items-start gap-3 text-xs">
                  <div className="w-5 h-5 bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/30 rounded flex items-center justify-center text-[10px] font-mono font-bold shrink-0 mt-0.5">
                    2
                  </div>
                  <p className="text-[11px] text-slate-300 leading-tight">
                    Look for <span className="text-white font-bold font-mono bg-white/10 px-1 rounded">Add to Home Screen</span> or <span className="text-white font-bold font-mono bg-white/10 px-1 rounded">Install App</span>.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleDismiss}
              className="flex-1 py-2.5 bg-[var(--bg-highlight)] hover:bg-[#252538] text-white border border-[var(--border-subtle)] text-[10px] font-black uppercase tracking-widest transition-colors cursor-pointer"
            >
              GOT IT
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
