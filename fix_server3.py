import re

with open('server.ts', 'r') as f:
    content = f.read()

# 1. Add notifiedSignals Set
notified_signals_code = """
const notifiedSignals = new Set<string>();

async function sendNtfyAlert(signal: Signal) {
  const sigId = `${signal.pair}-${signal.time}-${signal.action}`;
  if (!notifiedSignals.has(sigId)) {
    notifiedSignals.add(sigId);
    if (notifiedSignals.size > 1000) {
       const iterator = notifiedSignals.values();
       notifiedSignals.delete(iterator.next().value);
    }
    try {
      const message = `AQS Spotted a new ${signal.action} signal for ${signal.pair} at ${signal.currentPrice}!\nTake Profit: ${signal.takeProfit}\nStop Loss: ${signal.stopLoss}\nConfidence: ${signal.confidence}%`;
      await axios.post("https://ntfy.sh/AQS_Market_Signals_1849", message, {
        headers: {
          "Title": `Market Alert: ${signal.pair} ${signal.action}`,
          "Priority": "high",
          "Tags": signal.action === "BUY" ? "chart_with_upwards_trend" : "chart_with_downwards_trend"
        }
      });
      console.log(`[Notification] Sent push alert for ${signal.pair}`);
    } catch (err) {
      console.error(`[Notification] Failed to send push alert:`, err);
    }
  }
}
"""

if "const notifiedSignals = new Set<string>();" not in content:
    content = content.replace('let isScanning = false;', notified_signals_code + '\nlet isScanning = false;')


# 2. Add sendNtfyAlert call in runBackgroundScan
notify_call = """
    cachedSignals = [...newSignals, ...preservedSignals];
    cachedAllLogs = newLogs;
    totalScannedCache = CRYPTO_PAIRS.length + (isWeekend ? 0 : yahooPairs.length);
    lastScanTime = Date.now();
    console.log(`[Scanner] Background scan completed. Active signals: ${cachedSignals.length}.`);

    // Send push notifications for new signals
    for (const signal of newSignals) {
       await sendNtfyAlert(signal);
    }
"""

content = content.replace("""    cachedSignals = [...newSignals, ...preservedSignals];
    cachedAllLogs = newLogs;
    totalScannedCache = CRYPTO_PAIRS.length + (isWeekend ? 0 : yahooPairs.length);
    lastScanTime = Date.now();
    console.log(`[Scanner] Background scan completed. Active signals: ${cachedSignals.length}.`);""", notify_call)


# 3. Change interval from 30000 to 120000
content = content.replace("30000); // Trigger every 30s", "120000); // Trigger every 2m")

with open('server.ts', 'w') as f:
    f.write(content)

