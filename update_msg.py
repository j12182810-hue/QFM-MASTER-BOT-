import re

with open('server.ts', 'r') as f:
    content = f.read()

# Update batched push message
msg_old = r"let message = chunk\.map\(s => `\$\{s\.action\} \$\{s\.pair\} @ \$\{s\.currentPrice\}\\nTP: \$\{s\.takeProfit\} \| SL: \$\{s\.stopLoss\} \| Conf: \$\{s\.confidence\}%`\)\.join\('\\n\\n'\);"
msg_new = r"let message = chunk.map(s => `${s.action} ${s.pair} @ ${s.currentPrice}\\nTP1: ${s.takeProfit}${s.takeProfit2 ? ' | TP2: ' + s.takeProfit2 : ''} | SL: ${s.stopLoss} | Conf: ${s.confidence}%`).join('\\n\\n');"
content = re.sub(msg_old, msg_new, content)

# Update test push message
test_old = r"TP: \$\{testSignal\.takeProfit\} \| SL: \$\{testSignal\.stopLoss\} \| Conf: \$\{testSignal\.confidence\}%`;"
test_new = r"TP1: ${testSignal.takeProfit}${testSignal.takeProfit2 ? ' | TP2: ' + testSignal.takeProfit2 : ''} | SL: ${testSignal.stopLoss} | Conf: ${testSignal.confidence}%`;"
content = re.sub(test_old, test_new, content)

with open('server.ts', 'w') as f:
    f.write(content)
