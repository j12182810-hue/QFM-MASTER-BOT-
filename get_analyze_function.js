const fs = require('fs');
const content = fs.readFileSync('server.ts', 'utf8');
const startMatch = content.indexOf('function analyzeMarketStructure(');
let openBrackets = 0;
let endIdx = -1;
for (let i = startMatch; i < content.length; i++) {
    if (content[i] === '{') openBrackets++;
    else if (content[i] === '}') {
        openBrackets--;
        if (openBrackets === 0) {
            endIdx = i;
            break;
        }
    }
}
console.log(content.substring(startMatch, endIdx + 1));
