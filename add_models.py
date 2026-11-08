import re

with open("server.ts", "r") as f:
    content = f.read()

models_code = """
function calculateDeltaNotionalExposure(candles: Candle[], lookback: number = 20): { dne: number, normalizedDNE: number, isBullish: boolean } {
  if (candles.length === 0) return { dne: 0, normalizedDNE: 0, isBullish: false };
  let dne = 0;
  let totalNotional = 0;
  const start = Math.max(0, candles.length - lookback);
  for (let i = start; i < candles.length; i++) {
    const c = candles[i];
    let candleDelta = 0;
    if (c.takerBuyBaseVolume !== undefined) {
      const takerBuy = c.takerBuyBaseVolume;
      const takerSell = c.volume - takerBuy;
      candleDelta = takerBuy - takerSell;
    } else {
      const range = c.high - c.low;
      if (range > 0) {
        const buyerPressure = (c.close - c.low) / range;
        const sellerPressure = (c.high - c.close) / range;
        candleDelta = (buyerPressure - sellerPressure) * c.volume;
      }
    }
    const notionalDelta = candleDelta * c.close;
    dne += notionalDelta;
    totalNotional += (c.volume * c.close);
  }
  const normalizedDNE = totalNotional > 0 ? (dne / totalNotional) : 0;
  return { dne, normalizedDNE, isBullish: normalizedDNE > 0 };
}

function calculateOpenInterestChange(candles: Candle[], lookback: number = 10): { oic: number, trend: 'expanding' | 'contracting' | 'neutral', isSupportive: boolean } {
  if (candles.length < 2) return { oic: 0, trend: 'neutral', isSupportive: false };
  let oic = 0;
  let maxVolume = 0;
  const start = Math.max(1, candles.length - lookback);
  for (let i = start; i < candles.length; i++) {
    const c = candles[i];
    const prev = candles[i-1];
    maxVolume = Math.max(maxVolume, c.volume);
    
    // Synthetic OI logic
    const isExpanding = (c.high > prev.high && c.low > prev.low) || (c.low < prev.low && c.high < prev.high);
    const isInside = c.high <= prev.high && c.low >= prev.low;
    
    if (isExpanding) {
      oic += c.volume;
    } else if (isInside) {
      oic -= c.volume;
    } else {
      oic += (c.volume * 0.1); // minor increase
    }
  }
  
  const normalizedOIC = maxVolume > 0 ? (oic / (maxVolume * lookback)) : 0;
  let trend: 'expanding' | 'contracting' | 'neutral' = 'neutral';
  if (normalizedOIC > 0.05) trend = 'expanding';
  else if (normalizedOIC < -0.05) trend = 'contracting';
  
  return { oic, trend, isSupportive: trend === 'expanding' };
}
"""

of_delta_end_index = content.find("interface GexPoint {")

if of_delta_end_index != -1:
    content = content[:of_delta_end_index] + models_code + "\n" + content[of_delta_end_index:]
    with open("server.ts", "w") as f:
        f.write(content)
    print("Models injected successfully.")
else:
    print("Could not find GexPoint interface.")
