import fs from 'fs';
let code = fs.readFileSync('src/context/GameContext.tsx', 'utf8');

const openCrateCode = `
  const openCrate = async () => {
    if (!user) return null;
    try {
      const result = await runTransaction(db, async (transaction) => {
        const statsRef = doc(db, 'users', user.uid);
        const statsSnap = await transaction.get(statsRef);
        const currentStats = statsSnap.exists() ? (statsSnap.data() as UserStats) : defaultStats;
        
        if (!currentStats.crates || currentStats.crates <= 0) {
          return null;
        }

        const nextStats = { ...currentStats, crates: currentStats.crates - 1 };
        
        const rand = Math.random();
        let dropType: 'coins' | 'xp_multiplier' | 'theme' | 'avatar' = 'coins';
        let value: string | number = 0;
        let message = '';
        
        if (rand < 0.25) {
          dropType = 'xp_multiplier';
          value = 2.0;
          nextStats.streakBonusExpiry = Date.now() + 24 * 60 * 60 * 1000;
          message = '2.0x XP Multiplier (24h)';
        } else if (rand < 0.6) {
          dropType = 'coins';
          value = Math.floor(Math.random() * 50) + 50;
          nextStats.balance = Number(((nextStats.balance || 0) + (value as number)).toFixed(2));
          message = \`+\${value} LQ Credits\`;
        } else if (rand < 0.8) {
          dropType = 'theme';
          const possibleThemes = ['synthwave', 'hacker', 'royal', 'cosmic'].filter(t => !(currentStats.unlockedThemes || []).includes(t));
          if (possibleThemes.length > 0) {
            value = possibleThemes[Math.floor(Math.random() * possibleThemes.length)];
            nextStats.unlockedThemes = [...(currentStats.unlockedThemes || []), value as string];
            message = \`Unlocked Theme: \${value}\`;
          } else {
            dropType = 'coins';
            value = 100;
            nextStats.balance = Number(((nextStats.balance || 0) + 100).toFixed(2));
            message = \`+100 LQ Credits (Duplicate Theme)\`;
          }
        } else {
          dropType = 'avatar';
          const possibleAvatars = ['star', 'shield', 'crown', 'award'].filter(a => !(currentStats.unlockedAvatars || []).includes(a));
          if (possibleAvatars.length > 0) {
            value = possibleAvatars[Math.floor(Math.random() * possibleAvatars.length)];
            nextStats.unlockedAvatars = [...(currentStats.unlockedAvatars || []), value as string];
            message = \`Unlocked Avatar: \${value}\`;
          } else {
            dropType = 'coins';
            value = 100;
            nextStats.balance = Number(((nextStats.balance || 0) + 100).toFixed(2));
            message = \`+100 LQ Credits (Duplicate Avatar)\`;
          }
        }
        
        transaction.set(statsRef, nextStats, { merge: true });
        
        if (dropType === 'coins') {
          const txId = Math.random().toString(36).substring(2, 9);
          transaction.set(doc(db, 'users', user.uid, 'transactions', txId), {
            id: txId,
            amount: value,
            concept: 'Data Cache Opened',
            date: Date.now(),
            type: 'earn',
          });
        }
        
        return { type: dropType, value, message };
      });
      if (result) {
        sfx.playSuccess();
        vibrate([100, 50, 100]);
      }
      return result;
    } catch (err) {
      console.error("Failed to open crate:", err);
      return null;
    }
  };
`;

code = code.replace("const addQuest = async", openCrateCode + "\n  const addQuest = async");
fs.writeFileSync('src/context/GameContext.tsx', code);
