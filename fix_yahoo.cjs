const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const replacement = `        let yIndex = 0;
        let active = 0;
        yahooPromise = new Promise(resolve => {
            const next = () => {
                if (yIndex >= yahooPairs.length) {
                    if (active === 0) resolve(undefined);
                    return;
                }
                active++;
                const item = yahooPairs[yIndex++];
                fetchYahooChart(item.pair, item.type).finally(() => {
                    active--;
                    setTimeout(next, 200);
                });
            };
            next(); next(); next();
        });`;

content = content.replace(/let yIndex = 0;[\s\S]*?next\(\); next\(\); next\(\);\s*\}\);/, replacement);

fs.writeFileSync('server.ts', content);
console.log('Fixed yahoo Promise.');
