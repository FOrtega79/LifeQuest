import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { ShoppingCart, User, Skull, Ghost, Star, Palette, Zap, Crown, Shield, Award, PackageOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { haptics } from '../lib/utils';

const STORE_ITEMS = {
  themes: [
    { id: 'cyberpunk', name: 'Cyberpunk', cost: 0, type: 'theme' },
    { id: 'forest', name: 'Forest', cost: 10, type: 'theme' },
    { id: 'minimalist', name: 'Minimalist', cost: 10, type: 'theme' },
    { id: 'synthwave', name: 'Synthwave', cost: 50, type: 'theme' },
    { id: 'hacker', name: 'Terminal', cost: 50, type: 'theme' },
    { id: 'royal', name: 'Royal', cost: 90, type: 'theme' },
    { id: 'cosmic', name: 'Cosmic', cost: 90, type: 'theme' },
  ],
  avatars: [
    { id: 'default', name: 'Default', icon: User, cost: 0, type: 'avatar' },
    { id: 'skull', name: 'Skull', icon: Skull, cost: 10, type: 'avatar' },
    { id: 'ghost', name: 'Ghost', icon: Ghost, cost: 10, type: 'avatar' },
    { id: 'star', name: 'Star', icon: Star, cost: 50, type: 'avatar' },
    { id: 'shield', name: 'Shield', icon: Shield, cost: 50, type: 'avatar' },
    { id: 'crown', name: 'Crown', icon: Crown, cost: 90, type: 'avatar' },
    { id: 'award', name: 'Award', icon: Award, cost: 90, type: 'avatar' },
  ]
} as const;

export function StoreScreen() {
  const { stats, updateTheme, updateAvatar, purchaseCosmetic, openCrate } = useGame();
  
  
  const [crateResult, setCrateResult] = useState<{ type: string, value: string | number, message: string } | null>(null);
  const [isOpeningCrate, setIsOpeningCrate] = useState(false);

  const handleOpenCrate = async () => {
    if (isOpeningCrate) return;
    setIsOpeningCrate(true);
    haptics.tap();
    const result = await openCrate();
    if (result) {
      haptics.crateOpen();
      setCrateResult(result);
    }
    setIsOpeningCrate(false);
  };

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    item: any;
    type: 'theme' | 'avatar';
  }>({
    isOpen: false,
    item: null,
    type: 'theme',
  });

  const [insufficientModal, setInsufficientModal] = useState<{
    isOpen: boolean;
    item: any;
  }>({ isOpen: false, item: null });

  // Restore the original theme when the modal is closed without buying
  useEffect(() => {
    if (confirmModal.isOpen && confirmModal.type === 'theme') {
      document.documentElement.setAttribute('data-theme', confirmModal.item.id);
    } else {
      document.documentElement.setAttribute('data-theme', stats.theme || 'cyberpunk');
    }
  }, [confirmModal.isOpen, confirmModal.item, confirmModal.type, stats.theme]);

  const initiatePurchase = (type: 'theme' | 'avatar', item: any) => {
    haptics.tap();
    if (item.cost === 0) {
      if (type === 'theme') updateTheme(item.id);
      if (type === 'avatar') updateAvatar(item.id);
      return;
    }
    
    let isUnlocked = false;
    if (type === 'theme') isUnlocked = stats.unlockedThemes?.includes(item.id) || false;
    if (type === 'avatar') isUnlocked = stats.unlockedAvatars?.includes(item.id) || false;

    if (isUnlocked) {
      if (type === 'theme') updateTheme(item.id);
      if (type === 'avatar') updateAvatar(item.id);
    } else {
      if (stats.balance >= item.cost) {
        setConfirmModal({ isOpen: true, item, type });
      } else {
        haptics.error();
        setInsufficientModal({ isOpen: true, item });
      }
    }
  };

  const handleConfirmPurchase = async () => {
    const { item, type } = confirmModal;
    if (!item) return;

    if (stats.balance >= item.cost) {
      const success = await purchaseCosmetic(type, item.id, item.cost);
      if (success) {
        haptics.success();
        if (type === 'theme') updateTheme(item.id);
        if (type === 'avatar') updateAvatar(item.id);
      } else {
        haptics.error();
      }
    }
    setConfirmModal({ isOpen: false, item: null, type: 'theme' });
  };

  const renderItem = (item: any, type: 'theme' | 'avatar') => {
    let isUnlocked = false;
    let isSelected = false;
    
    if (type === 'theme') {
      isUnlocked = stats.unlockedThemes?.includes(item.id) || item.cost === 0;
      isSelected = stats.theme === item.id || (!stats.theme && item.id === 'cyberpunk');
    } else {
      isUnlocked = stats.unlockedAvatars?.includes(item.id) || item.cost === 0;
      isSelected = (stats.avatar || 'default') === item.id;
    }

    const canAfford = stats.balance >= item.cost;
    const Icon = item.icon;

    return (
      <motion.button
        whileTap={{ scale: 0.95 }}
        key={item.id}
        onClick={() => initiatePurchase(type, item)}
        className={`relative p-3 flex flex-col items-center justify-center border transition-colors overflow-hidden ${
          isSelected
            ? 'bg-[var(--accent-primary)]/20 border-[var(--accent-primary)] text-[var(--accent-primary-light)]'
            : isUnlocked
              ? 'bg-[var(--bg-card)] border-[var(--border-subtle)] text-slate-400 hover:text-slate-200 hover:border-slate-500'
              : canAfford
                ? 'bg-[var(--bg-card)] border-dashed border-emerald-500/50 text-slate-300 hover:border-emerald-400'
                : 'bg-transparent border-dashed border-slate-700 text-slate-600 hover:border-rose-500/50 hover:text-rose-400 opacity-70'
        }`}
      >
        {isSelected && <div className="absolute top-0 right-0 w-2 h-2 bg-[var(--accent-primary)]" />}
        
        {type === 'avatar' ? (
          <Icon className="w-6 h-6 mb-2" />
        ) : (
          <Palette className="w-6 h-6 mb-2 opacity-50" />
        )}
        
        <span className="text-[10px] font-bold uppercase tracking-widest">{item.name}</span>
        
        {!isUnlocked && (
          <div className={`mt-2 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 border ${
            canAfford ? 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10' : 'border-rose-500/50 text-rose-500 bg-rose-500/10'
          }`}>
            {item.cost} LQ
          </div>
        )}
        
        {isUnlocked && !isSelected && (
          <div className="mt-2 text-[9px] font-bold uppercase tracking-widest text-slate-500">
            EQUIP
          </div>
        )}
      </motion.button>
    );
  };

  return (
    <div className="pb-24 pt-2 flex flex-col gap-6">
      {/* Store Hero Illustration */}
      <div className="relative w-full h-32 mb-2 rounded-lg border border-[var(--border-subtle)] overflow-hidden shadow-[0_0_20px_rgba(217,70,239,0.05)]">
        <img
          src="https://picsum.photos/seed/cyberpunk_store/800/300?blur=1"
          alt="Marketplace"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover opacity-60 mix-blend-luminosity"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-base)] to-transparent pointer-events-none"></div>
        <div className="absolute bottom-4 left-4 flex items-center gap-2">
          <div className="w-8 h-8 bg-fuchsia-900/50 rounded-full flex items-center justify-center border border-fuchsia-500/50 shadow-[0_0_10px_rgba(217,70,239,0.3)]">
            <ShoppingCart className="w-4 h-4 text-fuchsia-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold uppercase tracking-widest text-slate-100 shadow-black drop-shadow-md">Black Market</h1>
            <p className="text-[9px] text-fuchsia-400 font-mono uppercase tracking-wide">Acquire cosmetics & decrypt caches</p>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-end border-b border-[var(--border-subtle)] pb-4">
        <div>
          <h1 className="text-xl font-bold uppercase tracking-widest text-slate-100 flex items-center">
            <ShoppingCart className="w-5 h-5 mr-2 text-[var(--accent-primary-light)]" />
            Upgrades
          </h1>
          <p className="text-[10px] text-slate-500 font-mono mt-1 uppercase tracking-wide">Acquire cosmetics with your LQ</p>
        </div>
        <div className="text-right">
          <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-0.5">Your Balance</p>
          <p className="text-lg font-mono font-bold text-emerald-400">${stats.balance.toFixed(2)}</p>
        </div>
      </div>


      {/* Gacha Section */}
      <div className="flex flex-col gap-3">
        <h2 className="text-[11px] font-bold tracking-widest text-fuchsia-400 uppercase flex items-center">
          <span className="w-1.5 h-1.5 bg-fuchsia-500 mr-2"></span>
          Data Caches (Lootboxes)
        </h2>
        
        <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-fuchsia-500/10 border border-fuchsia-500/30 flex items-center justify-center text-fuchsia-400">
              <PackageOpen className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-200 uppercase tracking-widest">Mystery Crate</p>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">Owned: {stats.crates || 0}</p>
            </div>
          </div>
          
          <button 
            onClick={handleOpenCrate}
            disabled={!stats.crates || stats.crates <= 0 || isOpeningCrate}
            className="px-4 py-2 bg-fuchsia-500 text-white font-bold text-[10px] uppercase tracking-widest disabled:opacity-50 disabled:bg-slate-800 disabled:text-slate-500 hover:bg-fuchsia-400 transition-colors"
          >
            {isOpeningCrate ? 'Opening...' : 'Decrypt'}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-[11px] font-bold tracking-widest text-[var(--accent-secondary-light)] uppercase flex items-center">
          <span className="w-1.5 h-1.5 bg-[var(--accent-secondary)] mr-2"></span>
          Visual Themes
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {STORE_ITEMS.themes.map(item => renderItem(item, 'theme'))}
        </div>
      </div>

      <div className="flex flex-col gap-3 mt-4">
        <h2 className="text-[11px] font-bold tracking-widest text-emerald-400 uppercase flex items-center">
          <span className="w-1.5 h-1.5 bg-emerald-500 mr-2"></span>
          Profile Avatars
        </h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {STORE_ITEMS.avatars.map(item => renderItem(item, 'avatar'))}
        </div>
        <AnimatePresence>
        {confirmModal.isOpen && confirmModal.item && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[var(--bg-base)]/90 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95 }} 
              animate={{ scale: 1 }} 
              exit={{ scale: 0.95 }}
              className="w-full max-w-sm bg-[var(--bg-panel)] border border-[var(--border-subtle)] p-6 shadow-2xl"
            >
              <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--accent-primary-light)] mb-4 flex items-center">
                <span className="w-2 h-2 bg-[var(--accent-primary)] mr-2"></span> 
                CONFIRM PURCHASE
              </h3>
              
              <div className="mb-6 space-y-4">
                <p className="text-slate-300 text-sm">
                  You are about to purchase the <span className="text-[var(--accent-primary-light)] font-bold">{confirmModal.item.name}</span> {confirmModal.type}.
                </p>
                <div className="bg-[var(--bg-base)] p-3 border border-[var(--border-subtle)] flex justify-between items-center">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Cost</span>
                  <span className="font-mono text-emerald-400 font-bold">{confirmModal.item.cost} LQ</span>
                </div>
                {confirmModal.type === 'theme' && (
                  <p className="text-[10px] text-[var(--accent-secondary)] uppercase tracking-widest text-center mt-2 animate-pulse">
                    Previewing Theme...
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => setConfirmModal({ isOpen: false, item: null, type: 'theme' })}
                  className="flex-1 py-2 bg-[var(--border-subtle)] text-slate-300 text-[10px] font-bold uppercase tracking-widest hover:bg-[var(--border-strong)] transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleConfirmPurchase}
                  className="flex-1 py-2 bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-500 transition-colors"
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
        
        {insufficientModal.isOpen && insufficientModal.item && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[var(--bg-base)]/90 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95 }} 
              animate={{ scale: 1 }} 
              exit={{ scale: 0.95 }}
              className="w-full max-w-sm bg-[var(--bg-panel)] border border-rose-500/50 p-6 shadow-2xl"
            >
              <h3 className="text-xs font-bold uppercase tracking-widest text-rose-500 mb-4 flex items-center">
                <span className="w-2 h-2 bg-rose-500 mr-2"></span> 
                INSUFFICIENT FUNDS
              </h3>
              
              <div className="mb-6 space-y-4">
                <p className="text-slate-300 text-sm">
                  You need more <span className="text-emerald-400 font-bold">LQ</span> to unlock <span className="text-white font-bold">{insufficientModal.item.name}</span>.
                </p>
                <div className="bg-[var(--bg-base)] p-3 border border-rose-500/30 flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Item Cost</span>
                    <span className="font-mono text-slate-300 font-bold">{insufficientModal.item.cost} LQ</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Your Balance</span>
                    <span className="font-mono text-emerald-400 font-bold">{stats.balance.toFixed(2)} LQ</span>
                  </div>
                  <div className="w-full h-px bg-rose-500/20 my-1"></div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-rose-400">Missing</span>
                    <span className="font-mono text-rose-500 font-bold">{(insufficientModal.item.cost - stats.balance).toFixed(2)} LQ</span>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setInsufficientModal({ isOpen: false, item: null })}
                className="w-full py-2 bg-[var(--border-subtle)] text-slate-300 text-[10px] font-bold uppercase tracking-widest hover:bg-[var(--border-strong)] transition-colors"
              >
                Dismiss
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>

      <AnimatePresence>
        {crateResult && (
          <div className="fixed inset-0 z-50 bg-[var(--bg-base)]/90 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm bg-[var(--bg-panel)] border border-fuchsia-500/50 p-6 shadow-[0_0_30px_rgba(217,70,239,0.15)] relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-fuchsia-500/10 to-transparent pointer-events-none"></div>
              
              <div className="relative z-10 text-center">
                <div className="w-16 h-16 mx-auto mb-4 border-2 border-fuchsia-400 bg-[var(--bg-base)] flex items-center justify-center rotate-45">
                  <div className="-rotate-45 text-2xl text-fuchsia-400"><PackageOpen /></div>
                </div>
                
                <h3 className="text-sm font-bold uppercase tracking-widest text-white mb-2">Cache Decrypted</h3>
                <p className="text-xl font-mono text-fuchsia-400 font-bold mb-6">{crateResult.message}</p>
                
                <button
                  onClick={() => setCrateResult(null)}
                  className="w-full py-3 border border-fuchsia-500/50 text-fuchsia-400 font-bold text-[11px] uppercase tracking-widest hover:bg-fuchsia-500/10 transition-colors"
                >
                  Accept
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
