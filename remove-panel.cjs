const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /<div className={`max-w-7xl mx-auto mt-6 px-4 sm:px-6`}>[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/;
// I need to be careful with the regex to match exactly that div tree.

// Let's just use replace with string matching
const startStr = "<div className={`max-w-7xl mx-auto mt-6 px-4 sm:px-6`}>";
const startIndex = code.indexOf(startStr);

if (startIndex !== -1) {
    let openDivs = 0;
    let endIndex = startIndex;
    for (let i = startIndex; i < code.length; i++) {
        if (code.substr(i, 4) === "<div") openDivs++;
        if (code.substr(i, 6) === "</div") openDivs--;
        if (openDivs === 0) {
            endIndex = i + 6;
            break;
        }
    }
    const newCode = code.substring(0, startIndex) + code.substring(endIndex + 1);
    fs.writeFileSync('src/App.tsx', newCode);
    console.log("Removed panel");
} else {
    console.log("Not found");
}
