const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const targetLine = "const [adminKeyInfo, setAdminKeyInfo] = useState<{currentKey: string, expiresIn: number} | null>(null);";
const replacement = targetLine + `

  useEffect(() => {
    const interval = setInterval(() => {
        setAdminKeyInfo(prev => {
            if (prev && prev.expiresIn > 0) {
                return { ...prev, expiresIn: prev.expiresIn - 1 };
            }
            return prev;
        });
    }, 1000);
    return () => clearInterval(interval);
  }, []);
`;

code = code.replace(targetLine, replacement);
fs.writeFileSync('src/App.tsx', code);
console.log('Fixed countdown');
