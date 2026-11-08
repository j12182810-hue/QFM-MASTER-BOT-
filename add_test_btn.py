import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

# Add testSignal method and button
test_func = """
  const handleTestSignal = async () => {
    try {
      await fetch('/api/test-signal');
      alert("Test signal request sent!");
    } catch (err) {
      alert("Failed to send test signal: " + err);
    }
  };
"""

content = content.replace("const toggleAutoScan = () => {", test_func + "\n  const toggleAutoScan = () => {")

test_btn = """
          <div className="shrink-0 sm:text-right flex flex-col items-center sm:items-end gap-2">
            <div className="flex flex-col items-center sm:items-end">
              <p className="text-[10px] font-mono opacity-80 mb-1 font-bold">1. GET NTFY APP 2. SUBSCRIBE TO:</p>
              <code className="text-sm font-mono font-bold bg-black/10 dark:bg-black/20 px-3 py-1.5 rounded border border-amber-500/20 select-all tracking-wider">AQS_Market_Signals_1849</code>
            </div>
            <button onClick={handleTestSignal} className="text-[10px] font-mono font-bold px-3 py-1 bg-amber-500/20 text-amber-500 hover:bg-amber-500/30 rounded transition-colors">
              SEND TEST SIGNAL
            </button>
          </div>
"""

content = re.sub(r'<div className="shrink-0 sm:text-right flex flex-col items-center sm:items-end">\s*<p className="text-\[10px\] font-mono opacity-80 mb-1 font-bold">1\. GET NTFY APP 2\. SUBSCRIBE TO:</p>\s*<code className="text-sm font-mono font-bold bg-black/10 dark:bg-black/20 px-3 py-1\.5 rounded border border-amber-500/20 select-all tracking-wider">AQS_Market_Signals_1849</code>\s*</div>', test_btn, content)

with open('src/App.tsx', 'w') as f:
    f.write(content)

