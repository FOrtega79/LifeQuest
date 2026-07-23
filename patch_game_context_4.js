import fs from 'fs';
let code = fs.readFileSync('src/context/GameContext.tsx', 'utf8');

const regex = /const nextStats: UserStats = \{[\s\S]*?lastLoginClaim: currentStats\.lastLoginClaim,\s*\};/g;

code = code.replace(regex, (match) => {
  return `
        let crateDropped = false;
        let newCratesCount = currentStats.crates || 0;
        if (currentQuest.difficulty === 'Difícil' && Math.random() < 0.3) {
          crateDropped = true;
          newCratesCount += 1;
        }

` + match.replace('lastLoginClaim: currentStats.lastLoginClaim,', 'lastLoginClaim: currentStats.lastLoginClaim,\n          crates: newCratesCount,');
});

code = code.replace(
  "return { coins, xp, leveledUp, newLevel, newCompleted: nextStats.completedQuests, bonusActivated };",
  "return { coins, xp, leveledUp, newLevel, newCompleted: nextStats.completedQuests, bonusActivated, crateDropped };"
);

code = code.replace(
  "return { coins: result.coins, xp: result.xp, leveledUp: result.leveledUp };",
  "return { coins: result.coins, xp: result.xp, leveledUp: result.leveledUp, crateDropped: result.crateDropped };"
);

fs.writeFileSync('src/context/GameContext.tsx', code);
