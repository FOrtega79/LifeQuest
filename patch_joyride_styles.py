import sys

with open("src/App.tsx", "r") as f:
    content = f.read()

styles_replacement = """        styles={{
          floater: {
            backgroundColor: '#1A1A24',
          },
          tooltip: {
            backgroundColor: '#1A1A24',
            color: '#f1f5f9',
            borderRadius: '12px',
            border: '1px solid rgba(217, 70, 239, 0.3)',
            fontFamily: 'monospace',
          },
          buttonPrimary: {
            backgroundColor: '#d946ef',
            borderRadius: '8px',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            fontSize: '10px',
          },
          buttonBack: {
            color: '#94a3b8',
            fontSize: '10px',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          },
          buttonSkip: {
            color: '#64748b',
            fontSize: '10px',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          },
          overlay: {
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
          }
        }}"""

# We need to find the old styles block and replace it
import re
pattern = r"styles=\{\{\s*options: \{.*?\},\s*tooltip: \{.*?\},\s*buttonNext: \{.*?\},\s*buttonBack: \{.*?\},\s*buttonSkip: \{.*?\}\s*\}\}"
content = re.sub(pattern, styles_replacement, content, flags=re.DOTALL)

with open("src/App.tsx", "w") as f:
    f.write(content)

