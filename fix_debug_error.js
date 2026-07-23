import fs from 'fs';
let code = fs.readFileSync('src/screens/DebugScreen.tsx', 'utf8');

code = code.replace(
  'onError={() => console.error("Video error")}',
  'onError={(e) => { const err = e.currentTarget.error; console.error("Video error code:", err?.code, "message:", err?.message); }}'
);

fs.writeFileSync('src/screens/DebugScreen.tsx', code);
