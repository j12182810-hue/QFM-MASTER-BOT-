import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

# 1. Remove background image layer
content = re.sub(r'\{/\*\s*Background Image Layer\s*\*/\}.*?</style>\s*</div>\s*</div>', '', content, flags=re.DOTALL) # This was the bad one.
