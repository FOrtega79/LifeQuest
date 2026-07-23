import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  "type Tab = 'quests' | 'create' | 'map' | 'store' | 'profile';",
  "type Tab = 'quests' | 'create' | 'map' | 'store' | 'profile' | 'debug';"
);

fs.writeFileSync('src/App.tsx', code);
