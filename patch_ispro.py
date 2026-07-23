import sys

with open("src/context/GameContext.tsx", "r") as f:
    content = f.read()

replacement = """        const resolvedStats: UserStats = {
          ...data,
          level: data.level ?? 1,
          xp: data.xp ?? 0,
          balance: data.balance ?? data.totalCoins ?? 0,
          multiplier: data.multiplier ?? 1.05,
          completedQuests: data.completedQuests ?? 0,
          failedQuests: data.failedQuests ?? 0,
          streak: data.streak ?? 0,
          lastActiveDate: data.lastActiveDate,
          lastLoginClaim: data.lastLoginClaim,
          soundEnabled: data.soundEnabled ?? true,
          theme: data.theme ?? 'cyberpunk',
          unlockedThemes: data.unlockedThemes ?? ['cyberpunk', 'forest', 'minimalist'],
          unlockedAvatars: data.unlockedAvatars ?? ['default'],
          avatar: data.avatar ?? 'default',
          isPro: data.isPro ?? (user.email === 'ferfullstack@gmail.com'),
        };"""

original = """        const resolvedStats: UserStats = {
          level: data.level ?? 1,
          xp: data.xp ?? 0,
          balance: data.balance ?? data.totalCoins ?? 0,
          multiplier: data.multiplier ?? 1.05,
          completedQuests: data.completedQuests ?? 0,
          failedQuests: data.failedQuests ?? 0,
          streak: data.streak ?? 0,
          lastActiveDate: data.lastActiveDate,
          lastLoginClaim: data.lastLoginClaim,
          soundEnabled: data.soundEnabled ?? true,
          theme: data.theme ?? 'cyberpunk',
          unlockedThemes: data.unlockedThemes ?? ['cyberpunk', 'forest', 'minimalist'],
          unlockedAvatars: data.unlockedAvatars ?? ['default'],
          avatar: data.avatar ?? 'default',
        };"""

content = content.replace(original, replacement)

with open("src/context/GameContext.tsx", "w") as f:
    f.write(content)
