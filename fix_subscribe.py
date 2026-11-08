import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

old_catch = r"\} catch \(err\) \{\n\s*console\.error\(err\);\n\s*alert\('Failed to subscribe\.'\);\n\s*\}"
new_catch = r"""} catch (err: any) {
      console.error(err);
      if (err.message && err.message.includes('permission')) {
        alert('Permission denied. If you are viewing this in an embedded preview (like AI Studio), please open the app in a New Tab to grant notification permissions.');
      } else {
        alert('Failed to subscribe. Please make sure you open the app in a New Tab to grant permissions, as iframes block push notifications.');
      }
    }"""

content = re.sub(old_catch, new_catch, content)

with open('src/App.tsx', 'w') as f:
    f.write(content)
