import re

with open('server.ts', 'r') as f:
    content = f.read()

test_endpoint = """
app.get("/api/test-signal", async (req, res) => {
  try {
    const testSignal: Signal = {
      pair: "TEST_PAIR",
      name: "TEST_PAIR",
      type: "Crypto",
      action: "BUY",
      entryZone: [1000, 1010],
      stopLoss: 950,
      takeProfit: 1100,
      currentPrice: 1005,
      confidence: 99,
      time: Date.now(),
      rrRatio: 2.5,
      layer1Bias: "Test Bias",
      layer2Zone: "Test Zone",
      layer25RR: "Test RR",
      layer3Confirm: "Test Confirm",
      layer4Filter: "Test Filter",
      layer5Exec: "Test Exec"
    };
    
    // We remove it from notifiedSignals if it was there to allow multiple tests
    const sigId = `${testSignal.pair}-${testSignal.time}-${testSignal.action}`;
    
    await sendNtfyAlert(testSignal);
    
    res.json({ success: true, message: "Test signal sent" });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

"""

content = content.replace('app.get("/api/scan", async (req, res) => {', test_endpoint + 'app.get("/api/scan", async (req, res) => {')

with open('server.ts', 'w') as f:
    f.write(content)

