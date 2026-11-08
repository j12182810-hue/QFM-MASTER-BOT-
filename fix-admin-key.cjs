const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const adminLogic = `
let currentAccessKey = generateRandomKey();
let keyExpiration = Date.now() + 20 * 60 * 1000;

function generateRandomKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// automated generation every 20 mins
setInterval(() => {
    currentAccessKey = generateRandomKey();
    keyExpiration = Date.now() + 20 * 60 * 1000;
}, 20 * 60 * 1000);

app.post("/api/verify-key", (req, res) => {
    const { key } = req.body;
    if (key === "AQS///BOT") {
        return res.json({ valid: true, admin: true });
    }
    if (key === currentAccessKey && Date.now() < keyExpiration) {
        return res.json({ valid: true, admin: false });
    }
    return res.json({ valid: false });
});

app.post("/api/admin/key", (req, res) => {
    const { adminKey, action } = req.body;
    if (adminKey !== "AQS///BOT") {
        return res.status(403).json({ error: "Unauthorized" });
    }
    if (action === "generate") {
        currentAccessKey = generateRandomKey();
        keyExpiration = Date.now() + 20 * 60 * 1000;
    }
    res.json({
        currentKey: currentAccessKey,
        expiresIn: Math.max(0, Math.floor((keyExpiration - Date.now()) / 1000))
    });
});
`;

if (!code.includes('/api/verify-key')) {
    code = code.replace('app.get("/api/health"', adminLogic + '\napp.get("/api/health"');
    fs.writeFileSync('server.ts', code);
    console.log('Added admin logic');
}
