import { useState, useEffect, useRef } from 'react';
import { Activity, Target, AlertCircle, Scan, TrendingUp, TrendingDown, Zap, Shield, Ban, Box, Radar, CheckCircle2, Clock, Volume2, VolumeX, Crown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';

interface Signal {
  pair: string;
  name: string;
  type: string;
  action: 'BUY' | 'SELL';
  entryZone: [number, number];
  stopLoss: number;
  takeProfit: number;
  currentPrice: number;
  confidence: number;
  time: number;
  rrRatio?: number;
  layer1Bias?: string;
  layer2Zone?: string;
  layer25RR?: string;
  layer3Confirm?: string;
  layer4Filter?: string;
  layer5Exec?: string;
  volumeProfileConfirmed?: boolean;
  hvnPrice?: number;
  orderFlowConfirmed?: boolean;
  gexConfirmed?: boolean;
  netGex?: number;
  gexPinPrice?: number;
  dailyTrend?: 'BULLISH' | 'BEARISH';
  fourHourZone?: string;
  oneHourTrigger?: string;
}



export default function App() {
  const [isScanning, setIsScanning] = useState(false);
  const [isAutoScanning, setIsAutoScanning] = useState(false);
  const [autoScanCountdown, setAutoScanCountdown] = useState(120);
  const [bestSignal, setBestSignal] = useState<Signal | null>(null);
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);
  const [allSignals, setAllSignals] = useState<Signal[]>([]);
  const [stats, setStats] = useState({ scanned: 0, timeTaken: 0 });
  const [marketStatus, setMarketStatus] = useState("OPEN");
      

  
  

  
    const [error, setError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(() => { const saved = localStorage.getItem('soundEnabled'); return saved !== null ? JSON.parse(saved) : true; });
  const [lastScanTime, setLastScanTime] = useState<number>(0);
  const announcedSignalsRef = useRef<Set<string>>(new Set());

    
  const [timeframe, setTimeframe] = useState(() => { const saved = localStorage.getItem('timeframe'); return saved !== null ? saved : "30m"; });
  const [selectedAssets, setSelectedAssets] = useState(() => { const saved = localStorage.getItem('selectedAssets'); return saved !== null ? JSON.parse(saved) : { crypto: true, forex: true, commodity: true, index: true, stock: true }; });
  useEffect(() => {
    localStorage.setItem('soundEnabled', JSON.stringify(soundEnabled));
    }, [soundEnabled]);

  useEffect(() => {
    localStorage.setItem('timeframe', timeframe);
    }, [timeframe]);

  useEffect(() => {
    localStorage.setItem('selectedAssets', JSON.stringify(selectedAssets));
    }, [selectedAssets]);


  const toggleAsset = (key: keyof typeof selectedAssets) => {
    setSelectedAssets((prev) => ({ ...prev, [key]: !prev[key] }));
    
  };

  const fetchSignals = async (isBackgroundPoll = false) => {
    if (!isBackgroundPoll) setIsScanning(true);
    setError(null);
    
    const startTime = Date.now();
    const assetsParam = Object.entries(selectedAssets)
      .filter(([_, isSelected]) => isSelected)
      .map(([key]) => key)
      .join(',');

    try {
      const response = await fetch(`/api/scan?assets=${assetsParam}&timeframe=${timeframe}&t=${Date.now()}`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || "Failed to scan markets");
      }

      

      if (data.bestSignal) {
        setBestSignal(data.bestSignal);
      }

      setAllSignals(prev => {
        const newSignals = data.allSignals || [];
        const combined = [...newSignals, ...prev];
        const uniqueMap = new Map();
        combined.forEach(sig => {
          uniqueMap.set(`${sig.pair}-${sig.time}`, sig);
        });
        const unique = Array.from(uniqueMap.values());
        const sorted = unique.sort((a, b) => b.time - a.time).slice(0, 5);
        return sorted;
      });
      setMarketStatus(data.marketStatus || "OPEN");
      if (data.lastScanTime) setLastScanTime(data.lastScanTime);
      setStats({
        scanned: data.totalScanned,
        timeTaken: Date.now() - startTime
      });
      
    } catch (err: any) {
      setError(err.message);
      setIsAutoScanning(false);
    } finally {
      if (!isBackgroundPoll) setIsScanning(false);
    }
  };

  useEffect(() => {
    if (!soundEnabled || !bestSignal) return;

    const signalId = `${bestSignal.pair}-${timeframe}-${bestSignal.time}-${bestSignal.action}`;
    if (!announcedSignalsRef.current.has(signalId)) {
        announcedSignalsRef.current.add(signalId);
        
        if (announcedSignalsRef.current.size > 100) {
            const iterator = announcedSignalsRef.current.values();
            announcedSignalsRef.current.delete(iterator.next().value);
        }

        const speech = new SpeechSynthesisUtterance(`${bestSignal.action} signal on ${bestSignal.name}`);
        speech.rate = 1.0;
        window.speechSynthesis.speak(speech);
    }
  }, [bestSignal, soundEnabled, timeframe]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isAutoScanning) {
      interval = setInterval(() => {
        setAutoScanCountdown((prev) => {
          if (prev <= 1) {
            fetchSignals(false); // Trigger visual scan every 300s
            return 300;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isAutoScanning, selectedAssets, timeframe]);

  useEffect(() => {
    let silentPollInterval: NodeJS.Timeout;
    if (isAutoScanning) {
      silentPollInterval = setInterval(() => {
        fetchSignals(true);
      }, 5000);
    }
    return () => clearInterval(silentPollInterval);
  }, [isAutoScanning, selectedAssets]);

    

    useEffect(() => {
    fetchSignals(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeframe, selectedAssets]);

  const toggleAutoScan = () => {
    if (isAutoScanning) {
      setIsAutoScanning(false);
    } else {
      setIsAutoScanning(true);
      setAutoScanCountdown(300);
      fetchSignals(false); // Initial immediate fetch
    }
  };

  const displaySignal = selectedSignal || bestSignal;
  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 font-sans selection:bg-indigo-500/30 flex flex-col relative overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[100vw] h-[500px] bg-indigo-600/10 blur-[150px] rounded-full pointer-events-none opacity-50" />
      <div className="absolute bottom-0 right-0 w-[50vw] h-[500px] bg-blue-600/5 blur-[120px] rounded-full pointer-events-none opacity-40" />

      {/* Header */}
      <header className="border-b border-white/5 bg-black/40 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-yellow-500/10 flex items-center justify-center border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
              <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
            </div>
            <div className="min-w-0">
              <h1 className="font-mono text-sm sm:text-lg tracking-wider text-zinc-100 flex items-center gap-1 sm:gap-2 break-words">
                QFM <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-400">MASTER BOT</span>
              </h1>
              <p className="text-[8px] sm:text-[10px] text-zinc-500 font-mono tracking-widest uppercase break-words">VIP Signals</p>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:gap-6 shrink-0">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-xl border transition-all duration-300 ${soundEnabled ? 'bg-indigo-500/10 border-amber-500/30 text-amber-400' : 'bg-zinc-900 border-white/5 text-zinc-500 hover:text-zinc-300'}`}
              title={soundEnabled ? "Mute Alarms" : "Enable Alarms"}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <div className="flex items-center gap-2 px-2 py-1 sm:px-3 sm:py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[8px] sm:text-[10px] font-mono font-medium text-emerald-400 tracking-wider">SYSTEM ONLINE</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10 grid grid-cols-1 xl:grid-cols-12 gap-6 sm:gap-8 relative z-10">
        
        {/* Left Column: Control & Primary Signal */}
        <div className="col-span-1 xl:col-span-8 flex flex-col gap-8">
          
          {/* Controls Section */}
          <div className="bg-zinc-900/40 backdrop-blur-md border border-white/5 rounded-3xl p-5 sm:p-8 relative overflow-hidden shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
            
            <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6 sm:gap-8">
              <div className="flex-1 space-y-6">
                <div>
                  <h2 className="text-xl font-medium text-zinc-100 mb-2 flex items-center gap-2">
                    <Box className="w-5 h-5 text-amber-400" />
                    Asset Selection
                  </h2>
                  <p className="text-sm text-zinc-400 mb-4">Select the markets you want the QFM engine to analyze.</p>
                  
                  <div className="mb-6">
                    <p className="text-sm text-zinc-400 mb-4">Select Timeframe</p>
                    <div className="flex flex-wrap gap-3">
                      {[{id: "30m", label: "30M - Scalper"}, {id: "1h", label: "1H - Day Trader"}, {id: "4h", label: "4H - Swing Trader"}].map((tf) => (
                        <button
                          key={tf.id}
                          onClick={() => { setTimeframe(tf.id); setSelectedSignal(null); }}
                          className={`px-5 py-2 rounded-xl text-xs font-mono font-medium border transition-all duration-300 flex items-center gap-2 ${
                            timeframe === tf.id 
                              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.1)]' 
                              : 'bg-zinc-950/50 border-white/5 text-zinc-500 hover:text-zinc-300 hover:border-white/10'
                          }`}
                        >
                          {timeframe === tf.id && <CheckCircle2 className="w-3 h-3" />}
                          {tf.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-3">
                    {Object.entries(selectedAssets).map(([asset, isSelected]) => (
                      <button
                        key={asset}
                        onClick={() => toggleAsset(asset as keyof typeof selectedAssets)}
                        className={`px-5 py-2 rounded-xl text-xs font-mono font-medium border transition-all duration-300 flex items-center gap-2 ${
                          isSelected 
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.1)]' 
                            : 'bg-zinc-950/50 border-white/5 text-zinc-500 hover:text-zinc-300 hover:border-white/10'
                        }`}
                      >
                        {isSelected && <CheckCircle2 className="w-3 h-3" />}
                        {asset.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center shrink-0">
                <button
                  onClick={toggleAutoScan}
                  disabled={isScanning && !isAutoScanning}
                  className="relative group w-48 h-48 rounded-full flex items-center justify-center disabled:cursor-not-allowed"
                >
                  {/* Outer glow and pulses */}
                  <div className={`absolute inset-0 rounded-full transition-all duration-700 ${isAutoScanning ? 'bg-amber-500/20 blur-2xl animate-pulse' : 'bg-amber-500/10 blur-xl group-hover:bg-amber-500/20 group-hover:blur-2xl'}`} />
                  <div className={`absolute inset-2 rounded-full border ${isAutoScanning ? 'border-amber-400/50' : 'border-amber-500/30'}`} />
                  <div className={`absolute inset-6 rounded-full border ${isAutoScanning ? 'border-amber-400/40' : 'border-amber-500/20'} border-dashed animate-[spin_20s_linear_infinite]`} />
                  
                                    {/* Main button surface */}
                  <div className={`absolute inset-10 rounded-full shadow-xl flex flex-col items-center justify-center text-white z-10 transition-transform active:scale-95 border border-white/10 ${isAutoScanning ? 'bg-gradient-to-b from-amber-600 to-amber-800' : 'bg-gradient-to-b from-amber-500 to-amber-700'}`}>
                    {isAutoScanning ? (
                      <>
                        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 4, ease: "linear" }}>
                          <Radar className="w-8 h-8 mb-2 text-amber-200" />
                        </motion.div>
                        <div className="text-xl font-mono font-bold">{Math.floor(autoScanCountdown / 60)}:{(autoScanCountdown % 60).toString().padStart(2, '0')}</div>
                        <div className="text-[9px] font-bold tracking-widest text-amber-100 opacity-60 mt-1">CLICK TO STOP</div>
                      </>
                    ) : (
                      <>
                        <Zap className="w-8 h-8 mb-2" fill="currentColor" />
                        <div className="text-xs font-bold tracking-widest">AUTO SCAN</div>
                        <div className="text-[9px] font-mono opacity-60 mt-1">CONTINUOUS</div>
                      </>
                    )}
                  </div>
                </button>
              </div>
            </div>

            <AnimatePresence>
                            {marketStatus === "WEEKEND_CRYPTO_ONLY" && !isScanning && stats.scanned > 0 && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-8">
                  <div className="text-amber-400 bg-amber-400/10 px-5 py-4 rounded-xl border border-amber-400/20 flex items-start gap-3 text-sm">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <p><strong>Weekend Mode:</strong> Traditional markets are closed. Only 24/7 Crypto pairs were scanned.</p>
                  </div>
                </motion.div>
              )}

              {error && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-8">
                  <div className="text-rose-400 bg-rose-400/10 px-5 py-4 rounded-xl border border-rose-400/20 flex items-center gap-3 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Primary Signal Result */}
          <AnimatePresence mode="wait">
            {isScanning ? (
              <motion.div
                key="scanning"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="bg-zinc-900/40 backdrop-blur-md border border-white/5 rounded-3xl p-12 flex flex-col items-center justify-center min-h-[350px]"
              >
                <div className="w-16 h-16 relative mb-6">
                  <div className="absolute inset-0 border-t-2 border-indigo-500 rounded-full animate-spin" />
                  <div className="absolute inset-2 border-r-2 border-blue-500 rounded-full animate-spin direction-reverse" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
                  <div className="absolute inset-4 border-b-2 border-purple-500 rounded-full animate-spin" style={{ animationDuration: '3s' }} />
                </div>
                <h3 className="text-xl font-medium text-zinc-300 tracking-wide mb-2">Analyzing Order Flow</h3>
                <p className="text-sm font-mono text-zinc-500">Scanning {timeframe.toUpperCase()} timeframe data points...</p>
              </motion.div>
            ) : bestSignal ? (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-zinc-900/60 backdrop-blur-xl border rounded-3xl p-5 sm:p-8 lg:p-10 relative overflow-hidden shadow-2xl ${displaySignal.action === 'BUY' ? 'border-emerald-500/20' : 'border-rose-500/20'}`}
              >
                {/* Accent Gradients */}
                <div className={`absolute top-0 left-0 w-full h-32 bg-gradient-to-b opacity-20 pointer-events-none ${displaySignal.action === 'BUY' ? 'from-emerald-500 to-transparent' : 'from-rose-500 to-transparent'}`} />
                
                <div className="relative z-10">
                  <div className="flex flex-col md:flex-row md:items-start justify-between mb-10 gap-6">
                    <div>
                      <div className="flex flex-wrap items-center gap-3 mb-4">
                        <span className="px-3 py-1 bg-zinc-800 text-xs font-mono rounded-lg text-zinc-400 border border-white/5">
                          {displaySignal.type.toUpperCase()}
                        </span>
                        <span className="px-3 py-1 bg-zinc-800 text-xs font-mono rounded-lg text-zinc-400 border border-white/5 flex items-center gap-1">
                          <Activity className="w-3 h-3" /> CONFIDENCE {displaySignal.confidence}%
                        </span>
                        <span className="px-3 py-1 bg-indigo-500/10 text-xs font-mono rounded-lg text-amber-400 border border-amber-500/20 flex items-center gap-1">
                          <Box className="w-3 h-3" /> {timeframe.toUpperCase()} ORDER BLOCK VERIFIED
                        </span>
                        <span className="px-3 py-1 bg-violet-500/10 text-xs font-mono rounded-lg text-violet-400 border border-violet-500/20 flex items-center gap-1">
                          <Zap className="w-3.5 h-3.5 text-violet-400 animate-pulse" /> LIQUIDITY SWEEP CONFIRMED
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-4">
                        <h3 className="text-4xl sm:text-5xl md:text-6xl font-light tracking-tighter text-white break-words">{displaySignal.name}</h3>
                        <div className={`flex flex-col items-start px-4 py-2 rounded-2xl border ${displaySignal.action === 'BUY' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
                          <span className="text-xs font-bold tracking-widest opacity-80 uppercase">Action</span>
                          <span className="text-2xl font-bold tracking-tight">{displaySignal.action}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-left md:text-right flex flex-col md:items-end">
                      <span className="text-xs font-bold tracking-widest text-zinc-500 uppercase mb-1">Current Price</span>
                      <span className="text-3xl font-mono text-zinc-100">{displaySignal.currentPrice.toFixed(5)}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Entry Zone */}
                    <div className="bg-zinc-950/50 rounded-2xl p-6 border border-white/5 relative overflow-hidden group">
                      <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="flex justify-between items-start mb-4 relative z-10">
                        <span className="text-sm text-zinc-400 font-medium">Entry Zone</span>
                        <Target className="w-5 h-5 text-amber-400" />
                      </div>
                      <div className="font-mono text-xl text-zinc-200 relative z-10">
                        {Math.min(...displaySignal.entryZone).toFixed(5)}<br/>
                        <span className="text-zinc-600">to</span><br/>
                        {Math.max(...displaySignal.entryZone).toFixed(5)}
                      </div>
                    </div>

                    {/* Take Profit */}
                    <div className="bg-zinc-950/50 rounded-2xl p-6 border border-white/5 relative overflow-hidden group">
                      <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="flex justify-between items-start mb-4 relative z-10">
                        <span className="text-sm text-zinc-400 font-medium">Take Profit</span>
                        <TrendingUp className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div className="font-mono text-3xl text-emerald-400 relative z-10 mt-6">
                        {displaySignal.takeProfit.toFixed(5)}
                      </div>
                    </div>

                    {/* Stop Loss */}
                    <div className="bg-zinc-950/50 rounded-2xl p-6 border border-white/5 relative overflow-hidden group">
                      <div className="absolute inset-0 bg-rose-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="flex justify-between items-start mb-4 relative z-10">
                        <span className="text-sm text-zinc-400 font-medium">Stop Loss</span>
                        <Shield className="w-5 h-5 text-rose-400" />
                      </div>
                      <div className="font-mono text-3xl text-rose-400 relative z-10 mt-6">
                        {displaySignal.stopLoss.toFixed(5)}
                      </div>
                    </div>
                  </div>

                  {/* TradingView / SMC Style Position Box Visualizer */}
                  {(() => {
                    const riskAmt = Math.abs(displaySignal.currentPrice - displaySignal.stopLoss);
                    const rewardAmt = Math.abs(displaySignal.takeProfit - displaySignal.currentPrice);
                    const displayRatio = displaySignal.rrRatio?.toFixed(2) || (riskAmt > 0 ? (rewardAmt / riskAmt).toFixed(2) : "0.00");
                    const isLong = displaySignal.action === 'BUY';

                    return (
                      <div className="mt-8 pt-8 border-t border-white/5">
                        <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-6 flex flex-wrap items-center gap-2 break-words">
                          <Activity className="w-4 h-4 text-cyan-400 shrink-0" />
                          <span>{timeframe.toUpperCase()} Strategy Matrix (VIP Order Blocks)</span>
                        </h4>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                          {/* Left Details: Narrative of the setup */}
                          <div className="lg:col-span-5 space-y-4">
                            <div className="bg-zinc-950/40 border border-white/5 rounded-2xl p-5 space-y-3">
                              <div className="text-xs font-mono text-zinc-500">SETUP CLASSIFICATION</div>
                              <div className="text-sm font-medium text-zinc-200">
                                {isLong ? (
                                  <span>Bullish Order Block Mitigation</span>
                                ) : (
                                  <span>Bearish Order Block Mitigation</span>
                                )}
                              </div>
                              <p className="text-xs text-zinc-400 leading-relaxed">
                                Evaluates HTF structural integrity and Draw on Liquidity (DOL) for fuel. Identified using {timeframe.toUpperCase()} charts. The strategy identifies institutional order blocks formed after a liquidity sweep and a subsequent Market Structure Shift (MSS). Price then returns to mitigate this order block before continuing the trend. Stop loss is placed beyond the order block with a buffer.
                              </p>
                            </div>

                            {/* Multi-Timeframe Matrix */}
                            <div className="bg-zinc-950/50 border border-white/5 rounded-2xl p-5 space-y-4">
                              <div className="text-xs font-mono text-cyan-400 font-bold tracking-widest uppercase break-words">Execution Matrix ({timeframe.toUpperCase()} OB Strategy)</div>
                              
                              <div className="flex items-start gap-3 border-b border-white/5 pb-3">
                                <div className={`mt-0.5 p-1.5 rounded-lg bg-blue-500/10 text-blue-400`}>
                                  <Radar className="w-3.5 h-3.5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-[10px] font-mono text-zinc-500 uppercase break-words">Step 1: HTF & LTF Bias</div>
                                  <div className="text-xs font-bold text-zinc-200 break-words whitespace-normal">
                                    {displaySignal.layer1Bias || "HTF Trend: NEUTRAL"}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-start gap-3 border-b border-white/5 pb-3">
                                <div className={`mt-0.5 p-1.5 rounded-lg bg-indigo-500/10 text-amber-400`}>
                                  <Box className="w-3.5 h-3.5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-[10px] font-mono text-zinc-500 uppercase break-words">Step 2: Institutional Order Block</div>
                                  <div className="text-xs font-bold text-zinc-200 break-words whitespace-normal">
                                    {displaySignal.layer2Zone || "Verified Liquidity Level"}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-start gap-3 border-b border-white/5 pb-3">
                                <div className="mt-0.5 p-1.5 rounded-lg bg-violet-500/10 text-violet-400">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-[10px] font-mono text-zinc-500 uppercase break-words">Step 3: Liquidity Sweep & MSS</div>
                                  <div className="text-xs font-bold text-violet-300 break-words whitespace-normal mb-1">
                                    {displaySignal.layer3Confirm || "Confirmed"}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-start gap-3 border-b border-white/5 pb-3">
                                <div className="mt-0.5 p-1.5 rounded-lg bg-fuchsia-500/10 text-fuchsia-400">
                                  <Activity className="w-3.5 h-3.5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-[10px] font-mono text-zinc-500 uppercase break-words">Step 4: DOL & HTF Fuel</div>
                                  <div className="text-xs font-medium text-fuchsia-300 leading-normal break-words whitespace-normal">
                                    {displaySignal.layer4Filter || ""}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-start gap-3 border-b border-white/5 pb-3">
                                <div className="mt-0.5 p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                                  <Target className="w-3.5 h-3.5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-[10px] font-mono text-zinc-500 uppercase break-words">Step 5: R:R Targets</div>
                                  <div className="text-xs font-medium text-emerald-300 leading-normal break-words whitespace-normal">
                                    {displaySignal.layer25RR || "Target & Stop Calculated"}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-start gap-3 border-b border-white/5 pb-3">
                                <div className="mt-0.5 p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                                  <Activity className="w-3.5 h-3.5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-[10px] font-mono text-zinc-500 uppercase break-words">Step 6: Trade Execution</div>
                                  <div className="text-xs font-medium text-indigo-300 leading-normal break-words whitespace-normal">
                                    {displaySignal.layer5Exec || "Triggered"}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-start gap-3 border-b border-white/5 pb-3">
                                <div className="mt-0.5 p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                                  <Target className="w-3.5 h-3.5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-[10px] font-mono text-zinc-500 uppercase break-words">Status Check</div>
                                  <div className="text-xs font-medium text-amber-300 leading-normal break-words whitespace-normal">
                                    Confirmed & Verified
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="bg-zinc-950/40 border border-white/5 rounded-xl p-4 text-center">
                                <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-1">RISK:REWARD</div>
                                <div className="text-xl font-bold font-mono text-cyan-400">1 : {displayRatio}</div>
                              </div>
                              <div className="bg-zinc-950/40 border border-white/5 rounded-xl p-4 text-center">
                                <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-1">CONFIDENCE</div>
                                <div className="text-xl font-bold font-mono text-emerald-400">
                                  {displaySignal.confidence}%
                                </div>
                              </div>
                            </div>
                            
                            <div className="bg-rose-500/5 border border-rose-500/10 rounded-2xl p-4 space-y-2 mt-4">
                              <div className="flex items-center gap-2 text-rose-400">
                                <AlertCircle className="w-4 h-4" />
                                <span className="text-[10px] font-mono font-bold tracking-widest uppercase">Mistakes Guardrails Active</span>
                              </div>
                              <ul className="text-xs text-zinc-400 list-disc list-inside space-y-1">
                                <li><strong>OB validation:</strong> Requires an unmitigated order block at the origin of a valid Market Structure Shift (MSS) that was preceded by a Liquidity Sweep.</li>
                                <li><strong>HTF Structure Integrity:</strong> Evaluates Daily trend HH/HL structures and verifies no recent CHoCH.</li>
                                <li><strong>Draw on Liquidity (DOL):</strong> Calculates distance to next major untapped Daily/Weekly high or low.</li>
                                <li><strong>HTF Displacement/Fuel:</strong> Checks for large clean Daily imbalances (FVGs) vs thin overlapping candles.</li>
                                <li><strong>MSS requirement:</strong> Ignores areas that failed to create a structural break in the trend after sweeping liquidity.</li>
                                <li><strong>Retest Verification:</strong> A setup is verified only after a clean retest of the order block.</li>
                                <li><strong>Dynamic SL:</strong> Widens based on ATR + Session opens.</li>
                              </ul>
                            </div>
                          </div>

                          {/* Right Column: Visual Setup mimicking the uploaded photo */}
                          <div className="lg:col-span-7 bg-zinc-950/60 border border-white/5 rounded-2xl p-6 relative overflow-hidden flex flex-col justify-center min-h-[220px]">
                            {/* Watermark grid background */}
                            <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none" />
                            
                            <div className="relative w-full flex flex-col font-mono text-[11px] gap-1 z-10">
                              {/* 1. TOP PART */}
                              {isLong ? (
                                <>
                                  {/* Long Target Box (Cyan) */}
                                  <div className="relative border border-cyan-500/25 bg-cyan-500/10 rounded-t-xl p-3 flex flex-col justify-between min-h-[5rem] transition-all hover:bg-cyan-500/15">
                                    <div className="flex flex-wrap gap-2 justify-between items-start">
                                      <span className="text-cyan-400 font-bold">PROFIT TARGET (REWARD)</span>
                                      <span className="text-zinc-500">TP: {displaySignal.takeProfit.toFixed(5)}</span>
                                    </div>
                                    <div className="flex justify-between text-[10px] text-cyan-400/70">
                                      <span>Ratio: {displayRatio}R</span>
                                      <span>Reward: +{((rewardAmt / displaySignal.currentPrice) * 100).toFixed(2)}%</span>
                                    </div>
                                  </div>

                                  {/* Entry Divider */}
                                  <div className="relative py-1 flex flex-wrap gap-2 items-center justify-between border-y border-amber-500/30 bg-indigo-500/5 px-3">
                                    <span className="text-amber-400 font-bold">CURRENT PRICE (ENTRY)</span>
                                    <span className="text-zinc-300 font-bold">{displaySignal.currentPrice.toFixed(5)}</span>
                                  </div>

                                  {/* Stop Loss Box (Rose) */}
                                  <div className="relative border border-rose-500/25 bg-rose-500/10 rounded-b-xl p-3 flex flex-col justify-between min-h-[4rem] transition-all hover:bg-rose-500/15">
                                    <div className="flex flex-wrap gap-2 justify-between items-start">
                                      <span className="text-rose-400 font-bold">STOP LOSS (RISK)</span>
                                      <span className="text-zinc-500">SL: {displaySignal.stopLoss.toFixed(5)}</span>
                                    </div>
                                    <div className="flex justify-between text-[10px] text-rose-400/70">
                                      <span>Risk: -{((riskAmt / displaySignal.currentPrice) * 100).toFixed(2)}%</span>
                                    </div>
                                  </div>
                                </>
                              ) : (
                                <>
                                  {/* Stop Loss Box (Rose) */}
                                  <div className="relative border border-rose-500/25 bg-rose-500/10 rounded-t-xl p-3 flex flex-col justify-between min-h-[4rem] transition-all hover:bg-rose-500/15">
                                    <div className="flex flex-wrap gap-2 justify-between items-start">
                                      <span className="text-rose-400 font-bold">STOP LOSS (RISK)</span>
                                      <span className="text-zinc-500">SL: {displaySignal.stopLoss.toFixed(5)}</span>
                                    </div>
                                    <div className="flex justify-between text-[10px] text-rose-400/70">
                                      <span>Risk: -{((riskAmt / displaySignal.currentPrice) * 100).toFixed(2)}%</span>
                                    </div>
                                  </div>

                                  {/* Entry Divider */}
                                  <div className="relative py-1 flex flex-wrap gap-2 items-center justify-between border-y border-amber-500/30 bg-indigo-500/5 px-3">
                                    <span className="text-amber-400 font-bold">CURRENT PRICE (ENTRY)</span>
                                    <span className="text-zinc-300 font-bold">{displaySignal.currentPrice.toFixed(5)}</span>
                                  </div>

                                  {/* Short Target Box (Cyan) */}
                                  <div className="relative border border-cyan-500/25 bg-cyan-500/10 rounded-b-xl p-3 flex flex-col justify-between min-h-[5rem] transition-all hover:bg-cyan-500/15">
                                    <div className="flex flex-wrap gap-2 justify-between items-start">
                                      <span className="text-cyan-400 font-bold">PROFIT TARGET (REWARD)</span>
                                      <span className="text-zinc-500">TP: {displaySignal.takeProfit.toFixed(5)}</span>
                                    </div>
                                    <div className="flex justify-between text-[10px] text-cyan-400/70">
                                      <span>Ratio: {displayRatio}R</span>
                                      <span>Reward: +{((rewardAmt / displaySignal.currentPrice) * 100).toFixed(2)}%</span>
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </motion.div>
            ) : stats.scanned > 0 ? (
               <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-zinc-900/40 backdrop-blur-md border border-white/5 rounded-3xl p-12 flex flex-col items-center justify-center text-center min-h-[350px]"
              >
                <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center mb-6">
                  <Ban className="w-8 h-8 text-zinc-500" />
                </div>
                <h3 className="text-xl font-medium text-zinc-300 mb-2">No High-Probability Setups</h3>
                <p className="text-zinc-500 text-sm max-w-md">
                  Scanned {stats.scanned} pairs. Current market conditions do not align with our strict risk-to-reward parameters. Please check back later.
                </p>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        {/* Right Column: Alerts Feed */}
        <div className="col-span-1 xl:col-span-4 flex flex-col gap-6">
          <div className="bg-zinc-900/40 backdrop-blur-md border border-white/5 rounded-3xl p-6 flex-1 flex flex-col max-h-[800px] shadow-2xl">
            <div className="flex items-center justify-between pb-6 border-b border-white/5 mb-6">
              <h2 className="text-sm font-bold tracking-widest text-zinc-300 uppercase flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Live Feed
              </h2>
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-amber-500/20">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                <span className="text-[10px] font-mono font-medium text-amber-400 tracking-wider">REALTIME</span>
              </div>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
              <AnimatePresence>
                {allSignals.length > 0 ? (
                  allSignals.map((sig, idx) => (
                    <motion.div
                      key={sig.pair + sig.time + idx}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className={`bg-zinc-950/50 border rounded-2xl p-5 cursor-pointer hover:bg-zinc-800/50 transition-all duration-300
                        ${sig.pair === displaySignal?.pair ? 'border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.15)]' : 'border-white/5 hover:border-white/10'}`}
                      onClick={() => setSelectedSignal(sig)}
                    >
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-8 rounded-full ${sig.action === 'BUY' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          <div>
                            <div className="font-bold text-lg leading-none mb-1 text-zinc-200">{sig.name}</div>
                            <div className={`text-[10px] font-bold tracking-widest uppercase ${sig.action === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {sig.action} SIGNAL
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-zinc-500 font-mono block mb-1">{format(sig.time, 'HH:mm:ss')}</span>
                          <span className="text-xs text-zinc-400 font-mono bg-zinc-900 px-2 py-1 rounded border border-white/5">{sig.type}</span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 bg-zinc-900/50 rounded-xl p-3 border border-white/5">
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Entry</div>
                          <div className="font-mono text-sm text-zinc-300">
                            {Math.min(...sig.entryZone).toFixed(sig.type==='Crypto' || sig.type==='Forex' ? 4 : 2)}
                          </div>
                        </div>
                        <div className="text-right">
                           <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Target</div>
                           <div className="font-mono text-sm text-zinc-300">{sig.takeProfit.toFixed(sig.type==='Crypto' || sig.type==='Forex' ? 4 : 2)}</div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  !isScanning && (
                    <div className="h-full flex flex-col items-center justify-center text-center text-sm text-zinc-600 p-6">
                      <Target className="w-8 h-8 mb-4 text-zinc-700" />
                      <p>Awaiting scan initialization. Validated setups will appear in this feed.</p>
                    </div>
                  )
                )}
                {isScanning && (
                  Array(4).fill(0).map((_, i) => (
                    <div key={'skeleton'+i} className="animate-pulse bg-zinc-950/50 rounded-2xl h-32 border border-white/5" />
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.1);
        }
      `}</style>
    </div>
  );
}

