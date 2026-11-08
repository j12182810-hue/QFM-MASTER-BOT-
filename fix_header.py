import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

old_header = r"""          <div className="shrink-0 sm:text-right flex flex-col items-center sm:items-end gap-2">
            <div className="flex flex-col items-center sm:items-end">
              <p className="text-\[10px\] font-mono opacity-80 mb-1 font-bold">1\. GET NTFY APP 2\. SUBSCRIBE TO:</p>
              <code className="text-sm font-mono font-bold bg-black/10 dark:bg-black/20 px-3 py-1\.5 rounded border border-amber-500/20 select-all tracking-wider">QFM_MASTER_BOT</code>
            </div>
            <button onClick=\{handleTestSignal\} className="text-\[10px\] font-mono font-bold px-3 py-1 bg-amber-500/20 text-amber-500 hover:bg-amber-500/30 rounded transition-colors">
              SEND TEST SIGNAL
            </button>
          </div>"""

new_header = """          <div className="shrink-0 sm:text-right flex flex-col items-center sm:items-end gap-2">
            <button
                onClick={handleSubscribe}
                disabled={isSubscribed}
                className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all shadow-lg ${
                  isSubscribed 
                    ? 'bg-slate-500 cursor-not-allowed text-white' 
                    : 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/25'
                }`}
              >
                {isSubscribed ? <CheckCircle2 className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                {isSubscribed ? 'Subscribed to Push' : 'Enable Native Push'}
            </button>
            <button onClick={handleTestSignal} className="text-[10px] font-mono font-bold px-3 py-1 bg-amber-500/20 text-amber-500 hover:bg-amber-500/30 rounded transition-colors mt-1">
              SEND TEST SIGNAL
            </button>
          </div>"""

content = re.sub(old_header, new_header, content)

with open('src/App.tsx', 'w') as f:
    f.write(content)
