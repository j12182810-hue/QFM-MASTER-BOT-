import re

with open('server.ts', 'r') as f:
    content = f.read()

hardcoded_vapid = """
// Web Push Setup
const vapidKeys = {
  publicKey: "BPL8OvaSL_sl0sc53LR8Yn2YpjwTa1Tijm08xrYv3tjO7KILdWldfVP7YdiDIUosI64YyaMwtAYqk4ZUywV4AoA",
  privateKey: "some_private_key" // We need the matching private key for this public key, but since we lost it, let's use the one from vapid.json
};
"""

# Let's just use the one from vapid.json
import json
with open('vapid.json', 'r') as f:
    keys = json.load(f)

hardcoded_vapid = f"""
// Web Push Setup
const vapidKeys = {{
  publicKey: "{keys['publicKey']}",
  privateKey: "{keys['privateKey']}"
}};
webpush.setVapidDetails(
  'mailto:support@qfm-bot.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

const subsPath = path.join(process.cwd(), 'subscriptions.json');
let pushSubscriptions: any[] = [];
if (fs.existsSync(subsPath)) {{
  try {{
    pushSubscriptions = JSON.parse(fs.readFileSync(subsPath, 'utf8'));
  }} catch(e) {{}}
}}
"""

old_vapid = r"// Web Push Setup.*?if \(fs\.existsSync\(subsPath\)\) \{.*?catch\(e\) \{\}\n\}"

content = re.sub(old_vapid, hardcoded_vapid.strip(), content, flags=re.DOTALL)

with open('server.ts', 'w') as f:
    f.write(content)
