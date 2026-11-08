with open('server.ts', 'r') as f:
    content = f.read()

content = content.replace("join('\\n\\n')", 'join("\\n\\n")')

# wait, the content has literal newlines inside the single quotes:
import re
content = re.sub(r"\)\.join\('\n\n'\);", ").join('\\n\\n');", content)

with open('server.ts', 'w') as f:
    f.write(content)
