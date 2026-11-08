import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

old_alert = r"await fetch\('/api/test-signal'\);\n\s*alert\(\"Test signal request sent\!\"\);"
new_alert = r"""const res = await fetch('/api/test-signal');
      const data = await res.json();
      alert(data.message || "Test signal request sent!");"""
content = re.sub(old_alert, new_alert, content)

with open('src/App.tsx', 'w') as f:
    f.write(content)
