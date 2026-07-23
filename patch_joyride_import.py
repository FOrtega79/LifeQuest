import sys

with open("src/App.tsx", "r") as f:
    content = f.read()

content = content.replace("import Joyride, { STATUS } from 'react-joyride';", "import { Joyride, STATUS } from 'react-joyride';")

with open("src/App.tsx", "w") as f:
    f.write(content)

