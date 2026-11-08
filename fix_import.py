import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

content = content.replace("CheckCircle2, Clock", "CheckCircle2, Clock, Bell")

with open('src/App.tsx', 'w') as f:
    f.write(content)
