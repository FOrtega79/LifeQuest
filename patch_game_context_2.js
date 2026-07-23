import fs from 'fs';
let code = fs.readFileSync('src/context/GameContext.tsx', 'utf8');
code = code.replace("updateAvatar, purchaseCosmetic }", "updateAvatar, purchaseCosmetic, openCrate }");
fs.writeFileSync('src/context/GameContext.tsx', code);
