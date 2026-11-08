import re

with open('server.ts', 'r') as f:
    content = f.read()

# Add webpush import
content = content.replace('import axios from "axios";', 'import axios from "axios";\nimport webpush from "web-push";\nimport fs from "fs";')

# Setup VAPID Keys right after app = express()
vapid_setup = """
const PORT = 3000;

// Web Push Setup
let vapidKeys: { publicKey: string; privateKey: string };
const vapidPath = path.join(process.cwd(), 'vapid.json');
if (fs.existsSync(vapidPath)) {
  vapidKeys = JSON.parse(fs.readFileSync(vapidPath, 'utf8'));
} else {
  vapidKeys = webpush.generateVAPIDKeys();
  fs.writeFileSync(vapidPath, JSON.stringify(vapidKeys));
}
webpush.setVapidDetails(
  'mailto:support@qfm-bot.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

const subsPath = path.join(process.cwd(), 'subscriptions.json');
let pushSubscriptions: any[] = [];
if (fs.existsSync(subsPath)) {
  try {
    pushSubscriptions = JSON.parse(fs.readFileSync(subsPath, 'utf8'));
  } catch(e) {}
}

"""
content = content.replace('const PORT = 3000;', vapid_setup)

# Change test-signal logic to send Web Push
test_push = """    // Send directly
    let message = `TEST ALERT: 🚀 AQS Spotted a new ${testSignal.action} signal for ${testSignal.pair} at ${testSignal.currentPrice}\\nTP: ${testSignal.takeProfit} | SL: ${testSignal.stopLoss} | Conf: ${testSignal.confidence}%`;
    const payload = JSON.stringify({
      title: `Market Alert: ${testSignal.pair} ${testSignal.action}`,
      body: message
    });
    console.log(`Sending test Web Push to ${pushSubscriptions.length} subscribers...`);
    const subsToRemove: number[] = [];
    for (let i = 0; i < pushSubscriptions.length; i++) {
        try {
            await webpush.sendNotification(pushSubscriptions[i], payload);
        } catch (error: any) {
            if (error.statusCode === 404 || error.statusCode === 410) {
               subsToRemove.push(i);
            } else {
               console.error('Error sending test push:', error);
            }
        }
    }
    if (subsToRemove.length > 0) {
        subsToRemove.reverse().forEach(idx => pushSubscriptions.splice(idx, 1));
        fs.writeFileSync(subsPath, JSON.stringify(pushSubscriptions));
    }
    
    res.json({ success: true, message: "Test signal sent" });"""

content = re.sub(r'    // Send directly.*?res\.json\(\{ success: true, message: "Test signal sent" \}\);', test_push, content, flags=re.DOTALL)

# Change sendBatchedNtfyAlerts to sendBatchedWebPushAlerts
push_func = """async function sendBatchedWebPushAlerts(signals: Signal[]) {
  const toSend = signals.filter(s => activeSelectedAssets.includes(s.type.toLowerCase()) && s.confidence >= 80);
  const newToSend = [];
  
  for (const s of toSend) {
    const sigId = `${s.pair}-${s.time}-${s.action}`;
    if (!notifiedSignals.has(sigId)) {
      notifiedSignals.add(sigId);
      newToSend.push(s);
    }
  }

  if (newToSend.length === 0) return;

  if (notifiedSignals.size > 2000) {
    const iterator = notifiedSignals.values();
    for(let i=0; i<500; i++) notifiedSignals.delete(iterator.next().value);
  }

  const chunkSize = 5;
  for (let i = 0; i < newToSend.length; i += chunkSize) {
    const chunk = newToSend.slice(i, i + chunkSize);
    let message = chunk.map(s => `${s.action} ${s.pair} @ ${s.currentPrice}\\nTP: ${s.takeProfit} | SL: ${s.stopLoss} | Conf: ${s.confidence}%`).join('\\n\\n');
    
    let title = chunk.length > 1 ? `Market Alert: ${chunk.length} New Signals` : `Market Alert: ${chunk[0].pair} ${chunk[0].action}`;
    
    const payload = JSON.stringify({
      title: title,
      body: message
    });

    console.log(`[Notification] Sending batched Web Push to ${pushSubscriptions.length} subscribers...`);
    
    const subsToRemove: number[] = [];
    for (let j = 0; j < pushSubscriptions.length; j++) {
        try {
            await webpush.sendNotification(pushSubscriptions[j], payload);
        } catch (error: any) {
            if (error.statusCode === 404 || error.statusCode === 410) {
               subsToRemove.push(j);
            } else {
               console.error('Error sending push:', error);
            }
        }
    }
    
    if (subsToRemove.length > 0) {
        subsToRemove.reverse().forEach(idx => pushSubscriptions.splice(idx, 1));
        fs.writeFileSync(subsPath, JSON.stringify(pushSubscriptions));
    }
    
    if (i + chunkSize < newToSend.length) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}"""

content = re.sub(r'async function sendBatchedNtfyAlerts.*?\}\n\n(?=let isScanning = false;)', push_func + '\n\n', content, flags=re.DOTALL)
content = content.replace("sendBatchedNtfyAlerts", "sendBatchedWebPushAlerts")

# Add API endpoints for VAPID and subscribe
api_endpoints = """
  app.get("/api/vapidPublicKey", (req, res) => {
    res.json({ publicKey: vapidKeys.publicKey });
  });

  app.post("/api/subscribe", (req, res) => {
    const subscription = req.body;
    if (!pushSubscriptions.find(sub => sub.endpoint === subscription.endpoint)) {
      pushSubscriptions.push(subscription);
      fs.writeFileSync(subsPath, JSON.stringify(pushSubscriptions));
    }
    res.status(201).json({});
  });
"""

content = content.replace('app.get("/api/test-signal", async (req, res) => {', api_endpoints.strip() + '\n\napp.get("/api/test-signal", async (req, res) => {')

with open('server.ts', 'w') as f:
    f.write(content)
