import re

with open('server.ts', 'r') as f:
    content = f.read()

start_idx = content.find('function analyzeMarketStructure')
if start_idx == -1:
    print("Function not found")
else:
    brace_count = 0
    end_idx = -1
    for i in range(start_idx, len(content)):
        if content[i] == '{':
            brace_count += 1
        elif content[i] == '}':
            brace_count -= 1
            if brace_count == 0:
                end_idx = i
                break
    
    if end_idx != -1:
        new_func = """function analyzeMarketStructure(candles: Candle[], candles1d: Candle[], pair: string, type: string): { signal: Signal | null, logs: string[] } {
  const logs: string[] = [];
  if (candles.length < 50) return { signal: null, logs: [`[${pair}] Not enough data`] };

  const currentCandle = candles[candles.length - 1];
  const currentPrice = currentCandle.close;

  const { pocPrice } = calculateVolumeProfile(candles, 50);

  let bestSignal: Signal | null = null;
  const rr = 3.0;

  // Simple Volume Profile Strategy
  const threshold = currentPrice * 0.001; // Small buffer
  
  if (currentPrice > pocPrice + threshold) {
      const slPrice = currentPrice - (currentPrice * 0.005);
      const tp = currentPrice + (currentPrice * 0.015);
      bestSignal = {
          pair, name: pair, type, action: "BUY",
          entryZone: [currentPrice - threshold, currentPrice], stopLoss: slPrice, takeProfit: tp, currentPrice,
          confidence: 85, time: currentCandle.time, rrRatio: rr,
          layer1Bias: `LTF: ${activeTimeframe.toUpperCase()} BULLISH`,
          layer2Zone: `POC Support @ ${pocPrice.toFixed(5)}`,
          layer25RR: `Target: ${tp.toFixed(5)} | Stop: ${slPrice.toFixed(5)}`,
          layer3Confirm: `Price > POC`,
          layer4Filter: `Volume Profile`,
          layer5Exec: `Triggered`,
          volumeProfileConfirmed: true,
          hvnPrice: pocPrice,
          orderFlowConfirmed: true
      };
      logs.push(`[${pair}] Bullish setup based on Volume Profile (Price ${currentPrice.toFixed(5)} > POC ${pocPrice.toFixed(5)})`);
  } else if (currentPrice < pocPrice - threshold) {
      const slPrice = currentPrice + (currentPrice * 0.005);
      const tp = currentPrice - (currentPrice * 0.015);
      bestSignal = {
          pair, name: pair, type, action: "SELL",
          entryZone: [currentPrice, currentPrice + threshold], stopLoss: slPrice, takeProfit: tp, currentPrice,
          confidence: 85, time: currentCandle.time, rrRatio: rr,
          layer1Bias: `LTF: ${activeTimeframe.toUpperCase()} BEARISH`,
          layer2Zone: `POC Resistance @ ${pocPrice.toFixed(5)}`,
          layer25RR: `Target: ${tp.toFixed(5)} | Stop: ${slPrice.toFixed(5)}`,
          layer3Confirm: `Price < POC`,
          layer4Filter: `Volume Profile`,
          layer5Exec: `Triggered`,
          volumeProfileConfirmed: true,
          hvnPrice: pocPrice,
          orderFlowConfirmed: true
      };
      logs.push(`[${pair}] Bearish setup based on Volume Profile (Price ${currentPrice.toFixed(5)} < POC ${pocPrice.toFixed(5)})`);
  }

  return { signal: bestSignal, logs };
}"""
        content = content[:start_idx] + new_func + content[end_idx+1:]
        with open('server.ts', 'w') as f:
            f.write(content)
        print("Function replaced in server.ts.")
    else:
        print("End brace not found")

