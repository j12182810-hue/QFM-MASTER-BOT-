import re

with open("server.ts", "r") as f:
    content = f.read()

analyze_models = """  // 3.5 Order Flow Delta Validation
  const ofData = calculateOrderFlowDelta(candles, 5);
  const orderFlowStrong = ofData.ratio > 0.15; // 15% imbalance is significant
  
  // 3.6 Delta Notional Exposure [DNE] and Open Interest Change [OIC]
  const dneData = calculateDeltaNotionalExposure(candles, 20);
  const oicData = calculateOpenInterestChange(candles, 10);
"""

content = content.replace("  // 3.5 Order Flow Delta Validation\n  const ofData = calculateOrderFlowDelta(candles, 5);\n  const orderFlowStrong = ofData.ratio > 0.15; // 15% imbalance is significant", analyze_models)

buy_filters = """      if (!vannaBullish) {
          logs.push(`[${pair}] BUY Reject: Vanna Model does not support bullish momentum (Strength: ${vannaStrength.toFixed(6)})`);
          return { signal: null, logs };
      }
      
      if (!dneData.isBullish) {
          logs.push(`[${pair}] BUY Reject: Delta Notional Exposure (DNE) is negative (${dneData.normalizedDNE.toFixed(4)})`);
          return { signal: null, logs };
      }
      if (!oicData.isSupportive) {
          logs.push(`[${pair}] BUY Reject: Open Interest Change (OIC) is not supportive (Trend: ${oicData.trend})`);
          return { signal: null, logs };
      }"""

content = content.replace("""      if (!vannaBullish) {\n          logs.push(`[${pair}] BUY Reject: Vanna Model does not support bullish momentum (Strength: ${vannaStrength.toFixed(6)})`);\n          return { signal: null, logs };\n      }""", buy_filters)

sell_filters = """      if (gexData.isPositiveGexZone) {
          logs.push(`[${pair}] SELL Reject: Gamma Exposure is in Positive Dealer Zone`);
          return { signal: null, logs };
      }
      
      if (dneData.isBullish) {
          logs.push(`[${pair}] SELL Reject: Delta Notional Exposure (DNE) is positive (${dneData.normalizedDNE.toFixed(4)})`);
          return { signal: null, logs };
      }
      if (!oicData.isSupportive) {
          logs.push(`[${pair}] SELL Reject: Open Interest Change (OIC) is not supportive (Trend: ${oicData.trend})`);
          return { signal: null, logs };
      }"""

content = content.replace("""      if (gexData.isPositiveGexZone) {\n          logs.push(`[${pair}] SELL Reject: Gamma Exposure is in Positive Dealer Zone`);\n          return { signal: null, logs };\n      }""", sell_filters)

with open("server.ts", "w") as f:
    f.write(content)
print("Updated analyze logic.")
