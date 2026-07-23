import React from 'react';
import { useSignInWithGoogle } from 'react-firebase-hooks/auth';
import { auth } from '../lib/firebase';
import { motion } from 'motion/react';

export function LoginScreen() {
  const [signInWithGoogle, user, loading, error] = useSignInWithGoogle(auth);

  return (
    <div className="h-[100dvh] bg-[var(--bg-base)] flex items-center justify-center p-4 text-center">
      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="max-w-xs w-full"
      >
        <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 mx-auto mb-6 flex items-center justify-center text-3xl font-bold border border-white/20 skew-x-[-6deg] text-white">LQ</div>
        <h1 className="text-2xl font-bold uppercase tracking-widest text-slate-100 mb-2">LifeQuest</h1>
        <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-12">Initialize System Authorization</p>
        
        {error && <p className="text-rose-500 text-xs mb-4">{error.message}</p>}
        
        <button
          onClick={() => signInWithGoogle()}
          disabled={loading}
          className="w-full bg-cyan-900/30 text-[var(--accent-primary-light)] border border-[var(--accent-primary)]/50 py-3 text-xs font-bold uppercase tracking-widest hover:bg-cyan-900/50 transition-colors skew-x-[-6deg] flex items-center justify-center disabled:opacity-50"
        >
          <div className="skew-x-[6deg]">{loading ? 'AUTHENTICATING...' : 'LOGIN WITH GOOGLE'}</div>
        </button>
      </motion.div>
    </div>
  );
}
