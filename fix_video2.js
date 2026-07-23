import fs from 'fs';
let code = fs.readFileSync('src/components/LootboxOverlay.tsx', 'utf8');

code = code.replace(
  'src="/level_up.mp4"',
  'src="/level_up.mp4"\n                type="video/mp4"'
);

fs.writeFileSync('src/components/LootboxOverlay.tsx', code);
