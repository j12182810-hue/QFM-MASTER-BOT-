import re

with open('server.ts', 'r') as f:
    content = f.read()

# Replace sendNtfyAlert
send_ntfy_new = """async function sendBatchedNtfyAlerts(signals: Signal[]) {
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

  // Batch into chunks of 5
  const chunkSize = 5;
  for (let i = 0; i < newToSend.length; i += chunkSize) {
    const chunk = newToSend.slice(i, i + chunkSize);
    let message = chunk.map(s => `${s.action} ${s.pair} @ ${s.currentPrice}\\nTP: ${s.takeProfit} | SL: ${s.stopLoss} | Conf: ${s.confidence}%`).join('\\n\\n');
    
    let title = chunk.length > 1 ? `Market Alert: ${chunk.length} New Signals` : `Market Alert: ${chunk[0].pair} ${chunk[0].action}`;
    let tags = chunk.length > 1 ? "rotating_light,chart_with_upwards_trend" : (chunk[0].action === "BUY" ? "chart_with_upwards_trend" : "chart_with_downwards_trend");

    try {
      await axios.post("https://ntfy.sh/AQS_Market_Signals_1849", message, {
        headers: {
          "Title": title,
          "Priority": "high",
          "Tags": tags
        },
        httpsAgent: new https.Agent({ family: 6 }) // Force IPv6 to bypass shared IPv4 NAT limits
      });
      console.log(`[Notification] Sent batched push alert for ${chunk.length} signals`);
      if (i + chunkSize < newToSend.length) {
        await new Promise(r => setTimeout(r, 2000)); // sleep between chunks
      }
    } catch (error: any) {
      if (error.response && error.response.status === 429) {
        console.log(`[Notification] Rate limit reached on ntfy.sh. Skipping batch.`);
      } else {
        console.error("[Notification] Failed to send push alert:", error.message || error);
      }
    }
  }
}
"""

# Replace the single sendNtfyAlert function with sendBatchedNtfyAlerts
content = re.sub(r'async function sendNtfyAlert.*?\}\n\n(?=let isScanning = false;)', send_ntfy_new + '\n', content, flags=re.DOTALL)

# Update the scan loop
scan_loop_replace = """    // Send push notifications for new signals in batches
    await sendBatchedNtfyAlerts(newSignals);"""
content = re.sub(r'    // Send push notifications for new signals\n    for \(const signal of newSignals\) \{\n       await sendNtfyAlert\(signal\);\n       await new Promise\(resolve => setTimeout\(resolve, 2000\)\); // sleep 2s to avoid rate limit burst\n    \}', scan_loop_replace, content)

# Update the test endpoint
content = content.replace("await sendNtfyAlert(testSignal);", "await sendBatchedNtfyAlerts([testSignal]);")

with open('server.ts', 'w') as f:
    f.write(content)
