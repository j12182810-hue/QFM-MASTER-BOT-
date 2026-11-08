const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// For Bullish TP/SL
const bullishReplace = `
      // Stop loss using Volume Profile and TPO (Value Area Low)
      const riskDistance = Math.max(currentPrice - combinedVal, currentPrice * 0.005);
      const slPrice = currentPrice - riskDistance;
      
      // TP measured by AVWAP
      const distanceToAvwap = Math.abs(currentPrice - avwapData.avwap);
      const tpDistance = Math.max(distanceToAvwap, avwapData.stdDev * 2);
      const tp = currentPrice + Math.max(tpDistance, riskDistance * 1.5);
      const tp2 = tp; // Look for one TP
`;
const bullishRegex = /\/\/ TP and SL measured by AVWAP\s*const distanceToAvwap = Math\.abs\(currentPrice - avwapData\.avwap\);\s*\/\/ Risk is either distance to AVWAP, or if too close, use 1 standard deviation\s*const riskDistance = Math\.max\(distanceToAvwap, avwapData\.stdDev, currentPrice \* 0\.005\);\s*const slPrice = currentPrice - riskDistance;\s*const tp = currentPrice \+ \(riskDistance \* 1\.5\);\s*const tp2 = currentPrice \+ \(riskDistance \* 2\.5\);/;
code = code.replace(bullishRegex, bullishReplace.trim());

// For Bearish TP/SL
const bearishReplace = `
      // Stop loss using Volume Profile and TPO (Value Area High)
      const riskDistance = Math.max(combinedVah - currentPrice, currentPrice * 0.005);
      const slPrice = currentPrice + riskDistance;
      
      // TP measured by AVWAP
      const distanceToAvwap = Math.abs(currentPrice - avwapData.avwap);
      const tpDistance = Math.max(distanceToAvwap, avwapData.stdDev * 2);
      const tp = currentPrice - Math.max(tpDistance, riskDistance * 1.5);
      const tp2 = tp; // Look for one TP
`;
const bearishRegex = /\/\/ TP and SL measured by AVWAP\s*const distanceToAvwap = Math\.abs\(currentPrice - avwapData\.avwap\);\s*const riskDistance = Math\.max\(distanceToAvwap, avwapData\.stdDev, currentPrice \* 0\.005\);\s*const slPrice = currentPrice \+ riskDistance;\s*const tp = currentPrice - \(riskDistance \* 1\.5\);\s*const tp2 = currentPrice - \(riskDistance \* 2\.5\);/;
code = code.replace(bearishRegex, bearishReplace.trim());

fs.writeFileSync('server.ts', code);
console.log('Fixed TP/SL logic');
