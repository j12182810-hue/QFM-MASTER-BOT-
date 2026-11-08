const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const authCodeOld = `  useEffect(() => {
    const savedKey = localStorage.getItem('qfm_access_key');
    if (savedKey === ACCESS_KEY) {
      setIsAuthorized(true);
    }
  }, []);

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputKey === ACCESS_KEY) {
      localStorage.setItem('qfm_access_key', inputKey);
      setIsAuthorized(true);
      setAuthError(false);
    } else {
      setAuthError(true);
      setTimeout(() => setAuthError(false), 2000);
    }
  };`;

const authCodeNew = `  useEffect(() => {
    const verified = localStorage.getItem('qfm_device_verified');
    if (verified === 'true') {
      setIsAuthorized(true);
    }
  }, []);

  const [showAdmin, setShowAdmin] = useState(false);
  const [adminKeyInfo, setAdminKeyInfo] = useState<{currentKey: string, expiresIn: number} | null>(null);

  const handleAdminAccess = async () => {
      const pass = prompt("Enter Master Key:");
      if (pass === "AQS///BOT") {
          setShowAdmin(true);
          fetchAdminKey(pass);
      } else if (pass) {
          alert("Invalid Master Key");
      }
  };

  const fetchAdminKey = async (pass: string = "AQS///BOT", action?: string) => {
      try {
          const body = { adminKey: pass, action };
          const res = await fetch('/api/admin/key', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body)
          });
          const data = await res.json();
          if (res.ok) {
              setAdminKeyInfo(data);
          } else {
              alert(data.error);
          }
      } catch (err) {}
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/verify-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: inputKey })
      });
      const data = await res.json();
      if (data.valid) {
        localStorage.setItem('qfm_device_verified', 'true');
        if (data.admin) {
            localStorage.setItem('qfm_is_admin', 'true');
        }
        setIsAuthorized(true);
        setAuthError(false);
      } else {
        setAuthError(true);
        setTimeout(() => setAuthError(false), 2000);
      }
    } catch (err) {
      setAuthError(true);
      setTimeout(() => setAuthError(false), 2000);
    }
  };`;

code = code.replace(authCodeOld, authCodeNew);

const adminUINew = `
      {/* Invisible Admin Button */}
      <div 
        onClick={handleAdminAccess}
        className="h-16 w-full cursor-pointer opacity-0"
        title="Admin Panel"
      />

      {/* Admin Panel Modal */}
      {showAdmin && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4">
              <div className={\`w-full max-w-md p-6 rounded-xl border \${theme === 'dark' ? 'bg-[#0a0a0a] border-white/10' : 'bg-white border-slate-200'}\`}>
                  <div className="flex justify-between items-center mb-6">
                      <h2 className="text-lg font-bold">Admin Panel</h2>
                      <button onClick={() => setShowAdmin(false)} className="text-slate-400 hover:text-white">✕</button>
                  </div>
                  {adminKeyInfo ? (
                      <div className="space-y-4">
                          <div className="p-4 rounded-lg bg-black/40 border border-white/5 text-center">
                              <p className="text-xs text-slate-500 uppercase mb-2">Current Active Key</p>
                              <p className="text-2xl font-mono tracking-widest text-amber-500">{adminKeyInfo.currentKey}</p>
                              <p className="text-xs text-slate-500 mt-2">Expires in {Math.floor(adminKeyInfo.expiresIn / 60)}m {adminKeyInfo.expiresIn % 60}s</p>
                          </div>
                          <button 
                              onClick={() => fetchAdminKey("AQS///BOT", "generate")}
                              className="w-full py-3 rounded-lg bg-indigo-500/20 text-indigo-400 font-bold text-xs uppercase tracking-widest border border-indigo-500/30 hover:bg-indigo-500/30 transition-colors"
                          >
                              Generate New Key
                          </button>
                      </div>
                  ) : (
                      <div className="text-center text-slate-500">Loading...</div>
                  )}
              </div>
          </div>
      )}
    </div>
  );
}`;

code = code.replace(/    <\/div>\n  \);\n}/, adminUINew);

fs.writeFileSync('src/App.tsx', code);
console.log('Added Auth modifications');
