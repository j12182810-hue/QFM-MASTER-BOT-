const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /div className=\{\`max-w-7xl mx-auto mt-6 px-4 sm:px-6\`\}>[\s\S]*?Test Alert\s*<\/button>\s*<\/div>\s*<\/div>\s*<\/div>/;
code = code.replace(regex, "");

fs.writeFileSync('src/App.tsx', code);
console.log("Removed properly");
