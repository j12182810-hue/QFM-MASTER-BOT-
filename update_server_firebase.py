import re

with open('server.ts', 'r') as f:
    content = f.read()

# Add imports
imports = """
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';
import * as firebaseConfig from './firebase-applet-config.json';

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);
"""

content = content.replace('import webpush from "web-push";', 'import webpush from "web-push";\n' + imports)

# Remove the old subscription handling
old_subs = r"const subsPath = path\.join\(process\.cwd\(\), 'subscriptions\.json'\);\nlet pushSubscriptions: any\[\] = \[\];\nif \(fs\.existsSync\(subsPath\)\) \{\n  try \{\n    pushSubscriptions = JSON\.parse\(fs\.readFileSync\(subsPath, 'utf8'\)\);\n  \} catch\(e\) \{\}\n\}"

content = re.sub(old_subs, "", content)

# Change test push
test_push_old = r"console\.log\(`Sending test Web Push to \$\{pushSubscriptions\.length\} subscribers\.\.\.`\);.*?if \(subsToRemove\.length > 0\) \{.*?fs\.writeFileSync\(subsPath, JSON\.stringify\(pushSubscriptions\)\);\n    \}"

test_push_new = """console.log(`Sending test Web Push to subscribers...`);
    const subsSnapshot = await getDocs(collection(db, 'subscriptions'));
    const subsToRemove: string[] = [];
    
    for (const docSnapshot of subsSnapshot.docs) {
        const sub = docSnapshot.data();
        try {
            await webpush.sendNotification(sub as any, payload);
        } catch (error: any) {
            if (error.statusCode === 404 || error.statusCode === 410) {
               subsToRemove.push(docSnapshot.id);
            } else {
               console.error('Error sending test push:', error);
            }
        }
    }
    
    for (const id of subsToRemove) {
        await deleteDoc(doc(db, 'subscriptions', id));
    }"""

content = re.sub(test_push_old, test_push_new, content, flags=re.DOTALL)

# Change sendBatchedWebPushAlerts
batched_old = r"console\.log\(`\[Notification\] Sending batched Web Push to \$\{pushSubscriptions\.length\} subscribers\.\.\.`\);.*?if \(subsToRemove\.length > 0\) \{.*?fs\.writeFileSync\(subsPath, JSON\.stringify\(pushSubscriptions\)\);\n    \}"

batched_new = """console.log(`[Notification] Sending batched Web Push to subscribers...`);
    
    const subsSnapshot = await getDocs(collection(db, 'subscriptions'));
    const subsToRemove: string[] = [];
    
    for (const docSnapshot of subsSnapshot.docs) {
        const sub = docSnapshot.data();
        try {
            await webpush.sendNotification(sub as any, payload);
        } catch (error: any) {
            if (error.statusCode === 404 || error.statusCode === 410) {
               subsToRemove.push(docSnapshot.id);
            } else {
               console.error('Error sending push:', error);
            }
        }
    }
    
    for (const id of subsToRemove) {
        await deleteDoc(doc(db, 'subscriptions', id));
    }"""

content = re.sub(batched_old, batched_new, content, flags=re.DOTALL)

# Change subscribe endpoint
subscribe_old = r"app\.post\(\"/api/subscribe\", \(req, res\) => \{\n    const subscription = req\.body;\n    if \(!pushSubscriptions\.find\(sub => sub\.endpoint === subscription\.endpoint\)\) \{\n      pushSubscriptions\.push\(subscription\);\n      fs\.writeFileSync\(subsPath, JSON\.stringify\(pushSubscriptions\)\);\n    \}\n    res\.status\(201\)\.json\(\{\}\);\n  \}\);"

subscribe_new = """app.post("/api/subscribe", async (req, res) => {
    const subscription = req.body;
    try {
        const subsSnapshot = await getDocs(collection(db, 'subscriptions'));
        const exists = subsSnapshot.docs.some(d => d.data().endpoint === subscription.endpoint);
        
        if (!exists) {
            await addDoc(collection(db, 'subscriptions'), subscription);
        }
        res.status(201).json({});
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to subscribe' });
    }
  });"""

content = re.sub(subscribe_old, subscribe_new, content, flags=re.DOTALL)

with open('server.ts', 'w') as f:
    f.write(content)
