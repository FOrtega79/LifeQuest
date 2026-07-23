import fs from 'fs';
let code = fs.readFileSync('src/screens/ProfileScreen.tsx', 'utf8');

const targetStr = `      </div>

      {/* Redeem Modal */}`;

const historySection = `      </div>
        </>
      ) : (
        <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] p-4 flex flex-col flex-1">
          <h2 className="text-[11px] font-bold tracking-widest text-slate-300 uppercase mb-4 flex items-center">
             <span className="w-1.5 h-1.5 bg-emerald-500 mr-2"></span>
             Mission History
          </h2>
          <div className="flex-1 space-y-0">
            {quests.filter(q => q.status === 'completed').length === 0 ? (
               <div className="text-slate-600 text-center py-8 border-b border-white/5 uppercase text-[9px] tracking-widest font-bold">No missions completed yet</div>
            ) : (
               quests.filter(q => q.status === 'completed').sort((a,b) => b.createdAt - a.createdAt).map(q => (
                 <div key={q.id} className="mb-3 border-b border-white/5 pb-3">
                   <div className="flex justify-between items-start mb-1">
                     <span className="text-xs font-bold text-slate-200 uppercase tracking-widest">{q.title}</span>
                     <span className="text-[9px] text-slate-500 font-mono">{format(new Date(q.createdAt), 'MMM dd, HH:mm')}</span>
                   </div>
                   <div className="flex gap-4">
                     <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest">+{q.reward?.coins?.toFixed(2) || '0.00'} LQ</span>
                     <span className="text-[9px] font-bold text-[var(--accent-secondary-light)] uppercase tracking-widest">+{q.reward?.xp || 0} XP</span>
                   </div>
                 </div>
               ))
            )}
          </div>
        </div>
      )}

      {/* Redeem Modal */}`;

code = code.replace(targetStr, historySection);

fs.writeFileSync('src/screens/ProfileScreen.tsx', code);
console.log("Patched history");
