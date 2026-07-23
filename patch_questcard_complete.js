const fs = require('fs');
const content = fs.readFileSync('src/components/QuestCard.tsx', 'utf8');

let newContent = content.replace(
  "onComplete: (id: string) => void;",
  "onComplete: (id: string) => void | Promise<void>;"
);

newContent = newContent.replace(
  "const [expired, setExpired] = useState(false);",
  "const [expired, setExpired] = useState(false);\n  const [isCompleting, setIsCompleting] = useState(false);"
);

newContent = newContent.replace(
  `onClick={() => { haptics.tap(); onComplete(quest.id); }}`,
  `onClick={async () => { haptics.tap(); setIsCompleting(true); try { await onComplete(quest.id); } finally { setIsCompleting(false); } }}`
);

newContent = newContent.replace(
  `<div className="skew-x-[12deg]">Complete</div>`,
  `<div className="skew-x-[12deg] flex items-center">{isCompleting && <RotateCw className="w-3 h-3 animate-spin mr-1.5" />}Complete</div>`
);

newContent = newContent.replace(
  `disabled={st.completed || quest.status !== 'active'}`,
  `disabled={st.completed || quest.status !== 'active' || isCompleting}`
);

newContent = newContent.replace(
  `className="bg-[var(--accent-primary-dark)] text-white px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider skew-x-[-12deg] hover:bg-[var(--accent-primary)] transition-colors flex-1 sm:flex-none text-center justify-center flex basis-full sm:basis-auto"`,
  `disabled={isCompleting}\n              className="bg-[var(--accent-primary-dark)] text-white px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider skew-x-[-12deg] hover:bg-[var(--accent-primary)] disabled:opacity-50 transition-colors flex-1 sm:flex-none text-center justify-center flex basis-full sm:basis-auto"`
);

fs.writeFileSync('src/components/QuestCard.tsx', newContent);
