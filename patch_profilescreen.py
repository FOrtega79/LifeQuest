import sys

with open("src/screens/ProfileScreen.tsx", "r") as f:
    ps = f.read()

# Add toggleHaptics to the GameContext import
ps = ps.replace("toggleSound, updateTheme", "toggleSound, toggleHaptics, updateTheme")

audio_feedback_block = """        <div className="flex items-center justify-between bg-[var(--bg-base)]/60 border border-[var(--border-subtle)] p-3 mb-2">
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
        </div>"""

haptics_feedback_block = """        <div className="flex items-center justify-between bg-[var(--bg-base)]/60 border border-[var(--border-subtle)] p-3 mb-2">
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
        </div>"""

ps = ps.replace(audio_feedback_block, audio_feedback_block + "\n" + haptics_feedback_block)

with open("src/screens/ProfileScreen.tsx", "w") as f:
    f.write(ps)
