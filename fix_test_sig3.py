import re

with open('server.ts', 'r') as f:
    content = f.read()

old_str = "if (error.statusCode === 404 || error.statusCode === 410) {"
new_str = "if (error.statusCode === 404 || error.statusCode === 410 || error.statusCode === 403 || error.statusCode === 400) {"
content = content.replace(old_str, new_str)

with open('server.ts', 'w') as f:
    f.write(content)
