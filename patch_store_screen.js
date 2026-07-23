import fs from 'fs';
let code = fs.readFileSync('src/screens/StoreScreen.tsx', 'utf8');

const importCrate = "import { ShoppingCart, User, Skull, Ghost, Star, Palette, Zap, Crown, Shield, Award, PackageOpen } from 'lucide-react';";
code = code.replace(/import \{ ShoppingCart.*?\} from 'lucide-react';/, importCrate);

code = code.replace("const { stats, updateTheme, updateAvatar, purchaseCosmetic } = useGame();", "const { stats, updateTheme, updateAvatar, purchaseCosmetic, openCrate } = useGame();");

const crateState = `
  const [crateResult, setCrateResult] = useState<{ type: string, value: string | number, message: string } | null>(null);
  const [isOpeningCrate, setIsOpeningCrate] = useState(false);

  const handleOpenCrate = async () => {
    if (isOpeningCrate) return;
    setIsOpeningCrate(true);
    const result = await openCrate();
    if (result) {
      setCrateResult(result);
    }
    setIsOpeningCrate(false);
  };
`;
code = code.replace("const [confirmModal", crateState + "\n  const [confirmModal");

const cratesSection = `
      {/* Gacha Section */}
      <div className="flex flex-col gap-3">
        <h2 className="text-[11px] font-bold tracking-widest text-fuchsia-400 uppercase flex items-center">
          <span className="w-1.5 h-1.5 bg-fuchsia-500 mr-2"></span>
          Data Caches (Lootboxes)
        </h2>
        
        <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-fuchsia-500/10 border border-fuchsia-500/30 flex items-center justify-center text-fuchsia-400">
              <PackageOpen className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-200 uppercase tracking-widest">Mystery Crate</p>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">Owned: {stats.crates || 0}</p>
            </div>
          </div>
          
          <button 
            onClick={handleOpenCrate}
            disabled={!stats.crates || stats.crates <= 0 || isOpeningCrate}
            className="px-4 py-2 bg-fuchsia-500 text-white font-bold text-[10px] uppercase tracking-widest disabled:opacity-50 disabled:bg-slate-800 disabled:text-slate-500 hover:bg-fuchsia-400 transition-colors"
          >
            {isOpeningCrate ? 'Opening...' : 'Decrypt'}
          </button>
        </div>
      </div>
`;

code = code.replace("      <div className=\"flex flex-col gap-3\">\n        <h2 className=\"text-[11px] font-bold tracking-widest text-[var(--accent-secondary-light)] uppercase flex items-center\">", cratesSection + "\n      <div className=\"flex flex-col gap-3\">\n        <h2 className=\"text-[11px] font-bold tracking-widest text-[var(--accent-secondary-light)] uppercase flex items-center\">");

const crateModal = `
      <AnimatePresence>
        {crateResult && (
          <div className="fixed inset-0 z-50 bg-[var(--bg-base)]/90 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm bg-[var(--bg-panel)] border border-fuchsia-500/50 p-6 shadow-[0_0_30px_rgba(217,70,239,0.15)] relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-fuchsia-500/10 to-transparent pointer-events-none"></div>
              
              <div className="relative z-10 text-center">
                <div className="w-16 h-16 mx-auto mb-4 border-2 border-fuchsia-400 bg-[var(--bg-base)] flex items-center justify-center rotate-45">
                  <div className="-rotate-45 text-2xl text-fuchsia-400"><PackageOpen /></div>
                </div>
                
                <h3 className="text-sm font-bold uppercase tracking-widest text-white mb-2">Cache Decrypted</h3>
                <p className="text-xl font-mono text-fuchsia-400 font-bold mb-6">{crateResult.message}</p>
                
                <button
                  onClick={() => setCrateResult(null)}
                  className="w-full py-3 border border-fuchsia-500/50 text-fuchsia-400 font-bold text-[11px] uppercase tracking-widest hover:bg-fuchsia-500/10 transition-colors"
                >
                  Accept
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
`;

code = code.replace("    </div>\n  );\n}", "    </div>\n" + crateModal + "\n  );\n}");

fs.writeFileSync('src/screens/StoreScreen.tsx', code);
