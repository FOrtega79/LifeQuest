import sys

with open("src/types.ts", "r") as f:
    t = f.read()
t = t.replace("soundEnabled?: boolean;", "soundEnabled?: boolean;\n  hapticsEnabled?: boolean;")
with open("src/types.ts", "w") as f:
    f.write(t)

with open("src/lib/utils.ts", "r") as f:
    u = f.read()

u = u.replace("// Haptic feedback helper", '''// Haptic feedback helper
let hapticsEnabled = true;

export function setHapticsGlobal(enabled: boolean) {
  hapticsEnabled = enabled;
}
''')

u = u.replace("if (typeof window !== 'undefined' && navigator.vibrate) {", '''if (!hapticsEnabled) return;
  if (typeof window !== 'undefined' && navigator.vibrate) {''')

with open("src/lib/utils.ts", "w") as f:
    f.write(u)
