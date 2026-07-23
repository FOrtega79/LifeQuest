import sys

with open("src/context/GameContext.tsx", "r") as f:
    gc = f.read()

gc = gc.replace("toggleSound: () => Promise<void>;", "toggleSound: () => Promise<void>;\n  toggleHaptics: () => Promise<void>;")

gc = gc.replace("import { auth, db } from '../lib/firebase';", "import { auth, db } from '../lib/firebase';\nimport { setHapticsGlobal } from '../lib/utils';")

toggle_sound_impl = """  const toggleSound = async () => {
    if (!user) return;
    const newValue = !(stats.soundEnabled ?? true);
    await updateDoc(doc(db, 'users', user.uid), { soundEnabled: newValue });
    // Local optimisitic update handled by onSnapshot
  };"""

toggle_haptics_impl = """  const toggleSound = async () => {
    if (!user) return;
    const newValue = !(stats.soundEnabled ?? true);
    await updateDoc(doc(db, 'users', user.uid), { soundEnabled: newValue });
  };

  const toggleHaptics = async () => {
    if (!user) return;
    const newValue = !(stats.hapticsEnabled ?? true);
    await updateDoc(doc(db, 'users', user.uid), { hapticsEnabled: newValue });
    setHapticsGlobal(newValue);
  };"""

gc = gc.replace(toggle_sound_impl, toggle_haptics_impl)

# Make sure we also set haptics global when stats are loaded from snapshot
snapshot_str = """        setStats(userData);
        if (userData.theme) {"""

snapshot_replacement = """        setStats(userData);
        setHapticsGlobal(userData.hapticsEnabled ?? true);
        if (userData.theme) {"""

gc = gc.replace(snapshot_str, snapshot_replacement)

gc = gc.replace("claimDailyLoginReward, toggleSound,", "claimDailyLoginReward, toggleSound, toggleHaptics,")

with open("src/context/GameContext.tsx", "w") as f:
    f.write(gc)
