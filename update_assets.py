import re

with open('server.ts', 'r') as f:
    content = f.read()

# 1. Add global state
if "let activeSelectedAssets" not in content:
    content = content.replace('let activeTimeframe = "30m";', 'let activeTimeframe = "30m";\nlet activeSelectedAssets: string[] = ["crypto", "forex", "commodity", "index", "stock"];')

# 2. Update sendNtfyAlert
send_ntfy_code = """async function sendNtfyAlert(signal: Signal) {
  if (!activeSelectedAssets.includes(signal.type.toLowerCase())) return;
  const sigId = `${signal.pair}-${signal.time}-${signal.action}`;"""
content = content.replace('async function sendNtfyAlert(signal: Signal) {\n  const sigId = `${signal.pair}-${signal.time}-${signal.action}`;', send_ntfy_code)

# 3. Update the scan API
scan_code_old = """    const assetsQuery = req.query.assets as string | undefined;
    let selectedAssets: string[];
    if (assetsQuery === undefined) {
      selectedAssets = ['crypto', 'forex', 'commodity', 'index', 'stock'];
    } else if (assetsQuery === "") {
      selectedAssets = [];
    } else {
      selectedAssets = assetsQuery.toLowerCase().split(',');
    }"""

scan_code_new = """    const assetsQuery = req.query.assets as string | undefined;
    let selectedAssets: string[];
    if (assetsQuery === undefined) {
      selectedAssets = activeSelectedAssets;
    } else if (assetsQuery === "") {
      selectedAssets = [];
      activeSelectedAssets = selectedAssets;
    } else {
      selectedAssets = assetsQuery.toLowerCase().split(',');
      activeSelectedAssets = selectedAssets;
    }"""
content = content.replace(scan_code_old, scan_code_new)

with open('server.ts', 'w') as f:
    f.write(content)

