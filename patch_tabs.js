import fs from 'fs';
let code = fs.readFileSync('src/screens/ProfileScreen.tsx', 'utf8');

const tabsContent = `
      {/* TABS */}
      <div className="flex border-b border-[var(--border-subtle)] mb-2">
        <button 
          onClick={() => setActiveTab('overview')}
          className={\`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest transition-colors \${activeTab === 'overview' ? 'text-[var(--accent-primary-light)] border-b-2 border-[var(--accent-primary-light)] bg-[var(--accent-primary)]/5' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}\`}
        >
          Overview
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={\`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest transition-colors \${activeTab === 'history' ? 'text-[var(--accent-primary-light)] border-b-2 border-[var(--accent-primary-light)] bg-[var(--accent-primary)]/5' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}\`}
        >
          History
        </button>
      </div>

      {activeTab === 'overview' ? (
        <>
`;

code = code.replace("      {/* STATS BOARD */}", tabsContent + "\n      {/* STATS BOARD */}");

fs.writeFileSync('src/screens/ProfileScreen.tsx', code);
console.log("Patched tabs");
