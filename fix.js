import fs from 'fs';
let code = fs.readFileSync('src/screens/StoreScreen.tsx', 'utf8');

const regex = /    <\/div>\s*<AnimatePresence>([\s\S]*?)<\/AnimatePresence>\s*\);\s*\}/;

const match = regex.exec(code);
if (match) {
  code = code.replace(match[0], `      <AnimatePresence>${match[1]}</AnimatePresence>\n    </div>\n  );\n}`);
}

fs.writeFileSync('src/screens/StoreScreen.tsx', code);
