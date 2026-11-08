const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const findSwingsIndex = code.indexOf('function findSwings');
const findSwingsEnd = code.indexOf('}', code.indexOf('return { highs, lows };')) + 1;

const liqFunction = `
function findLiquidityZones(candles) {
    const currentPrice = candles[candles.length - 1].close;
    const swings = findSwings(candles, 5); 
    const unmitigatedHighs = swings.highs.filter(h => h.val > currentPrice).sort((a, b) => a.val - b.val);
    const unmitigatedLows = swings.lows.filter(l => l.val < currentPrice).sort((a, b) => b.val - a.val);

    const fvgsAbove = [];
    const fvgsBelow = [];
    for (let i = Math.max(1, candles.length - 100); i < candles.length - 1; i++) {
        const c1 = candles[i-1];
        const c3 = candles[i+1];
        if (!c1 || !c3) continue;
        if (c1.low > c3.high && c3.high > currentPrice) {
            fvgsAbove.push(c1.low);
        }
        if (c1.high < c3.low && c3.low < currentPrice) {
            fvgsBelow.push(c1.high);
        }
    }

    return { 
        liquidityAbove: [...unmitigatedHighs.map(h => h.val), ...fvgsAbove].sort((a, b) => a - b),
        liquidityBelow: [...unmitigatedLows.map(l => l.val), ...fvgsBelow].sort((a, b) => b - a)
    };
}
`;

if (!code.includes('findLiquidityZones')) {
    code = code.slice(0, findSwingsEnd) + '\n' + liqFunction + code.slice(findSwingsEnd);
}

const bullishTP = `      // TP measured by Liquidity Zones (FVG / Swings) above VAH
      const liqZones = findLiquidityZones(candlesStruct);
      let tp1 = liqZones.liquidityAbove.find(p => p > Math.max(currentPrice, combinedVah));
      if (!tp1) tp1 = Math.max(combinedVah, currentPrice) + riskDistance * 1.5;
      
      let tp2 = liqZones.liquidityAbove.find(p => p > tp1);
      if (!tp2) tp2 = tp1 + riskDistance; // Extended target
      
      const tp = tp1;`;

const bullishOld = `      // TP measured by AVWAP
      const distanceToAvwap = Math.abs(currentPrice - avwapData.avwap);
      const tpDistance = Math.max(distanceToAvwap, avwapData.stdDev * 2);
      const tp = currentPrice + Math.max(tpDistance, riskDistance * 1.5);
      const tp2 = tp; // Look for one TP`;

const bearishTP = `      // TP measured by Liquidity Zones (FVG / Swings) below VAL
      const liqZones = findLiquidityZones(candlesStruct);
      let tp1 = liqZones.liquidityBelow.find(p => p < Math.min(currentPrice, combinedVal));
      if (!tp1) tp1 = Math.min(combinedVal, currentPrice) - riskDistance * 1.5;

      let tp2 = liqZones.liquidityBelow.find(p => p < tp1);
      if (!tp2) tp2 = tp1 - riskDistance; // Extended target

      const tp = tp1;`;

const bearishOld = `      // TP measured by AVWAP
      const distanceToAvwap = Math.abs(currentPrice - avwapData.avwap);
      const tpDistance = Math.max(distanceToAvwap, avwapData.stdDev * 2);
      const tp = currentPrice - Math.max(tpDistance, riskDistance * 1.5);
      const tp2 = tp; // Look for one TP`;

code = code.replace(bullishOld, bullishTP);
code = code.replace(bearishOld, bearishTP);

fs.writeFileSync('server.ts', code);
console.log('Fixed TP');
