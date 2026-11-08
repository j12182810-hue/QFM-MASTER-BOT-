import re

with open('server.ts', 'r') as f:
    content = f.read()

cron_code = """
app.get("/api/cron", async (req, res) => {
  if (!isScanning) {
    runBackgroundScan(); // Trigger asynchronously
  }
  res.json({ success: true, message: "Cron triggered" });
});
"""

# Insert before app.get("*")
content = re.sub(r'(\s+app\.get\("\*", \(req, res\) => \{)', cron_code + r'\1', content)

with open('server.ts', 'w') as f:
    f.write(content)
