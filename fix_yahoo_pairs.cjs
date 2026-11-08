const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const replacement = `    let yahooPairs = [];
    if (selectedAssets.includes('forex')) yahooPairs.push(...FOREX_PAIRS.map(p => ({ pair: p, type: "Forex" })));
    if (selectedAssets.includes('commodity')) yahooPairs.push(...COMMODITY_PAIRS.map(p => ({ pair: p, type: "Commodity" })));
    if (selectedAssets.includes('index')) yahooPairs.push(...INDEX_PAIRS.map(p => ({ pair: p, type: "Index" })));
    if (selectedAssets.includes('stock')) yahooPairs.push(...STOCK_PAIRS.map(p => ({ pair: p, type: "Stock" })));
`;

content = content.replace(/const yahooPairs = \[\s*\.\.\.FOREX_PAIRS[\s\S]*?\];/, replacement);

fs.writeFileSync('server.ts', content);
console.log('Fixed yahoo pairs filtering.');
