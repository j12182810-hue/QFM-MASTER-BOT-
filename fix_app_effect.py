import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

old_effect = r"registration\.pushManager\.getSubscription\(\)\.then\(subscription => \{\n\s*setIsSubscribed\(subscription \!== null\);\n\s*\}\);"

new_effect = r"""registration.pushManager.getSubscription().then(subscription => {
          setIsSubscribed(subscription !== null);
          if (subscription) {
            // Re-sync with server just in case
            fetch('/api/subscribe', {
              method: 'POST',
              body: JSON.stringify(subscription),
              headers: { 'Content-Type': 'application/json' }
            }).catch(e => console.error(e));
          }
        });"""

content = re.sub(old_effect, new_effect, content)

with open('src/App.tsx', 'w') as f:
    f.write(content)
