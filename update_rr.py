import re
with open('server.ts', 'r') as f:
    content = f.read()

content = content.replace("RR: ${actualRR} (Target: ${tp.toFixed(5)})", "RR: ${actualRR} (TP1: ${tp.toFixed(5)} | TP2: ${tp2.toFixed(5)})")

with open('server.ts', 'w') as f:
    f.write(content)
