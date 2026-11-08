import re
with open('server.ts', 'r') as f:
    content = f.read()

content = content.replace("const db = getFirestore(firebaseApp);", "const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);")

with open('server.ts', 'w') as f:
    f.write(content)
