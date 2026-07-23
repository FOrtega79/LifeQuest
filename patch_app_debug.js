import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf8');

if (!code.includes("import { DebugScreen }")) {
  code = code.replace("import { QuestsScreen }", "import { DebugScreen } from './screens/DebugScreen';\nimport { QuestsScreen }");
}

code = code.replace(
  "{activeTab === 'store' && <StoreScreen />}",
  "{activeTab === 'store' && <StoreScreen />}\n              {activeTab === 'debug' && <DebugScreen />}"
);

const debugNav = `            <button
              onClick={() => handleTabChange('debug')}
              className={\`flex flex-col items-center justify-center w-full h-full font-bold text-[10px] tracking-widest uppercase transition-colors \${activeTab === 'debug' ? 'text-rose-400 border-t-2 border-rose-400 bg-[var(--bg-highlight)]' : 'text-slate-500 hover:text-slate-300'}\`}
            >
              DEBUG
            </button>`;

code = code.replace("</nav>", debugNav + "\n          </div>\n        </nav>");
// We need to insert the debug button before the closing div of the nav flex container
// Let's use a simpler regex replacement for the nav

let navMatch = code.match(/<nav[\s\S]*?<\/nav>/);
if (navMatch) {
  let navHtml = navMatch[0];
  navHtml = navHtml.replace("          </div>\n        </nav>", debugNav + "\n          </div>\n        </nav>");
  code = code.replace(navMatch[0], navHtml);
}

fs.writeFileSync('src/App.tsx', code);
console.log("Patched App.tsx with DebugScreen");
