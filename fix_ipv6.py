import re

with open('server.ts', 'r') as f:
    content = f.read()

content = content.replace("httpsAgent: new https.Agent({ family: 6 })", "")

with open('server.ts', 'w') as f:
    f.write(content)
