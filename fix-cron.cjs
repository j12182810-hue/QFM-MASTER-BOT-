const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const target = `
app.get("/api/cron", async (req, res) => {
  if (!isScanning) {
    runBackgroundScan(); // Trigger asynchronously
  }
  res.json({ success: true, message: "Cron triggered" });
});
`;

code = code.replace(target, '');
code = code.replace('app.get("/api/scan", async (req, res) => {', target + '\napp.get("/api/scan", async (req, res) => {');

fs.writeFileSync('server.ts', code);
console.log('Fixed cron route in server.ts');
