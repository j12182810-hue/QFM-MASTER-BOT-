import re

with open('server.ts', 'r') as f:
    content = f.read()

# Make sure setDoc is imported
if 'setDoc' not in content:
    content = content.replace('getDocs, deleteDoc, doc', 'getDocs, deleteDoc, doc, setDoc')

old_subscribe = r"""app\.post\("/api/subscribe", async \(req, res\) => \{
    const subscription = req\.body;
    try \{
        const subsSnapshot = await getDocs\(collection\(db, 'subscriptions'\)\);
        const exists = subsSnapshot\.docs\.some\(d => d\.data\(\)\.endpoint === subscription\.endpoint\);
        
        if \(!exists\) \{
            await addDoc\(collection\(db, 'subscriptions'\), subscription\);
        \}
        res\.status\(201\)\.json\(\{\}\);
    \} catch \(e\) \{
        console\.error\(e\);
        res\.status\(500\)\.json\(\{ error: 'Failed to subscribe' \}\);
    \}
  \}\);"""

new_subscribe = """app.post("/api/subscribe", async (req, res) => {
    const subscription = req.body;
    try {
        if (!subscription || !subscription.keys || !subscription.keys.auth) {
             return res.status(400).json({ error: 'Invalid subscription' });
        }
        // Use the auth key as a unique document ID to prevent duplicates from concurrent requests (React Strict Mode double mount)
        const docId = subscription.keys.auth;
        await setDoc(doc(db, 'subscriptions', docId), subscription);
        res.status(201).json({});
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to subscribe' });
    }
  });"""

content = re.sub(old_subscribe, new_subscribe, content, flags=re.DOTALL)

with open('server.ts', 'w') as f:
    f.write(content)
