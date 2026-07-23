import fs from 'fs';
let code = fs.readFileSync('src/screens/DebugScreen.tsx', 'utf8');

code = code.replace(
  'videoRef.current.play().catch(e => console.error("Play failed", e));',
  'videoRef.current.play().catch(e => console.error("Play failed", e?.message || "Unknown error"));'
);

code = code.replace(
  'onError={(e) => console.error("Video error:", e)}',
  'onError={() => console.error("Video error")}'
);

fs.writeFileSync('src/screens/DebugScreen.tsx', code);
