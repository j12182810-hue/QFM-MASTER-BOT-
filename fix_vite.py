with open('vite.config.ts', 'r') as f:
    content = f.read()

content = content.replace("          ]\n        }\n      })\n    ]", "          ]\n        },\n        workbox: {\n          importScripts: ['/push-listener.js']\n        }\n      })\n    ]")

with open('vite.config.ts', 'w') as f:
    f.write(content)
