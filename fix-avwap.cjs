const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const avwapFunc = `
function calculateAVWAP(candles: Candle[]): { avwap: number, stdDev: number } {
  if (candles.length === 0) return { avwap: 0, stdDev: 0 };
  let cumVol = 0;
  let cumVP = 0;
  for (const c of candles) {
    const tp = (c.high + c.low + c.close) / 3;
    cumVP += tp * c.volume;
    cumVol += c.volume;
  }
  const avwap = cumVol > 0 ? cumVP / cumVol : candles[candles.length - 1].close;

  let cumVar = 0;
  for (const c of candles) {
    const tp = (c.high + c.low + c.close) / 3;
    cumVar += c.volume * Math.pow(tp - avwap, 2);
  }
  const variance = cumVol > 0 ? cumVar / cumVol : 0;
  return { avwap, stdDev: Math.sqrt(variance) };
}
`;

if (!code.includes('function calculateAVWAP')) {
    code = code.replace('function calculateDailyVwap', avwapFunc + '\nfunction calculateDailyVwap');
}

const avwapCalc = `
  const vpStartIdx = findRecentMajorSwingPoint(candles, 300, 20);
  const vpCandles = candles.slice(vpStartIdx);
  const avwapData = calculateAVWAP(vpCandles);
`;
code = code.replace(/const vpStartIdx = findRecentMajorSwingPoint[^\n]+\n[^\n]+const vpCandles = candles\.slice\(vpStartIdx\);/, avwapCalc.trim());

// For Bullish TP/SL
const bullishReplace = `
      // TP and SL measured by AVWAP
      const distanceToAvwap = Math.abs(currentPrice - avwapData.avwap);
      // Risk is either distance to AVWAP, or if too close, use 1 standard deviation
      const riskDistance = Math.max(distanceToAvwap, avwapData.stdDev, currentPrice * 0.005);
      const slPrice = currentPrice - riskDistance;
      
      const tp = currentPrice + (riskDistance * 1.5);
      const tp2 = currentPrice + (riskDistance * 2.5);
`;
const bullishRegex = /const riskDistance = Math\.max\(currentPrice - combinedVal, currentPrice \* 0\.005\);\s*const slPrice = currentPrice - riskDistance;\s*\/\/ Target Profile High or next liquidity[\s\S]*?(?=const actualRR =)/;
code = code.replace(bullishRegex, bullishReplace + '\n      ');

// For Bearish TP/SL
const bearishReplace = `
      // TP and SL measured by AVWAP
      const distanceToAvwap = Math.abs(currentPrice - avwapData.avwap);
      const riskDistance = Math.max(distanceToAvwap, avwapData.stdDev, currentPrice * 0.005);
      const slPrice = currentPrice + riskDistance;
      
      const tp = currentPrice - (riskDistance * 1.5);
      const tp2 = currentPrice - (riskDistance * 2.5);
`;
const bearishRegex = /const riskDistance = Math\.max\(combinedVah - currentPrice, currentPrice \* 0\.005\);\s*const slPrice = currentPrice \+ riskDistance;\s*const profileLow = volBins\[0\]\.low;[\s\S]*?(?=const actualRR =)/;
code = code.replace(bearishRegex, bearishReplace + '\n      ');

fs.writeFileSync('server.ts', code);
console.log('Fixed AVWAP TP/SL in server.ts');
