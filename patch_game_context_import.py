import sys

with open("src/context/GameContext.tsx", "r") as f:
    gc = f.read()

gc = gc.replace("import { db, auth } from '../lib/firebase';", "import { db, auth } from '../lib/firebase';\nimport { setHapticsGlobal } from '../lib/utils';")

with open("src/context/GameContext.tsx", "w") as f:
    f.write(gc)
