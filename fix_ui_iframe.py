import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

import_old = "import { Activity, Target, AlertCircle, Scan, TrendingUp, TrendingDown, Zap, Shield, Ban, Box, Radar, CheckCircle2, Clock, Bell, Volume2, VolumeX, Crown, ShieldCheck, Sun, Moon } from 'lucide-react';"
import_new = "import { Activity, Target, AlertCircle, Scan, TrendingUp, TrendingDown, Zap, Shield, Ban, Box, Radar, CheckCircle2, Clock, Bell, Volume2, VolumeX, Crown, ShieldCheck, Sun, Moon, ExternalLink } from 'lucide-react';"
content = content.replace(import_old, import_new)

check_iframe_old = "const [isSubscribed, setIsSubscribed] = useState(false);"
check_iframe_new = """const [isSubscribed, setIsSubscribed] = useState(false);
  const isIframe = window !== window.parent;"""
content = content.replace(check_iframe_old, check_iframe_new)

push_ui_old = r"(<div className=\{`mt-6 \$\{theme === 'dark' \? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200' : 'bg-emerald-50 border-emerald-200 text-emerald-800'\} border rounded-xl p-4 flex flex-col sm:flex-row items-center gap-4 transition-colors`\}>.*?</button>\s*</div>)"

push_ui_new = r"""<div className={`mt-6 ${theme === 'dark' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200' : 'bg-emerald-50 border-emerald-200 text-emerald-800'} border rounded-xl p-4 flex flex-col items-center gap-4 transition-colors`}>
              <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
                <div className={`p-3 rounded-full ${theme === 'dark' ? 'bg-emerald-500/20' : 'bg-emerald-100'} shrink-0`}>
                  <Bell className="w-5 h-5" />
                </div>
                <div className="flex-1 text-sm text-center sm:text-left">
                  <strong>Native Offline Push Notifications:</strong>
                  <p className={`mt-1 ${theme === 'dark' ? 'text-emerald-200/70' : 'text-emerald-700/80'}`}>
                    We have built a native offline notification system. Click below to allow notifications and receive signals directly on your device, even when the browser is closed.
                  </p>
                </div>
                <button
                  onClick={handleSubscribe}
                  disabled={isSubscribed || isIframe}
                  className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all shadow-lg whitespace-nowrap ${
                    isSubscribed 
                      ? 'bg-slate-500 cursor-not-allowed text-white' 
                      : (isIframe ? 'bg-slate-500 opacity-50 cursor-not-allowed text-white' : 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/25')
                  }`}
                >
                  {isSubscribed ? <CheckCircle2 className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                  {isSubscribed ? 'Subscribed' : 'Enable Notifications'}
                </button>
              </div>
              {isIframe && !isSubscribed && (
                <div className="w-full flex items-center justify-center gap-2 mt-2 p-2 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded text-xs font-bold">
                  <AlertCircle className="w-4 h-4" />
                  You are viewing this in a preview iframe. Push notifications require a top-level window. Please open the app in a New Tab to subscribe.
                </div>
              )}
            </div>"""

content = re.sub(push_ui_old, push_ui_new, content, flags=re.DOTALL)

header_ui_old = r"(<button\s+onClick=\{handleSubscribe\}\s+disabled=\{isSubscribed\}\s+className=\{`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all shadow-lg \$\{\s+isSubscribed \s+\? 'bg-slate-500 cursor-not-allowed text-white' \s+: 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/25'\s+\}`\}\s+>\s+\{isSubscribed \? <CheckCircle2 className=\"w-4 h-4\" /> : <Bell className=\"w-4 h-4\" />\}\s+\{isSubscribed \? 'Subscribed to Push' : 'Enable Native Push'\}\s+</button>)"

header_ui_new = r"""<button
                onClick={handleSubscribe}
                disabled={isSubscribed || isIframe}
                title={isIframe ? "Open in a new tab to enable" : ""}
                className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all shadow-lg ${
                  isSubscribed 
                    ? 'bg-slate-500 cursor-not-allowed text-white' 
                    : (isIframe ? 'bg-slate-500 opacity-50 cursor-not-allowed text-white' : 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/25')
                }`}
              >
                {isSubscribed ? <CheckCircle2 className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                {isSubscribed ? 'Subscribed to Push' : 'Enable Native Push'}
            </button>"""

content = re.sub(header_ui_old, header_ui_new, content, flags=re.DOTALL)


with open('src/App.tsx', 'w') as f:
    f.write(content)
