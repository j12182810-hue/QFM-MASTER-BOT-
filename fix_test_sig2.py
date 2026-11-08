import re

with open('server.ts', 'r') as f:
    content = f.read()

# Update both places where we send push notifications (batched and test)
old_catch = r"if \(error\.statusCode === 404 \|\| error\.statusCode === 410\) \{"
new_catch = r"if (error.statusCode === 404 || error.statusCode === 410 || error.statusCode === 403 || error.statusCode === 400) {"
content = content.replace(old_catch, new_catch)

with open('server.ts', 'w') as f:
    f.write(content)
