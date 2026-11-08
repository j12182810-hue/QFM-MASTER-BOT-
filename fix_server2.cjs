const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const regex = /next\(\); next\(\); next\(\);\s*\}\);\s*next\(\); next\(\); next\(\);\s*\}\);\s*\}/m;
content = content.replace(regex, `      next(); next(); next();
    });`);

fs.writeFileSync('server.ts', content);
console.log('Fixed syntax error.');
