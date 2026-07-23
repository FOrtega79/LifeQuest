import fs from 'fs';
let code = fs.readFileSync('src/screens/ProfileScreen.tsx', 'utf8');

code = code.replace(
  "  const { stats, transactions, redeemCoins, toggleSound, updateTheme, updateAvatar, purchaseCosmetic } = useGame();",
  "  const { stats, quests, transactions, redeemCoins, toggleSound, updateTheme, updateAvatar, purchaseCosmetic } = useGame();"
);

code = code.replace("  const { quests } = useGame();\n", "");

fs.writeFileSync('src/screens/ProfileScreen.tsx', code);
console.log("Patched destructuring");
