import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

# For BUY
old_buy = r"TP: \{displaySignal\.takeProfit\.toFixed\(5\)\}"
new_buy = r"TP1: {displaySignal.takeProfit.toFixed(5)}{displaySignal.takeProfit2 ? ` | TP2: ${displaySignal.takeProfit2.toFixed(5)}` : ''}"
content = re.sub(old_buy, new_buy, content)

with open('src/App.tsx', 'w') as f:
    f.write(content)
