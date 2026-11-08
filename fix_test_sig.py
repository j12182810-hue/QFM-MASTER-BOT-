import re

with open('server.ts', 'r') as f:
    content = f.read()

old_res = r"res\.json\(\{ success: true, message: \"Test signal sent\" \}\);"
new_res = r"""if (subsSnapshot.docs.length === 0) {
        res.json({ success: false, message: "Test signal skipped: No users are subscribed to push notifications. Please click 'Enable Native Push' first." });
    } else {
        res.json({ success: true, message: `Test signal sent to ${subsSnapshot.docs.length} subscriber(s).` });
    }"""
content = re.sub(old_res, new_res, content)

with open('server.ts', 'w') as f:
    f.write(content)
