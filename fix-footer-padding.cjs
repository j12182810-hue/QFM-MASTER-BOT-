const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
    'className="max-w-7xl mx-auto px-4 sm:px-6 py-4"',
    'className="max-w-7xl mx-auto px-4 sm:px-6 py-3"'
);

code = code.replace(
    'mt-8 pt-6 border-t',
    'mt-4 pt-4 border-t'
);

code = code.replace(
    'mt-8 p-6 rounded-xl border',
    'mt-4 p-4 rounded-xl border'
);

fs.writeFileSync('src/App.tsx', code);
console.log('Fixed footer padding');
