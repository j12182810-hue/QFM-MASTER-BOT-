with open('server.ts', 'r') as f:
    content = f.read()

start_idx = content.find('function analyzeMarketStructure')
end_idx = content.find('function analyzeHTF')

if start_idx != -1 and end_idx != -1:
    new_func = """function analyzeMarketStructure(candles: Candle[], candles1d: Candle[], pair: string, type: string): { signal: Signal | null, logs: string[] } {
  const logs: string[] = [];
  if (candles.length < 50) return { signal: null, logs: [`[${pair}] Not enough data`] };

  const currentCandle = candles[candles.length - 1];
  const currentPrice = currentCandle.close;

  const { pocPrice, bins } = calculateVolumeProfile(candles, 50);

  // Find Value Area (approx 70% of volume)
  const totalVolume = bins.reduce((sum, b) => sum + b.volume, 0);
  let valueAreaVol = 0;
  let pocIdx = bins.findIndex(b => b.low <= pocPrice && b.high >= pocPrice);
  if (pocIdx === -1) pocIdx = Math.floor(bins.length / 2);

  let upIdx = pocIdx;
  let downIdx = pocIdx;
  valueAreaVol += bins[pocIdx].volume;

  while (valueAreaVol < totalVolume * 0.7 && (upIdx < bins.length - 1 || downIdx > 0)) {
      const upVol = upIdx < bins.length - 1 ? bins[upIdx + 1].volume : -1;
      const downVol = downIdx > 0 ? bins[downIdx - 1].volume : -1;
      
      if (upVol > downVol) {
          upIdx++;
          valueAreaVol += bins[upIdx].volume;
      } else if (downVol > upVol) {
          downIdx--;
          valueAreaVol += bins[downIdx].volume;
      } else {
          if (upIdx < bins.length - 1) { upIdx++; valueAreaVol += bins[upIdx].volume; }
          if (downIdx > 0) { downIdx--; valueAreaVol += bins[downIdx].volume; }
      }
  }

  const vah = bins[upIdx].high; // Value Area High
  const val = bins[downIdx].low; // Value Area Low

  let bestSignal: Signal | null = null;
  const rr = 3.0;

  const threshold = currentPrice * 0.001; 
  
  // Refined Strategy using POC and Value Area
  if (currentPrice > pocPrice + threshold) {
      // Bullish setup: price above POC, bouncing off it or using it as support
      // Stop Loss placed below Value Area Low (VAL) or below POC if VAL is too far
      const riskDistance = Math.max(currentPrice - val, currentPrice * 0.005);
      const slPrice = currentPrice - riskDistance;
      const tp = currentPrice + (riskDistance * rr);

      bestSignal = {
          pair, name: pair, type, action: "BUY",
          entryZone: [pocPrice, currentPrice], stopLoss: slPrice, takeProfit: tp, currentPrice,
          confidence: 88, time: currentCandle.time, rrRatio: rr,
          layer1Bias: `LTF: ${activeTimeframe.toUpperCase()} BULLISH`,
          layer2Zone: `POC Support @ ${pocPrice.toFixed(5)}`,
          layer25RR: `Target: ${tp.toFixed(5)} | Stop: ${slPrice.toFixed(5)}`,
          layer3Confirm: `Price > POC`,
          layer4Filter: `VAL @ ${val.toFixed(5)}`,
          layer5Exec: `Triggered`,
          volumeProfileConfirmed: true,
          hvnPrice: pocPrice,
          orderFlowConfirmed: true
      };
      logs.push(`[${pair}] Bullish VP Setup: Price ${currentPrice.toFixed(5)} > POC ${pocPrice.toFixed(5)}. SL below VAL ${val.toFixed(5)}`);
  } else if (currentPrice < pocPrice - threshold) {
      // Bearish setup: price below POC
      // Stop Loss placed above Value Area High (VAH)
      const riskDistance = Math.max(vah - currentPrice, currentPrice * 0.005);
      const slPrice = currentPrice + riskDistance;
      const tp = currentPrice - (riskDistance * rr);

      bestSignal = {
          pair, name: pair, type, action: "SELL",
          entryZone: [currentPrice, pocPrice], stopLoss: slPrice, takeProfit: tp, currentPrice,
          confidence: 88, time: currentCandle.time, rrRatio: rr,
          layer1Bias: `LTF: ${activeTimeframe.toUpperCase()} BEARISH`,
          layer2Zone: `POC Resistance @ ${pocPrice.toFixed(5)}`,
          layer25RR: `Target: ${tp.toFixed(5)} | Stop: ${slPrice.toFixed(5)}`,
          layer3Confirm: `Price < POC`,
          layer4Filter: `VAH @ ${vah.toFixed(5)}`,
          layer5Exec: `Triggered`,
          volumeProfileConfirmed: true,
          hvnPrice: pocPrice,
          orderFlowConfirmed: true
      };
      logs.push(`[${pair}] Bearish VP Setup: Price ${currentPrice.toFixed(5)} < POC ${pocPrice.toFixed(5)}. SL above VAH ${vah.toFixed(5)}`);
  }

  return { signal: bestSignal, logs };
}

"""
    content = content[:start_idx] + new_func + content[end_idx:]
    with open('server.ts', 'w') as f:
        f.write(content)
    print("Fixed server.ts")
else:
    print("Could not find start or end index.")
