const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replaceAll(
    "layer25RR: `RR: ${actualRR} (TP: ${tp.toFixed(5)})`,",
    "layer25RR: `RR: ${actualRR} (TP1: ${tp.toFixed(5)}${tp2 && tp2 !== tp ? ' | TP2: ' + tp2.toFixed(5) : ''})`,"
);

fs.writeFileSync('server.ts', code);
console.log('Fixed layer25RR');
