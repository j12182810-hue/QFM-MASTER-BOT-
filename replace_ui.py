with open('src/App.tsx', 'r') as f:
    lines = f.readlines()

start_idx = -1
end_idx = -1

for i, line in enumerate(lines):
    if "{/* Controls Section */}" in line:
        start_idx = i
    if "AnimatePresence>" in line and start_idx != -1 and i > start_idx:
        # Actually, let's look for the closing div of the controls section which is just before AnimatePresence
        pass

for i, line in enumerate(lines):
    if "{/* Controls Section */}" in line:
        start_idx = i
    if "          <AnimatePresence>" in line and start_idx != -1 and i > start_idx:
        end_idx = i
        break

print(f"start: {start_idx}, end: {end_idx}")

new_controls = """          {/* Controls Section */}
          <div className="bg-[#0a0a0a] border border-white/5 rounded-xl p-5 sm:p-6 relative overflow-hidden shadow-2xl flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
            
            <div className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h2 className="text-xs font-mono font-bold tracking-widest text-zinc-500 uppercase mb-3 flex items-center gap-2">
                  <Box className="w-4 h-4 text-amber-500" />
                  Timeframe Horizon
                </h2>
                <div className="flex flex-wrap gap-2">
                  {[{id: "30m", label: "30M Scalp"}, {id: "1h", label: "1H Intraday"}, {id: "4h", label: "4H Swing"}].map((tf) => (
                    <button
                      key={tf.id}
                      disabled={isAutoScanning}
                      onClick={() => { setTimeframe(tf.id); setSelectedSignal(null); setBestSignal(null); setAllSignals([]); setStats({ scanned: 0, timeTaken: 0 }); }}
                      className={`px-4 py-2 rounded-lg text-xs font-mono font-medium border transition-all duration-300 flex items-center gap-2 ${
                        timeframe === tf.id 
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' 
                          : 'bg-zinc-950/50 border-white/5 text-zinc-500 hover:text-zinc-300 hover:border-white/10'
                      } ${isAutoScanning ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {timeframe === tf.id && <CheckCircle2 className="w-3 h-3" />}
                      {tf.label}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <h2 className="text-xs font-mono font-bold tracking-widest text-zinc-500 uppercase mb-3 flex items-center gap-2">
                  <Target className="w-4 h-4 text-emerald-500" />
                  Market Liquidity Pools
                </h2>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(selectedAssets).map(([asset, isSelected]) => (
                    <button
                      key={asset}
                      disabled={isAutoScanning}
                      onClick={() => toggleAsset(asset as keyof typeof selectedAssets)}
                      className={`px-4 py-2 rounded-lg text-xs font-mono font-medium border transition-all duration-300 flex items-center gap-2 ${
                        isSelected 
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                          : 'bg-zinc-950/50 border-white/5 text-zinc-500 hover:text-zinc-300 hover:border-white/10'
                      } ${isAutoScanning ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {isSelected && <CheckCircle2 className="w-3 h-3" />}
                      {asset.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="relative z-10 shrink-0 w-full md:w-64">
              <button
                onClick={toggleAutoScan}
                disabled={isScanning && !isAutoScanning}
                className={`relative group w-full h-16 rounded-xl flex items-center justify-between px-6 transition-all duration-300 border shadow-lg ${
                  isAutoScanning 
                    ? 'bg-amber-500/10 border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.15)]' 
                    : 'bg-indigo-500/10 border-indigo-500/30 hover:bg-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.1)]'
                } disabled:cursor-not-allowed`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isAutoScanning ? 'bg-amber-500/20 text-amber-400' : 'bg-indigo-500/20 text-indigo-400'}`}>
                    {isAutoScanning ? (
                      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 4, ease: "linear" }}>
                        <Radar className="w-5 h-5" />
                      </motion.div>
                    ) : (
                      <Zap className="w-5 h-5" fill="currentColor" />
                    )}
                  </div>
                  <div className="text-left">
                    <div className={`text-xs font-bold tracking-widest ${isAutoScanning ? 'text-amber-400' : 'text-indigo-400'}`}>
                      {isAutoScanning ? 'SYSTEM ACTIVE' : 'INITIALIZE'}
                    </div>
                    <div className="text-[9px] font-mono opacity-60 text-zinc-400 uppercase mt-0.5">
                      {isAutoScanning ? 'Continuous Scan' : 'Auto Engine'}
                    </div>
                  </div>
                </div>
                {isAutoScanning && (
                  <div className="text-right">
                    <AutoScanTimer targetTime={nextScanTime} isAutoScanning={isAutoScanning} />
                  </div>
                )}
              </button>
            </div>
          </div>
"""

if start_idx != -1 and end_idx != -1:
    lines = lines[:start_idx] + [new_controls] + lines[end_idx:]
    with open('src/App.tsx', 'w') as f:
        f.writelines(lines)
    print("Replaced!")
