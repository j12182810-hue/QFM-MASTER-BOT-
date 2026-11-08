import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

# Remove background image layer and dynamic blobs
content = re.sub(r'\{/\*\s*Background Image Layer\s*\*/\}.*?(?=\{/\*\s*Header\s*\*/\})', '', content, flags=re.DOTALL)

with open('src/App.tsx', 'w') as f:
    f.write(content)

