import re

with open('server.ts', 'r') as f:
    content = f.read()

# 1. Update interface Signal
content = content.replace(
    'takeProfit: number;',
    'takeProfit: number;\n  takeProfit2?: number;'
)

# 2. Inside analyzeMarketStructure, for BUY
buy_old = r"(let tp = profileHigh;\s*if \(tp <= currentPrice \+ \(riskDistance \* 1\.5\)\) \{\s*tp = currentPrice \+ \(riskDistance \* 2\.0\);\s*\})"
buy_new = r"""\1
      
      const swings = findSwings(candles, 10);
      let tp2 = tp;
      const validHighs = swings.highs.filter(h => h.val > tp);
      if (validHighs.length > 0) {
          // Get the most recent one or the lowest one above tp
          tp2 = validHighs[validHighs.length - 1].val;
      } else {
          tp2 = tp + (riskDistance * 2.0); // Fallback
      }
"""
content = re.sub(buy_old, buy_new, content)

# 3. Add to bestSignal = { ... } for BUY
sig_buy_old = r"(takeProfit: tp, currentPrice,)"
sig_buy_new = r"takeProfit: tp, takeProfit2: tp2, currentPrice,"
content = re.sub(sig_buy_old, sig_buy_new, content, count=1)

# 4. Inside analyzeMarketStructure, for SELL
sell_old = r"(let tp = profileLow;\s*if \(tp >= currentPrice - \(riskDistance \* 1\.5\)\) \{\s*tp = currentPrice - \(riskDistance \* 2\.0\);\s*\})"
sell_new = r"""\1
      
      const swings = findSwings(candles, 10);
      let tp2 = tp;
      const validLows = swings.lows.filter(l => l.val < tp);
      if (validLows.length > 0) {
          // Get the most recent one
          tp2 = validLows[validLows.length - 1].val;
      } else {
          tp2 = tp - (riskDistance * 2.0); // Fallback
      }
"""
content = re.sub(sell_old, sell_new, content)

# 5. Add to bestSignal = { ... } for SELL
# Since we replaced the first occurrence for BUY, the second one will be for SELL
content = re.sub(sig_buy_old, sig_buy_new, content, count=1)

with open('server.ts', 'w') as f:
    f.write(content)
