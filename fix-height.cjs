const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
    'h-[calc(100vh-140px)] min-h-[600px]',
    'h-[600px] xl:h-[calc(100vh-160px)] xl:max-h-[850px]'
);

fs.writeFileSync('src/App.tsx', code);
console.log('Fixed height');
