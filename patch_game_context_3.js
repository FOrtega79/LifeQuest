import fs from 'fs';
let code = fs.readFileSync('src/context/GameContext.tsx', 'utf8');
code = code.replace("completeQuest: (id: string) => Promise<{ coins: number; xp: number; leveledUp: boolean } | null>;", "completeQuest: (id: string) => Promise<{ coins: number; xp: number; leveledUp: boolean; crateDropped?: boolean } | null>;");
code = code.replace("completeQuest = async (id: string): Promise<{ coins: number; xp: number; leveledUp: boolean } | null> => {", "completeQuest = async (id: string): Promise<{ coins: number; xp: number; leveledUp: boolean; crateDropped?: boolean } | null> => {");
fs.writeFileSync('src/context/GameContext.tsx', code);
