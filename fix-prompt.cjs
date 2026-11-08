const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const promptCode = `  const handleAdminAccess = async () => {
      const pass = prompt("Enter Master Key:");
      if (pass === "AQS///BOT") {
          setShowAdmin(true);
          fetchAdminKey(pass);
      } else if (pass) {
          alert("Invalid Master Key");
      }
  };`;

const newCode = `
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  
  const handleAdminAccess = () => {
      setShowAdminLogin(true);
      setAdminPassword("");
  };
  
  const submitAdminLogin = (e: React.FormEvent) => {
      e.preventDefault();
      if (adminPassword === "AQS///BOT") {
          setShowAdminLogin(false);
          setShowAdmin(true);
          fetchAdminKey(adminPassword);
      } else {
          setAuthError(true);
          setTimeout(() => setAuthError(false), 2000);
      }
  };
`;
code = code.replace(promptCode, newCode);

const adminModals = `      {/* Admin Login Modal */}
      {showAdminLogin && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4">
              <div className={\`w-full max-w-md p-6 rounded-xl border \${theme === 'dark' ? 'bg-[#0a0a0a] border-white/10' : 'bg-white border-slate-200'}\`}>
                  <div className="flex justify-between items-center mb-6">
                      <h2 className="text-lg font-bold">Admin Verification</h2>
                      <button onClick={() => setShowAdminLogin(false)} className="text-slate-400 hover:text-white">✕</button>
                  </div>
                  <form onSubmit={submitAdminLogin} className="space-y-4">
                    <input
                      type="password"
                      placeholder="ENTER MASTER KEY"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className={\`w-full px-4 py-3 rounded-xl bg-black/40 border \${authError ? 'border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.2)]' : 'border-white/10'} text-center font-mono text-sm tracking-[0.3em] uppercase focus:outline-none focus:border-amber-500/50 transition-all placeholder:text-slate-700\`}
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs uppercase tracking-widest transition-all shadow-lg shadow-amber-500/20 active:scale-95"
                    >
                      Verify
                    </button>
                  </form>
              </div>
          </div>
      )}

      {/* Admin Panel Modal */}`;

code = code.replace('{/* Admin Panel Modal */}', adminModals);

// Also we need to fix the alert in fetchAdminKey
const fetchAdminKeyCode = `          if (res.ok) {
              setAdminKeyInfo(data);
          } else {
              alert(data.error);
          }`;
const fetchAdminKeyNew = `          if (res.ok) {
              setAdminKeyInfo(data);
          } else {
              console.error(data.error);
          }`;
code = code.replace(fetchAdminKeyCode, fetchAdminKeyNew);

fs.writeFileSync('src/App.tsx', code);
console.log('Fixed admin prompt');
