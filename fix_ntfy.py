import re

with open('server.ts', 'r') as f:
    content = f.read()

# Throttle sendNtfyAlert
send_ntfy_new = """async function sendNtfyAlert(signal: Signal) {
  if (!activeSelectedAssets.includes(signal.type.toLowerCase())) return;
  
  // Only send high confidence signals to avoid rate limits
  if (signal.confidence < 80) return;
  
  const sigId = `${signal.pair}-${signal.time}-${signal.action}`;
  if (!notifiedSignals.has(sigId)) {
    notifiedSignals.add(sigId);
    if (notifiedSignals.size > 1000) {
       const iterator = notifiedSignals.values();
       notifiedSignals.delete(iterator.next().value);
    }
    try {
      const message = `AQS Spotted a new ${signal.action} signal for ${signal.pair} at ${signal.currentPrice}!
Take Profit: ${signal.takeProfit}
Stop Loss: ${signal.stopLoss}
Confidence: ${signal.confidence}%`;
      await axios.post("https://ntfy.sh/AQS_Market_Signals_1849", message, {
        headers: {
          "Title": `Market Alert: ${signal.pair} ${signal.action}`,
          "Priority": "high",
          "Tags": signal.action === "BUY" ? "chart_with_upwards_trend" : "chart_with_downwards_trend"
        }
      });
      console.log(`[Notification] Sent push alert for ${signal.pair}`);
    } catch (error: any) {
      if (error.response && error.response.status === 429) {
        console.log(`[Notification] Rate limit reached on ntfy.sh. Skipping push alert for ${signal.pair}.`);
      } else {
        console.error("[Notification] Failed to send push alert:", error.message || error);
      }
    }
  }
}
"""

content = re.sub(r'async function sendNtfyAlert\(signal: Signal\) \{.*?\n\}\n(?=app\.get)', send_ntfy_new + '\n', content, flags=re.DOTALL)

# Let's also add a 2 second sleep between sendNtfyAlert inside the scan loop
scan_loop_replace = """    // Send push notifications for new signals
    for (const signal of newSignals) {
       await sendNtfyAlert(signal);
       await new Promise(resolve => setTimeout(resolve, 2000)); // sleep 2s to avoid rate limit burst
    }"""
content = content.replace("    // Send push notifications for new signals\n    for (const signal of newSignals) {\n       await sendNtfyAlert(signal);\n    }", scan_loop_replace)

with open('server.ts', 'w') as f:
    f.write(content)
