import re

with open('server.ts', 'r') as f:
    content = f.read()

# Change test-signal to use a direct axios post instead of sendBatchedNtfyAlerts
# just to be absolutely sure it sends.

old_code = """    // We remove it from notifiedSignals if it was there to allow multiple tests
    const sigId = `${testSignal.pair}-${testSignal.time}-${testSignal.action}`;
    
    await sendBatchedNtfyAlerts([testSignal]);
    
    res.json({ success: true, message: "Test signal sent" });"""

new_code = """    // Send directly
    let message = `TEST ALERT: 🚀 AQS Spotted a new ${testSignal.action} signal for ${testSignal.pair} at ${testSignal.currentPrice}\\nTP: ${testSignal.takeProfit} | SL: ${testSignal.stopLoss} | Conf: ${testSignal.confidence}%`;
    await axios.post("https://ntfy.sh/QFM_MASTER_BOT", message, {
        headers: {
          "Title": `Market Alert: ${testSignal.pair} ${testSignal.action}`,
          "Priority": "high",
          "Tags": "rotating_light,chart_with_upwards_trend"
        }
    });
    
    res.json({ success: true, message: "Test signal sent" });"""

content = content.replace(old_code, new_code)

with open('server.ts', 'w') as f:
    f.write(content)
