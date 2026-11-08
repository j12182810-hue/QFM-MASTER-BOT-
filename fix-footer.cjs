const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
    'className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10 grid grid-cols-1 xl:grid-cols-12 gap-6 sm:gap-8 relative z-10"',
    'className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 grid grid-cols-1 xl:grid-cols-12 gap-6 sm:gap-8 relative z-10"'
);

code = code.replace(
    /className=\{\`border-t \$\{theme === 'dark' \? 'border-white\/5 bg-slate-900' : 'border-slate-200 bg-white'\} z-10 relative mt-8 transition-colors duration-300\`\}/g,
    'className={`border-t ${theme === \'dark\' ? \'border-white/5 bg-slate-900\' : \'border-slate-200 bg-white\'} z-10 relative mt-auto transition-colors duration-300`}'
);

code = code.replace(
    'className="max-w-7xl mx-auto px-4 sm:px-6 py-8"',
    'className="max-w-7xl mx-auto px-4 sm:px-6 py-4"'
);

fs.writeFileSync('src/App.tsx', code);
console.log('Fixed footer');
