const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const regex = /async function sendBatchedNtfyAlerts[\s\S]*?\}\n(?=let isScanning = false;)/g;

const newFunc = `async function sendBatchedNtfyAlerts(signals: Signal[]) {
  const toSend = signals.filter(s => activeSelectedAssets.includes(s.type.toLowerCase()) && s.confidence >= 80);
  const newToSend = [];
  
  for (const s of toSend) {
    const sigId = \`\${s.pair}-\${s.time}-\${s.action}\`;
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
    let message = chunk.map(s => \`\${s.action} \${s.pair} @ \${s.currentPrice}\\nTP: \${s.takeProfit} | SL: \${s.stopLoss} | Conf: \${s.confidence}%\`).join('\\n\\n');
    
    let title = chunk.length > 1 ? \`Market Alert: \${chunk.length} New Signals\` : \`Market Alert: \${chunk[0].pair} \${chunk[0].action}\`;
    let tags = chunk.length > 1 ? "rotating_light,chart_with_upwards_trend" : (chunk[0].action === "BUY" ? "chart_with_upwards_trend" : "chart_with_downwards_trend");

    try {
      await axios.post("https://ntfy.sh/AQS_Market_Signals_1849", message, {
        headers: {
          "Title": title,
          "Priority": "high",
          "Tags": tags
        },
        httpsAgent: new https.Agent({ family: 6 })
      });
      console.log(\`[Notification] Sent batched push alert for \${chunk.length} signals\`);
      if (i + chunkSize < newToSend.length) {
        await new Promise(r => setTimeout(r, 2000));
      }
    } catch (error: any) {
      if (error.response && error.response.status === 429) {
        console.log(\`[Notification] Rate limit reached on ntfy.sh. Skipping batch.\`);
      } else {
        console.error("[Notification] Failed to send push alert:", error.message || error);
      }
    }
  }
}
`;

code = code.replace(regex, newFunc);
fs.writeFileSync('server.ts', code);
