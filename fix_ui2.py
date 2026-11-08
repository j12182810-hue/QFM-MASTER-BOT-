import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

ntfy_regex = r"<div className=\{`mt-6 \$\{theme === 'dark' \? 'bg-amber-500/10 border-amber-500/20 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-800'\} border rounded-xl p-4 flex flex-col sm:flex-row items-center gap-4 transition-colors`\}>.*?</code >\n\s*</div>"

# Use a non-greedy match to grab the whole div
ntfy_regex2 = r"<div className=\{`mt-6 \$\{theme === 'dark' \? 'bg-amber-500/10 border-amber-500/20 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-800'\}.*?QFM_MASTER_BOT</code>\s*</div>"

new_push_html = """
            <div className={`mt-6 ${theme === 'dark' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200' : 'bg-emerald-50 border-emerald-200 text-emerald-800'} border rounded-xl p-4 flex flex-col sm:flex-row items-center gap-4 transition-colors`}>
              <div className={`p-3 rounded-full ${theme === 'dark' ? 'bg-emerald-500/20' : 'bg-emerald-100'} shrink-0`}>
                <Bell className="w-5 h-5" />
              </div>
              <div className="flex-1 text-sm">
                <strong>Native Offline Push Notifications:</strong>
                <p className={`mt-1 ${theme === 'dark' ? 'text-emerald-200/70' : 'text-emerald-700/80'}`}>
                  We have built a native offline notification system. Click below to allow notifications and receive signals directly on your device, even when the browser is closed.
                </p>
              </div>
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
                {isSubscribed ? 'Subscribed' : 'Enable Notifications'}
              </button>
            </div>"""

content = re.sub(ntfy_regex2, new_push_html.strip(), content, flags=re.DOTALL)

with open('src/App.tsx', 'w') as f:
    f.write(content)
