const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
    /className=\{\`border-t \$\{theme === 'dark' \? 'border-white\/5 bg-slate-900' : 'border-slate-200 bg-white'\} z-10 relative mt-auto transition-colors duration-300\`\}/g,
    'className={`border-t ${theme === \'dark\' ? \'border-white/5 bg-slate-900\' : \'border-slate-200 bg-white\'} z-10 relative mt-8 transition-colors duration-300`}'
);

fs.writeFileSync('src/App.tsx', code);
console.log('Fixed footer 2');
