import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

# Add isSubscribed state
content = content.replace("  const [isAutoScanning, setIsAutoScanning] = useState(false);", "  const [isAutoScanning, setIsAutoScanning] = useState(false);\n  const [isSubscribed, setIsSubscribed] = useState(false);\n\n  useEffect(() => {\n    if ('serviceWorker' in navigator && 'PushManager' in window) {\n      navigator.serviceWorker.ready.then(registration => {\n        registration.pushManager.getSubscription().then(subscription => {\n          setIsSubscribed(subscription !== null);\n        });\n      });\n    }\n  }, []);\n\n  const urlBase64ToUint8Array = (base64String: string) => {\n    const padding = '='.repeat((4 - base64String.length % 4) % 4);\n    const base64 = (base64String + padding).replace(/\\-/g, '+').replace(/_/g, '/');\n    const rawData = window.atob(base64);\n    const outputArray = new Uint8Array(rawData.length);\n    for (let i = 0; i < rawData.length; ++i) {\n      outputArray[i] = rawData.charCodeAt(i);\n    }\n    return outputArray;\n  };\n\n  const handleSubscribe = async () => {\n    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {\n      alert('Push notifications are not supported by your browser.');\n      return;\n    }\n    try {\n      const registration = await navigator.serviceWorker.ready;\n      const response = await fetch('/api/vapidPublicKey');\n      const vapidData = await response.json();\n      const subscription = await registration.pushManager.subscribe({\n        userVisibleOnly: true,\n        applicationServerKey: urlBase64ToUint8Array(vapidData.publicKey)\n      });\n      await fetch('/api/subscribe', {\n        method: 'POST',\n        body: JSON.stringify(subscription),\n        headers: { 'Content-Type': 'application/json' }\n      });\n      setIsSubscribed(true);\n      alert('Successfully subscribed to native push notifications! They will work even offline.');\n    } catch (err) {\n      console.error(err);\n      alert('Failed to subscribe.');\n    }\n  };\n")

# Replace ntfy banner with native push button
ntfy_html = """
            <div className={`mt-6 ${theme === 'dark' ? 'bg-amber-500/10 border-amber-500/20 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-800'} border rounded-xl p-4 flex flex-col sm:flex-row items-center gap-4 transition-colors`}>
              <div className={`p-3 rounded-full ${theme === 'dark' ? 'bg-amber-500/20' : 'bg-amber-100'} shrink-0`}>
                <Bell className="w-5 h-5" />
              </div>
              <div className="flex-1 text-sm">
                <strong>Free Offline Push Notifications:</strong>
                <p className={`mt-1 ${theme === 'dark' ? 'text-amber-200/70' : 'text-amber-700/80'}`}>
                  To receive signals directly to your phone without keeping this page open, download the free <strong>ntfy</strong> app (iOS/Android) and subscribe to:
                </p>
              </div>
              <code className="text-sm font-mono font-bold bg-black/10 dark:bg-black/20 px-3 py-1.5 rounded border border-amber-500/20 select-all tracking-wider">QFM_MASTER_BOT</code>
            </div>"""

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

content = content.replace(ntfy_html.strip(), new_push_html.strip())

with open('src/App.tsx', 'w') as f:
    f.write(content)
