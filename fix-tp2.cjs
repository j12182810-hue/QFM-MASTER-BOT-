const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replaceAll(
    "{displaySignal.takeProfit2 ? ` | TP2: ${displaySignal.takeProfit2.toFixed(5)}` : ''}",
    "{displaySignal.takeProfit2 && displaySignal.takeProfit2 !== displaySignal.takeProfit ? ` | TP2: ${displaySignal.takeProfit2.toFixed(5)}` : ''}"
);

fs.writeFileSync('src/App.tsx', code);
