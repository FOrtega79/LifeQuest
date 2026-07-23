import fs from 'fs';
let code = fs.readFileSync('src/components/LootboxOverlay.tsx', 'utf8');

code = code.replace(
  /<video[\s\S]*?className="w-full h-full object-cover"[\s\n]*\/>/,
  `<video 
                src="/level_up.mp4" 
                autoPlay 
                playsInline
                muted
                className="w-full h-full object-cover"
                onEnded={() => setShowVideo(false)}
                onError={(e) => {
                  console.error("Video error code:", e.currentTarget.error?.code);
                  setShowVideo(false);
                }}
              />`
);

fs.writeFileSync('src/components/LootboxOverlay.tsx', code);
