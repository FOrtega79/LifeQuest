import fs from 'fs';
const lines = fs.readFileSync('src/screens/ProfileScreen.tsx', 'utf8').split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('</AnimatePresence>')) {
    console.log(`Line ${i}: ${lines[i]}`);
  }
  if (lines[i].includes('{/* TABS */}')) {
    console.log(`Line ${i}: ${lines[i]}`);
  }
}
