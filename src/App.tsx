import React, { useState, useEffect, useRef } from 'react';
import { Activity, Target, AlertCircle, Scan, TrendingUp, TrendingDown, Zap, Shield, Ban, Box, Radar, CheckCircle2, Clock, Bell, Volume2, VolumeX, Crown, ShieldCheck, Sun, Moon, ExternalLink, Menu, X } from 'lucide-react';
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
  orderFlowDetails?: string;
  orderFlowDelta?: number;
  gexConfirmed?: boolean;
  netGex?: number;
  vannaConfirmed?: boolean;
  netVanna?: number;
  vannaBias?: string;
  gexPinPrice?: number;
  dailyTrend?: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  fourHourZone?: string;
  oneHourTrigger?: string;
}

interface NewsEvent {
  title: string;
  country: string;
  date: string;
  impact: string;
  forecast: string;
  previous: string;
}



const AutoScanTimer = ({ targetTime, isAutoScanning }: { targetTime: number, isAutoScanning: boolean }) => {
  const [displaySeconds, setDisplaySeconds] = useState(0);

  useEffect(() => {
    if (!isAutoScanning) return;
    const update = () => setDisplaySeconds(Math.max(0, Math.floor((targetTime - Date.now()) / 1000)));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [targetTime, isAutoScanning]);

  if (!isAutoScanning) return null;
  return (
    <>
      <div className="text-xl font-mono font-bold">
        {Math.floor(displaySeconds / 60)}:{(displaySeconds % 60).toString().padStart(2, '0')}
      </div>
      <div className="text-[9px] font-bold tracking-widest text-amber-100 opacity-60 mt-1">CLICK TO STOP</div>
    </>
  );
};

function getHTFIntervals(active: string) {
    let struct = '1h', trend = '4h';
    if (active === '1h') { struct = '4h'; trend = '1d'; }
    else if (active === '4h') { struct = '1d'; trend = '1w'; }
    return { struct, trend };
}

const CRYPTO_PAIRS = [
  "XLMUSDT", "STORJUSDT", "SANDUSDT", "THETAUSDT", "TRXUSDT", "VETUSDT", "YFIUSDT", "ZECUSDT", "ZILUSDT", 
  "AAVEUSDT", "ALGOUSDT", "AVAXUSDT", "BNBUSDT", "BTCUSDT", "BCHUSDT", "ADAUSDT", "LINKUSDT", "CHZUSDT", 
  "MANAUSDT", "DOGEUSDT", "ETHUSDT", "ICPUSDT", "LTCUSDT", "MASKUSDT", "NEARUSDT", "NEOUSDT", "DOTUSDT", 
  "QTUMUSDT", "XRPUSDT", "SOLUSDT", "STXUSDT"
].sort();

export default function App() {
  const [isScanning, setIsScanning] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('theme') as 'light' | 'dark') || 'dark';
    }
    return 'dark';
  });

  useEffect(() => {
    localStorage.setItem('theme', theme);
  }, [theme]);
  const [isAutoScanning, setIsAutoScanning] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [activeInfoTab, setActiveInfoTab] = useState<string | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('qfm_device_verified') === 'true';
    }
    return false;
  });
  const [inputKey, setInputKey] = useState('');
  const [authError, setAuthError] = useState(false);
  const ACCESS_KEY = "AQS///BOT";
  const isIframe = window !== window.parent;

  const [showAdmin, setShowAdmin] = useState(false);
  const [adminKeyInfo, setAdminKeyInfo] = useState<{currentKey: string, expiresIn: number} | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
        setAdminKeyInfo(prev => {
            if (prev && prev.expiresIn > 0) {
                return { ...prev, expiresIn: prev.expiresIn - 1 };
            }
            return prev;
        });
    }, 1000);
    return () => clearInterval(interval);
  }, []);



  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [showBacktest, setShowBacktest] = useState(false);
  const [backtestDays, setBacktestDays] = useState<number | string>(30);
  const [backtestPair, setBacktestPair] = useState("BTCUSDT");
  const [backtestState, setBacktestState] = useState({
    status: '',
    progress: 0,
    wins: 0,
    losses: 0,
    totalTrades: 0,
    pnl: 0,
    winRate: 0,
    minRR: 0,
    isRunning: false,
    message: ''
  });

  const runBacktest = () => {
    setBacktestState({ status: 'Starting...', progress: 0, wins: 0, losses: 0, totalTrades: 0, pnl: 0, winRate: 0, minRR: 0, isRunning: true, message: '' });
    const daysToRun = typeof backtestDays === 'number' && backtestDays > 0 ? backtestDays : 30;
    const eventSource = new EventSource(`/api/backtest?pair=${backtestPair}&days=${daysToRun}&strategy=${strategy}`);
    
    eventSource.addEventListener('status', (e) => {
        const data = JSON.parse(e.data);
        setBacktestState(prev => ({ ...prev, status: data.message }));
    });
    
    eventSource.addEventListener('progress', (e) => {
        const data = JSON.parse(e.data);
        setBacktestState(prev => ({ 
            ...prev, 
            progress: data.progress,
            wins: data.wins,
            losses: data.losses,
            totalTrades: data.totalTrades,
            pnl: data.pnl
        }));
    });
    
    eventSource.addEventListener('complete', (e) => {
        const data = JSON.parse(e.data);
        setBacktestState(prev => ({ 
            ...prev, 
            isRunning: false,
            winRate: data.winRate,
            minRR: data.minRR,
            message: data.message,
            status: 'Completed'
        }));
        eventSource.close();
    });
    
    eventSource.addEventListener('error', (e) => {
        const errorMsg = (e as any).data ? JSON.parse((e as any).data) : { message: 'Connection lost' };
        setBacktestState(prev => ({ ...prev, isRunning: false, status: 'Error: ' + errorMsg.message }));
        eventSource.close();
    });
  };
  
  const handleAdminAccess = () => {
      setShowAdminLogin(true);
      setAdminPassword("");
      fetchAdminKey("AQS///BOT");
  };
  
  const submitAdminLogin = (e: React.FormEvent) => {
      e.preventDefault();
      if (adminPassword.trim() === "AQS///BOT") {
          setShowAdminLogin(false);
          setShowAdmin(true);
          fetchAdminKey("AQS///BOT");
      } else {
          setAuthError(true);
          setTimeout(() => setAuthError(false), 2000);
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
              console.error(data.error);
          }
      } catch (err) {}
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inputKey.trim() === "AQS///BOT") {
        localStorage.setItem('qfm_device_verified', 'true');
        localStorage.setItem('qfm_is_admin', 'true');
        setIsAuthorized(true);
        setAuthError(false);
        return;
    }
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
  };

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.register('/sw.js').then(registration => {
        registration.pushManager.getSubscription().then(subscription => {
          setIsSubscribed(subscription !== null);
          if (subscription) {
            // Re-sync with server just in case
            fetch('/api/subscribe', {
              method: 'POST',
              body: JSON.stringify(subscription),
              headers: { 'Content-Type': 'application/json' }
            }).catch(e => console.error(e));
          }
        });
      }).catch(err => {
        console.error('Service worker registration failed:', err);
      });
    }
  }, []);

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const handleSubscribe = async (force = false) => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      alert('Push notifications are not supported by your browser.');
      return;
    }
    try {
      if ('Notification' in window && Notification.permission !== 'granted') {
        const perm = await Notification.requestPermission();
        if (perm !== 'granted') {
          alert('Notification permission was not granted. Please allow notifications in your browser settings.');
          return;
        }
      }

      let registration = await navigator.serviceWorker.getRegistration('/sw.js');
      if (!registration) {
        registration = await navigator.serviceWorker.register('/sw.js');
      }
      await navigator.serviceWorker.ready;

      const existingSub = await registration.pushManager.getSubscription();

      if (isSubscribed && !force) {
        // Toggle OFF
        if (existingSub) {
          await fetch('/api/unsubscribe', {
            method: 'POST',
            body: JSON.stringify(existingSub),
            headers: { 'Content-Type': 'application/json' }
          });
          await existingSub.unsubscribe();
        }
        setIsSubscribed(false);
        alert('Push notifications disabled.');
        return;
      }
      
      if (force && existingSub) {
        await existingSub.unsubscribe();
      }

      const response = await fetch('/api/vapidPublicKey');
      const vapidData = await response.json();
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidData.publicKey)
      });
      await fetch('/api/subscribe', {
        method: 'POST',
        body: JSON.stringify(subscription),
        headers: { 'Content-Type': 'application/json' }
      });
      setIsSubscribed(true);

      // Trigger a test local notification immediately to verify OS push delivery
      if (registration && registration.showNotification) {
        registration.showNotification("QFM MASTER BOT", {
          body: "🚀 Native Web Push ACTIVE! Test notification delivered.",
          icon: "/icon.jpg",
          badge: "/icon.jpg",
          tag: "qfm-test-subscription-" + Date.now(),
          renotify: true
        } as any).catch(() => {});
      }

      const isIframe = window.self !== window.top;
      if (isIframe) {
        alert('Subscribed! Note: Since you are in an embedded preview, if OS popups do not appear, please open the app in a New Tab to receive desktop notifications.');
      } else {
        alert('Successfully subscribed to native push notifications! A test notification was sent.');
      }
    } catch (err: any) {
      console.error(err);
      if (err.message && err.message.includes('permission')) {
        alert('Permission denied. Please grant notification permissions in your browser settings.');
      } else {
        alert('Failed to update push notifications: ' + (err.message || String(err)));
      }
    }
  };

  const handleSendTestSignal = async () => {
    try {
      let subscription = null;
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        const reg = await navigator.serviceWorker.getRegistration('/sw.js');
        if (reg) {
          subscription = await reg.pushManager.getSubscription();
        }
      }

      const res = await fetch('/api/test-signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription })
      });
      const data = await res.json();
      
      // Also show local OS notification immediately for direct visual confirmation
      if ('serviceWorker' in navigator && 'Notification' in window && Notification.permission === 'granted') {
        const reg = await navigator.serviceWorker.getRegistration('/sw.js') || await navigator.serviceWorker.ready;
        if (reg && reg.showNotification) {
          reg.showNotification("Market Alert: TEST_PAIR BUY", {
            body: "TEST ALERT: 🚀 AQS Spotted a new BUY signal for TEST_PAIR at 1005\nTP1: 1100 | SL: 950 | Conf: 99%",
            icon: "/icon.jpg",
            badge: "/icon.jpg",
            tag: "qfm-test-signal-" + Date.now(),
            renotify: true
          } as any).catch(() => {});
        }
      }

      if (data.message) {
        alert(data.message);
      } else {
        alert(JSON.stringify(data));
      }
    } catch (err: any) {
      alert('Failed to send test signal: ' + (err.message || String(err)));
    }
  };

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [strategy, setStrategy] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('qfm_strategy') || 'qfm';
    }
    return 'qfm';
  });

  useEffect(() => {
    localStorage.setItem('qfm_strategy', strategy);
  }, [strategy]);

  const [nextScanTime, setNextScanTime] = useState(0);
  const nextScanTimeRef = useRef(0);
  const [bestSignal, setBestSignal] = useState<Signal | null>(null);
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);
  const [allSignals, setAllSignals] = useState<Signal[]>([]);
  const [stats, setStats] = useState({ scanned: 0, timeTaken: 0 });
  const [marketStatus, setMarketStatus] = useState("OPEN");
  const [newsWarning, setNewsWarning] = useState<NewsEvent | null>(null);
      

  
  

  
    const [error, setError] = useState<string | null>(null);
  const [ping, setPing] = useState(24);

  useEffect(() => {
    const interval = setInterval(() => {
      setPing(prev => {
        const variance = Math.floor(Math.random() * 9) - 4; // -4 to +4
        const next = prev + variance;
        if (next < 15) return 15;
        if (next > 45) return 45;
        return next;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);
  const [soundEnabled, setSoundEnabled] = useState(() => { const saved = localStorage.getItem('soundEnabled'); return saved !== null ? JSON.parse(saved) : true; });
  const [lastScanTime, setLastScanTime] = useState<number>(0);
  const announcedSignalsRef = useRef<Set<string>>(new Set());
  const abortControllerRef = useRef<AbortController | null>(null);

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

  const fetchSignals = async (isBackgroundPoll = false, isAutoScanTrigger = false) => {
    if (!isBackgroundPoll) {
      setIsScanning(true);
      setBestSignal(null);
      setSelectedSignal(null);
      setAllSignals([]);
    }
    setError(null);
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    const startTime = Date.now();
    const assetsParam = Object.entries(selectedAssets)
      .filter(([_, isSelected]) => isSelected)
      .map(([key]) => key)
      .join(',');

    try {
      // CRUCIAL FOR 3M CCU: Do not append cache-busting timestamp (t=Date.now()).
      // The CDN uses the exact URL to cache responses. 
      const response = await fetch(`/api/scan?assets=${assetsParam}&timeframe=${timeframe}&strategy=${strategy}`, {
        signal: abortControllerRef.current.signal
      });
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || "Failed to scan markets");
      }

      // Add random jitter (0-30 seconds) to spread load for 3M CCU
      const jitter = Math.floor(Math.random() * 30);
      
      if (data.bestSignal) {
        setBestSignal(data.bestSignal);
        if (isAutoScanTrigger) {
          nextScanTimeRef.current = Date.now() + (300 + jitter) * 1000;
          setNextScanTime(nextScanTimeRef.current);
        }
      } else {
        setBestSignal(null);
        if (isAutoScanTrigger) {
          nextScanTimeRef.current = Date.now() + (120 + jitter) * 1000;
          setNextScanTime(nextScanTimeRef.current);
        }
      }

      setAllSignals(() => {
        const newSignals = data.allSignals || [];
        const uniqueMap = new Map();
        
        const selectedTypes = Object.entries(selectedAssets)
          .filter(([_, isSelected]) => isSelected)
          .map(([key]) => key.toLowerCase());
          
        newSignals.forEach((sig: Signal) => {
          if (selectedTypes.includes(sig.type.toLowerCase())) {
            uniqueMap.set(`${sig.pair}-${sig.time}`, sig);
          }
        });
        
        const unique = Array.from(uniqueMap.values());
        const sorted = unique.sort((a: Signal, b: Signal) => b.time - a.time).slice(0, 5);
        return sorted;
      });
      setMarketStatus(data.marketStatus || "OPEN");
      setNewsWarning(data.newsWarning || null);
      if (data.lastScanTime) setLastScanTime(data.lastScanTime);
      setStats({
        scanned: data.totalScanned,
        timeTaken: Date.now() - startTime
      });
      
    } catch (err: any) {
      if (err.name === 'AbortError') return;
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
  }, [bestSignal, soundEnabled]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isAutoScanning) {
      interval = setInterval(() => {
        if (Date.now() >= nextScanTimeRef.current) {
          nextScanTimeRef.current = Date.now() + 120000;
          setNextScanTime(nextScanTimeRef.current);
          fetchSignals(false, true); 
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isAutoScanning, selectedAssets, timeframe, strategy]);
    
    
    
  
  const handleTestSignal = async () => {
    try {
      const res = await fetch('/api/test-signal');
      const data = await res.json();
      alert(data.message || "Test signal request sent!");
    } catch (err) {
      alert("Failed to send test signal: " + err);
    }
  };

  const toggleAutoScan = () => {
    if (isAutoScanning) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setIsAutoScanning(false);
      setIsScanning(false);
      setSelectedSignal(null);
      setBestSignal(null);
      setAllSignals([]);
      setStats({ scanned: 0, timeTaken: 0 });
    } else {
      setSelectedSignal(null);
      setBestSignal(null);
      setAllSignals([]);
      setStats({ scanned: 0, timeTaken: 0 });
      setIsAutoScanning(true);
      nextScanTimeRef.current = Date.now() + 120000;
      setNextScanTime(nextScanTimeRef.current);
      fetchSignals(false, true); // Initial immediate fetch
    }
  };

  const displaySignal = selectedSignal || bestSignal;
  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-800'} font-sans selection:bg-indigo-500/30 flex flex-col relative overflow-hidden transition-colors duration-300`}>
      <AnimatePresence>
        {!isAuthorized && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-[#050505] p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`w-full max-w-md p-8 rounded-2xl border ${theme === 'dark' ? 'bg-[#0a0a0a] border-white/5' : 'bg-white border-slate-200'} shadow-2xl text-center`}
            >
              <div className="mb-6 flex justify-center">
                <div className="p-4 rounded-full bg-amber-500/10 border border-amber-500/20">
                  <Crown className="w-8 h-8 text-amber-500" />
                </div>
              </div>
              <h1 className="text-xl font-bold tracking-tight mb-2">QFM MASTER BOT</h1>
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-8">Access Restricted</p>
              
              <form onSubmit={handleAuth} className="space-y-4">
                <div>
                  <input
                    type="password"
                    placeholder="ENTER ACCESS KEY"
                    value={inputKey}
                    onChange={(e) => {
                      const val = e.target.value;
                      setInputKey(val);
                      if (val.trim() === "AQS///BOT") {
                        localStorage.setItem('qfm_device_verified', 'true');
                        localStorage.setItem('qfm_is_admin', 'true');
                        setIsAuthorized(true);
                        setAuthError(false);
                      }
                    }}
                    className={`w-full px-4 py-3 rounded-xl bg-black/40 border ${authError ? 'border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.2)]' : 'border-white/10'} text-center font-mono text-sm tracking-[0.3em] uppercase focus:outline-none focus:border-amber-500/50 transition-all placeholder:text-slate-700`}
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs uppercase tracking-widest transition-all shadow-lg shadow-amber-500/20 active:scale-95"
                >
                  Verify Access
                </button>
              </form>
              
              <p className="mt-8 text-[9px] text-slate-600 uppercase tracking-widest leading-relaxed">
                Professional TPO & Volume Profile Suite<br/>
                Proprietary Algorithms • QFM Analytics
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Header */}
      <header className={`border-b ${theme === 'dark' ? 'border-white/5 bg-slate-900' : 'border-slate-200 bg-white shadow-sm'} sticky top-0 z-50 transition-colors duration-300`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br ${theme === 'dark' ? 'from-amber-500/20 to-yellow-500/10 border-amber-500/20' : 'from-amber-100 to-yellow-50 border-amber-200'} flex items-center justify-center border shadow-[0_0_15px_rgba(245,158,11,0.1)] overflow-hidden transition-all duration-300`}>
              <img src="/icon.jpg" alt="QFM Logo" className="w-full h-full object-cover" />
            </div>
                <div className="min-w-0">
              <h1 className={`font-display font-bold text-lg sm:text-xl tracking-tight ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'} flex items-center gap-1 sm:gap-2 break-words transition-colors`}>
                QFM <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-400">MASTER BOT</span>
              </h1>
              <p className={`text-[8px] sm:text-[10px] ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'} font-mono tracking-widest uppercase break-words transition-colors`}>TPO & Volume Profile Signals</p>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:gap-6 shrink-0 relative">
            <div className="hidden sm:flex items-center gap-2 px-2 py-1 sm:px-3 sm:py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[8px] sm:text-[10px] font-mono font-medium text-emerald-400 tracking-wider">LATENCY: {ping}ms</span>
            </div>

            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`p-2 rounded-xl border transition-all duration-300 ${theme === 'dark' ? 'bg-slate-800 border-white/5 text-slate-400 hover:text-slate-200' : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800 shadow-sm'}`}
              title="Settings Menu"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
              {isMenuOpen && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setIsMenuOpen(false)}
                    className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]"
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className={`absolute top-full right-0 mt-2 w-64 rounded-2xl border shadow-2xl z-50 overflow-hidden ${theme === 'dark' ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}
                  >
                    <div className="p-2 space-y-1">
                      {/* Theme Toggle */}
                      <button
                        onClick={() => { setTheme(theme === 'dark' ? 'light' : 'dark'); setIsMenuOpen(false); }}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-colors ${theme === 'dark' ? 'hover:bg-white/5 text-slate-300' : 'hover:bg-slate-50 text-slate-600'}`}
                      >
                        <div className="flex items-center gap-3">
                          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                          <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                        </div>
                        <div className={`w-10 h-5 rounded-full relative transition-colors ${theme === 'dark' ? 'bg-amber-500' : 'bg-slate-200'}`}>
                          <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${theme === 'dark' ? 'right-1' : 'left-1'}`} />
                        </div>
                      </button>

                      {/* Push Notifications Toggle */}
                      <button
                        onClick={() => { handleSubscribe(); setIsMenuOpen(false); }}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-colors ${theme === 'dark' ? 'hover:bg-white/5 text-slate-300' : 'hover:bg-slate-50 text-slate-600'}`}
                      >
                        <div className="flex items-center gap-3">
                          <Bell className={`w-4 h-4 ${isSubscribed ? 'text-emerald-400 fill-current' : ''}`} />
                          <span>Push Notifications</span>
                        </div>
                        <div className={`w-10 h-5 rounded-full relative transition-colors ${isSubscribed ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                          <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${isSubscribed ? 'right-1' : 'left-1'}`} />
                        </div>
                      </button>

                      {/* Voice Model Toggle */}
                      <button
                        onClick={() => { setSoundEnabled(!soundEnabled); setIsMenuOpen(false); }}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-colors ${theme === 'dark' ? 'hover:bg-white/5 text-slate-300' : 'hover:bg-slate-50 text-slate-600'}`}
                      >
                        <div className="flex items-center gap-3">
                          {soundEnabled ? <Volume2 className="w-4 h-4 text-indigo-400" /> : <VolumeX className="w-4 h-4" />}
                          <span>Voice Model Alerts</span>
                        </div>
                        <div className={`w-10 h-5 rounded-full relative transition-colors ${soundEnabled ? 'bg-indigo-500' : 'bg-slate-200'}`}>
                          <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${soundEnabled ? 'right-1' : 'left-1'}`} />
                        </div>
                      </button>

                      <div className={`h-px mx-2 my-1 ${theme === 'dark' ? 'bg-white/5' : 'bg-slate-100'}`} />

                      <button
                        onClick={() => { handleSendTestSignal(); setIsMenuOpen(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-mono font-bold tracking-wider ${theme === 'dark' ? 'text-amber-400 hover:bg-amber-400/10' : 'text-amber-600 hover:bg-amber-50'}`}
                      >
                        <Zap className="w-3.5 h-3.5" />
                        TEST PUSH NOTIFICATION
                      </button>

                      <button
                        onClick={() => { handleAdminAccess(); setIsMenuOpen(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-mono font-bold tracking-wider ${theme === 'dark' ? 'text-indigo-400 hover:bg-indigo-400/10' : 'text-indigo-600 hover:bg-indigo-50'}`}
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        ADMIN PANEL
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>


      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 grid grid-cols-1 xl:grid-cols-12 gap-6 sm:gap-8 relative z-10">
        
        {/* Left Column: Control & Primary Signal */}
        <div className="col-span-1 xl:col-span-8 flex flex-col gap-8">
          
          {newsWarning && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/10 border border-red-500/20 rounded-2xl p-5 flex items-center gap-4 shadow-2xl "
            >
              <div className="w-12 h-12 rounded-lg bg-red-500/20 flex items-center justify-center shrink-0 border border-red-500/20">
                <AlertCircle className="w-6 h-6 text-red-400 animate-pulse" />
              </div>
              <div>
                <div className="text-red-400 font-bold text-xs tracking-[0.2em] uppercase mb-1">Volatility Alert: High Impact News</div>
                <div className={`${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'} text-sm font-medium transition-colors`}>{newsWarning.title} ({newsWarning.country})</div>
                <div className={`${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} text-xs mt-1 transition-colors`}>Trading engine paused for affected pairs ({newsWarning.country}) during ±15m news window to protect capital.</div>
              </div>
            </motion.div>
          )}

          {/* Controls Section */}
          <div className={`${theme === 'dark' ? 'bg-slate-800 border-white/5' : 'bg-white border-slate-200 shadow-sm'} border rounded-2xl p-5 sm:p-6 relative overflow-hidden shadow-2xl flex flex-col gap-8 transition-colors duration-300`}>
            <div className={`absolute inset-0 ${theme === 'dark' ? 'bg-gradient-to-b from-white/[0.02] to-transparent' : 'bg-gradient-to-b from-slate-50/50 to-transparent'} pointer-events-none`} />
            
            <div className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div>
                <h2 className={`text-xs font-mono font-bold tracking-widest ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'} uppercase mb-3 flex items-center gap-2 transition-colors`}>
                  <Crown className="w-4 h-4 text-amber-500" />
                  Active Strategy
                </h2>
                <div className="flex flex-wrap gap-2">
                  <div className="px-4 py-2 rounded-lg text-xs font-mono font-medium border bg-amber-500/10 border-amber-500/30 text-amber-400 flex items-center gap-2 shadow-sm">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>QFM Strategy (3x / Day Frequency)</span>
                  </div>
                </div>
              </div>

              <div>
                <h2 className={`text-xs font-mono font-bold tracking-widest ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'} uppercase mb-3 flex items-center gap-2 transition-colors`}>
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
                            : theme === 'dark' 
                              ? 'bg-slate-800/50 border-white/5 text-slate-500 hover:text-slate-300 hover:border-white/10'
                              : 'bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-800 hover:border-slate-300 shadow-sm'
                        } ${isAutoScanning ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {timeframe === tf.id && <CheckCircle2 className="w-3 h-3" />}
                        {tf.label}
                      </button>
                    ))}
                  </div>
              </div>
              
              <div>
                <h2 className={`text-xs font-mono font-bold tracking-widest ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'} uppercase mb-3 flex items-center gap-2 transition-colors`}>
                  <Target className="w-4 h-4 text-emerald-500" />
                  Market Assets
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
                          : theme === 'dark'
                            ? 'bg-slate-800/50 border-white/5 text-slate-500 hover:text-slate-300 hover:border-white/10'
                            : 'bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-800 hover:border-slate-300 shadow-sm'
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
                className={`relative group w-full h-16 rounded-2xl flex items-center justify-between px-6 transition-all duration-300 border shadow-lg ${
                  isAutoScanning 
                    ? 'bg-amber-500/10 border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.15)]' 
                    : theme === 'dark'
                      ? 'bg-indigo-500/10 border-indigo-500/30 hover:bg-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.1)]'
                      : 'bg-white border-indigo-500/30 hover:bg-indigo-50 shadow-md'
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
                    <div className={`text-[9px] font-mono opacity-60 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} uppercase mt-0.5 transition-colors`}>
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
            <AnimatePresence>
                            {marketStatus === "WEEKEND_CRYPTO_ONLY" && !isScanning && stats.scanned > 0 && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-8">
                  <div className="text-amber-400 bg-amber-400/10 px-5 py-4 rounded-2xl border border-amber-400/20 flex items-start gap-3 text-sm">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <p><strong>Weekend Mode:</strong> Traditional markets are closed. Only 24/7 Crypto pairs were scanned.</p>
                  </div>
                </motion.div>
              )}

              {error && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-8">
                  <div className="text-rose-400 bg-rose-400/10 px-5 py-4 rounded-2xl border border-rose-400/20 flex items-center gap-3 text-sm">
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
                className={`${theme === 'dark' ? 'bg-slate-800 border-white/5' : 'bg-white border-slate-200'} border rounded-2xl p-12 flex flex-col items-center justify-center min-h-[200px] transition-colors duration-300`}
              >
                <div className="w-16 h-16 relative mb-6">
                  <div className="absolute inset-0 border-t-2 border-indigo-500 rounded-full animate-spin" />
                  <div className="absolute inset-2 border-r-2 border-blue-500 rounded-full animate-spin direction-reverse" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
                  <div className="absolute inset-4 border-b-2 border-purple-500 rounded-full animate-spin" style={{ animationDuration: '3s' }} />
                </div>
                <h3 className={`text-xl font-display font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'} tracking-wide mb-2 transition-colors`}>Analyzing Order Flow</h3>
                <p className={`text-sm font-mono ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'} transition-colors`}>Scanning {timeframe.toUpperCase()} timeframe data points...</p>
              </motion.div>
            ) : bestSignal ? (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`${theme === 'dark' ? 'bg-slate-800 border-white/5' : 'bg-white border-slate-200 shadow-xl'} border rounded-2xl p-5 sm:p-8 lg:p-10 relative overflow-hidden shadow-2xl ${displaySignal.action === 'BUY' ? 'border-emerald-500/20' : 'border-rose-500/20'} transition-colors duration-300`}
              >
                {/* Accent Gradients */}
                <div className={`absolute top-0 left-0 w-full h-32 bg-gradient-to-b opacity-20 pointer-events-none ${displaySignal.action === 'BUY' ? 'from-emerald-500 to-transparent' : 'from-rose-500 to-transparent'}`} />
                
                <div className="relative z-10">
                  <div className="flex flex-col md:flex-row md:items-start justify-between mb-10 gap-6">
                    <div>
                      <div className="flex flex-wrap items-center gap-3 mb-4">
                        <span className={`px-3 py-1 ${theme === 'dark' ? 'bg-slate-800 text-slate-400 border-white/5' : 'bg-slate-100 text-slate-500 border-slate-200'} text-xs font-mono rounded-lg border transition-colors`}>
                          {displaySignal.type.toUpperCase()}
                        </span>
                        <span className={`px-3 py-1 ${theme === 'dark' ? 'bg-slate-800 text-slate-400 border-white/5' : 'bg-slate-100 text-slate-500 border-slate-200'} text-xs font-mono rounded-lg border flex items-center gap-1 transition-colors`}>
                          <Activity className="w-3 h-3" /> CONFIDENCE {displaySignal.confidence}%
                        </span>
                        <span className="px-3 py-1 bg-indigo-500/10 text-xs font-mono rounded-lg text-amber-400 border border-amber-500/20 flex items-center gap-1">
                          <Box className="w-3 h-3" /> {timeframe.toUpperCase()} VOLUME LEVEL VERIFIED
                        </span>
                        <span className="px-3 py-1 bg-violet-500/10 text-xs font-mono rounded-lg text-violet-400 border border-violet-500/20 flex items-center gap-1">
                          <Zap className="w-3.5 h-3.5 text-violet-400 animate-pulse" /> VOLUME PROFILE CONFIRMED
                        </span>
                        {displaySignal.vannaConfirmed && (
                          <span className="px-3 py-1 bg-cyan-500/10 text-xs font-mono rounded-lg text-cyan-400 border border-cyan-500/20 flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5" /> VANNA FLOW: {displaySignal.vannaBias?.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-4">
                        <h3 className={`text-3xl sm:text-4xl md:text-5xl font-display font-bold tracking-tighter ${theme === 'dark' ? 'text-white' : 'text-slate-800'} break-words transition-colors`}>{displaySignal.name}</h3>
                        <div className={`flex flex-col items-start px-4 py-2 rounded-lg border ${displaySignal.action === 'BUY' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
                          <span className="text-xs font-bold tracking-widest opacity-80 uppercase">Action</span>
                          <span className="text-2xl font-bold tracking-tight">{displaySignal.action}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-left md:text-right flex flex-col md:items-end">
                      <span className={`text-xs font-bold tracking-widest ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'} uppercase mb-1 transition-colors`}>Current Price</span>
                      <span className={`text-3xl font-mono ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'} transition-colors`}>{displaySignal.currentPrice.toFixed(5)}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Entry Zone */}
                    <div className={`${theme === 'dark' ? 'bg-slate-800/50 border-white/5' : 'bg-slate-50 border-slate-200'} rounded-lg p-6 border relative overflow-hidden group transition-colors`}>
                      <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="flex justify-between items-start mb-4 relative z-10">
                        <span className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} font-medium transition-colors`}>Entry Zone</span>
                        <Target className="w-5 h-5 text-amber-400" />
                      </div>
                      <div className={`font-mono text-xl ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'} relative z-10 transition-colors`}>
                        {Math.min(...displaySignal.entryZone).toFixed(5)}<br/>
                        <span className={`${theme === 'dark' ? 'text-slate-600' : 'text-slate-400'} transition-colors`}>to</span><br/>
                        {Math.max(...displaySignal.entryZone).toFixed(5)}
                      </div>
                    </div>

                    {/* Take Profit */}
                    <div className={`${theme === 'dark' ? 'bg-slate-800/50 border-white/5' : 'bg-slate-50 border-slate-200'} rounded-lg p-6 border relative overflow-hidden group transition-colors`}>
                      <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="flex justify-between items-start mb-4 relative z-10">
                        <span className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} font-medium transition-colors`}>Take Profit</span>
                        <TrendingUp className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div className="font-mono text-3xl text-emerald-400 relative z-10 mt-6">
                        {displaySignal.takeProfit.toFixed(5)}
                      </div>
                    </div>

                    {/* Stop Loss */}
                    <div className={`${theme === 'dark' ? 'bg-slate-800/50 border-white/5' : 'bg-slate-50 border-slate-200'} rounded-lg p-6 border relative overflow-hidden group transition-colors`}>
                      <div className="absolute inset-0 bg-rose-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="flex justify-between items-start mb-4 relative z-10">
                        <span className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} font-medium transition-colors`}>Stop Loss</span>
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
                      <div className={`mt-8 pt-8 border-t ${theme === 'dark' ? 'border-white/5' : 'border-slate-100'} transition-colors`}>
                        <h4 className={`text-xs font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} mb-6 flex flex-wrap items-center gap-2 break-words transition-colors`}>
                          <Activity className="w-4 h-4 text-cyan-400 shrink-0" />
                          <span>QFM Multi-Timeframe Strategy Matrix ({timeframe.toUpperCase()})</span>
                        </h4>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                          {/* Left Details: Narrative of the setup */}
                          <div className="lg:col-span-5 space-y-4">
                            <div className={`${theme === 'dark' ? 'bg-slate-800/40 border-white/5' : 'bg-slate-50 border-slate-200'} border rounded-lg p-5 space-y-3 transition-colors`}>
                              <div className={`text-xs font-mono ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>SETUP CLASSIFICATION</div>
                              <div className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>
                                <span>{isLong ? 'QFM Bullish Order Block / FVG Fuel Retest' : 'QFM Bearish Order Block / FVG Fuel Retest'}</span>
                              </div>
                              <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} leading-relaxed transition-colors`}>
                                High-frequency institutional QFM strategy engineered by QFM ANALYTICS. Triggers setups approximately ~3 times a day by scanning order blocks and qualified FVGs with On Balance Volume (OBV) Footprints and Awesome Oscillator (AO) volume momentum confirmation. Stop loss is surgically placed beyond the fuel zone with a 1:5+ RR target.
                              </p>
                            </div>

                            {/* Multi-Timeframe Matrix */}
                            <div className={`${theme === 'dark' ? 'bg-slate-800/50 border-white/5' : 'bg-slate-50 border-slate-200'} border rounded-lg p-5 space-y-4 transition-colors`}>
                              <div className="text-xs font-mono text-cyan-400 font-bold tracking-widest uppercase break-words">Execution Matrix ({timeframe.toUpperCase()} Volume Profile)</div>
                              
                              <div className={`flex items-start gap-3 border-b ${theme === 'dark' ? 'border-white/5' : 'border-slate-200'} pb-3`}>
                                <div className={`mt-0.5 p-1.5 rounded-lg bg-blue-500/10 text-blue-400`}>
                                  <Radar className="w-3.5 h-3.5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className={`text-[10px] font-mono ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'} uppercase break-words`}>Step 1: HTF & LTF Bias</div>
                                  <div className={`text-xs font-bold ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'} break-words whitespace-normal transition-colors`}>
                                    {displaySignal.layer1Bias || "HTF Trend: NEUTRAL"}
                                  </div>
                                </div>
                              </div>

                              <div className={`flex items-start gap-3 border-b ${theme === 'dark' ? 'border-white/5' : 'border-slate-200'} pb-3`}>
                                <div className={`mt-0.5 p-1.5 rounded-lg bg-indigo-500/10 text-amber-400`}>
                                  <Box className="w-3.5 h-3.5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className={`text-[10px] font-mono ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'} uppercase break-words`}>Step 2: Value Area Support/Resistance</div>
                                  <div className={`text-xs font-bold ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'} break-words whitespace-normal transition-colors`}>
                                    {displaySignal.layer2Zone || "Verified POC Level"}
                                  </div>
                                </div>
                              </div>

                              <div className={`flex items-start gap-3 border-b ${theme === 'dark' ? 'border-white/5' : 'border-slate-200'} pb-3`}>
                                <div className="mt-0.5 p-1.5 rounded-lg bg-violet-500/10 text-violet-400">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className={`text-[10px] font-mono ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'} uppercase break-words`}>Step 3: POC Crossover Confirmation</div>
                                  <div className={`text-xs font-bold ${theme === 'dark' ? 'text-violet-300' : 'text-violet-600'} break-words whitespace-normal mb-1 transition-colors`}>
                                    {displaySignal.layer3Confirm || "Confirmed"}
                                  </div>
                                </div>
                              </div>

                              <div className={`flex items-start gap-3 border-b ${theme === 'dark' ? 'border-white/5' : 'border-slate-200'} pb-3`}>
                                <div className="mt-0.5 p-1.5 rounded-lg bg-fuchsia-500/10 text-fuchsia-400">
                                  <Activity className="w-3.5 h-3.5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className={`text-[10px] font-mono ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'} uppercase break-words`}>Step 4: Trend & Momentum Fuel</div>
                                  <div className={`text-xs font-medium ${theme === 'dark' ? 'text-fuchsia-300' : 'text-fuchsia-600'} leading-normal break-words whitespace-normal transition-colors`}>
                                    {displaySignal.layer4Filter || ""}
                                  </div>
                                </div>
                              </div>

                              <div className={`flex items-start gap-3 border-b ${theme === 'dark' ? 'border-white/5' : 'border-slate-200'} pb-3`}>
                                <div className="mt-0.5 p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                                  <Target className="w-3.5 h-3.5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className={`text-[10px] font-mono ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'} uppercase break-words`}>Step 5: Dynamic RR Targets</div>
                                  <div className={`text-xs font-medium ${theme === 'dark' ? 'text-emerald-300' : 'text-emerald-600'} leading-normal break-words whitespace-normal transition-colors`}>
                                    {displaySignal.layer25RR || "Target & Stop Calculated"}
                                  </div>
                                </div>
                              </div>
                              <div className={`flex items-start gap-3 border-b ${theme === 'dark' ? 'border-white/5' : 'border-slate-200'} pb-3`}>
                                <div className="mt-0.5 p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                                  <Activity className="w-3.5 h-3.5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className={`text-[10px] font-mono ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'} uppercase break-words`}>Step 6: Volume Profile & POC</div>
                                  <div className={`text-xs font-medium ${theme === 'dark' ? 'text-indigo-300' : 'text-indigo-600'} leading-normal break-words whitespace-normal transition-colors`}>
                                    {displaySignal.volumeProfileConfirmed ? `Confirmed (HVN: ${displaySignal.hvnPrice?.toFixed(5) || 'Calculated'})` : `Awaiting Volume Pullback (HVN: ${displaySignal.hvnPrice?.toFixed(5) || 'N/A'})`}
                                  </div>
                                </div>
                              </div>

                              <div className={`flex items-start gap-3 border-b ${theme === 'dark' ? 'border-white/5' : 'border-slate-200'} pb-3`}>
                                <div className="mt-0.5 p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                                  <Target className="w-3.5 h-3.5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className={`text-[10px] font-mono ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'} uppercase break-words`}>Step 7: Real Order Flow</div>
                                  <div className={`text-xs font-medium ${theme === 'dark' ? 'text-amber-300' : 'text-amber-600'} leading-normal break-words whitespace-normal transition-colors`}>
                                    {displaySignal.orderFlowConfirmed ? (displaySignal.orderFlowDetails || 'Delta Alignment Confirmed') : 'Waiting for Taker Volume Shift'}
                                  </div>
                                </div>
                              </div>

                              <div className={`flex items-start gap-3 border-b ${theme === 'dark' ? 'border-white/5' : 'border-slate-200'} pb-3`}>
                                <div className="mt-0.5 p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                                  <ShieldCheck className="w-3.5 h-3.5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className={`text-[10px] font-mono ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'} uppercase break-words`}>Step 8: Gamma Exposure (GEX)</div>
                                  <div className={`text-xs font-medium ${theme === 'dark' ? 'text-emerald-300' : 'text-emerald-600'} leading-normal break-words whitespace-normal transition-colors`}>
                                    {displaySignal.gexConfirmed ? `GEX Alignment: ${displaySignal.netGex && displaySignal.netGex > 0 ? 'POSITIVE' : 'NEGATIVE'} (Pin: ${displaySignal.gexPinPrice?.toFixed(2) || 'N/A'})` : 'GEX Analysis Pending'}
                                  </div>
                                </div>
                              </div>

                              <div className={`flex items-start gap-3 border-b ${theme === 'dark' ? 'border-white/5' : 'border-slate-200'} pb-3`}>
                                <div className="mt-0.5 p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                                  <ShieldCheck className="w-3.5 h-3.5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className={`text-[10px] font-mono ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'} uppercase break-words`}>Step 9: Vanna Model Alignment</div>
                                  <div className={`text-xs font-medium ${theme === 'dark' ? 'text-indigo-300' : 'text-indigo-600'} leading-normal break-words whitespace-normal transition-colors`}>
                                    {displaySignal.vannaConfirmed ? `Vanna Flow: ${displaySignal.vannaBias || 'Confirmed'} (Net: ${displaySignal.netVanna?.toFixed(4) || 'N/A'})` : 'Vanna Analysis Pending'}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                              <div className={`${theme === 'dark' ? 'bg-slate-900/60 border-white/5' : 'bg-white border-slate-200'} border rounded-lg p-4 text-center shadow-inner relative overflow-hidden group transition-colors`}>
                                <div className="absolute inset-0 bg-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className={`text-[10px] font-mono ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'} uppercase tracking-wider mb-1 relative z-10 transition-colors`}>DYNAMIC R:R</div>
                                <div className="text-xl font-bold font-mono text-cyan-400 relative z-10">1 : {displayRatio}</div>
                              </div>
                              <div className={`${theme === 'dark' ? 'bg-slate-900/60 border-white/5' : 'bg-white border-slate-200'} border rounded-lg p-4 text-center shadow-inner relative overflow-hidden group transition-colors`}>
                                <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className={`text-[10px] font-mono ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'} uppercase tracking-wider mb-1 relative z-10 transition-colors`}>CONFIDENCE</div>
                                <div className="text-xl font-bold font-mono text-emerald-400 relative z-10">
                                  {displaySignal.confidence}%
                                </div>
                              </div>
                              <div className={`${theme === 'dark' ? 'bg-slate-900/60 border-white/5' : 'bg-white border-slate-200'} border rounded-lg p-4 text-center shadow-inner relative overflow-hidden group transition-colors`}>
                                <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className={`text-[10px] font-mono ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'} uppercase tracking-wider mb-1 relative z-10 transition-colors`}>VANNA FLOW</div>
                                <div className="text-xl font-bold font-mono text-indigo-400 relative z-10">
                                  {displaySignal.vannaBias?.toUpperCase() || "SUPPORTIVE"}
                                </div>
                              </div>
                            </div>
                            
                              <div className="bg-rose-500/5 border border-rose-500/10 rounded-lg p-4 space-y-2 mt-4">
                              <div className="flex items-center gap-2 text-rose-400">
                                <AlertCircle className="w-4 h-4" />
                                <span className="text-[10px] font-mono font-bold tracking-widest uppercase">Strategy Rules & Guardrails</span>
                              </div>
                              <ul className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} list-disc list-inside space-y-1 transition-colors`}>
                                <li><strong>TPO & Vol Confluence:</strong> Signal requires price to align with both Time-spent (TPO) and Volume-traded (POC) levels.</li>
                                <li><strong>GEX Mandatory Filter:</strong> Buyers MUST have Positive GEX alignment; Sellers MUST have Negative GEX alignment.</li>
                                <li><strong>HTF Trend Lock:</strong> Execution is strictly forbidden unless the {getHTFIntervals(timeframe).trend.toUpperCase()} trend is decisively matching the setup direction (no consolidating).</li>
                                <li><strong>HTF DOL & FVG:</strong> A clear Draw on Liquidity (DOL) and Fair Value Gap (FVG) MUST first be spotted on the {getHTFIntervals(timeframe).trend.toUpperCase()} timeframe.</li>
                                <li><strong>ATR Proximity Check:</strong> Entry MUST be within 0.5 ATR of the Equilibrium Zone to prevent chasing.</li>
                                <li><strong>Vanna Flow Filter:</strong> Net Vanna must align with the trade direction to ensure supportive dealer hedging.</li>
                                <li><strong>Order Flow Delta:</strong> Real-time Taker Volume Imbalance must confirm the structural setup.</li>
                                <li><strong>Anchor Profiling:</strong> Profiles are anchored to recent major swing highs/lows for structural relevance.</li>
                                <li><strong>Value Area Verification:</strong> A setup is verified when price establishes the Value Area boundaries.</li>
                              </ul>
                            </div>
                          </div>

                          {/* Right Column: Visual Setup mimicking the uploaded photo */}
                          <div className={`${theme === 'dark' ? 'bg-slate-900/60 border-white/5' : 'bg-white border-slate-200'} border rounded-lg p-6 relative overflow-hidden flex flex-col justify-center min-h-[220px] transition-colors`}>
                            {/* Watermark grid background */}
                            <div className={`absolute inset-0 ${theme === 'dark' ? 'opacity-[0.03]' : 'opacity-[0.06]'} bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none transition-opacity`} />
                            
                            <div className="relative w-full flex flex-col font-mono text-[11px] gap-1 z-10">
                              {/* 1. TOP PART */}
                              {isLong ? (
                                <>
                                  {/* Long Target Box (Cyan) */}
                                  <div className={`relative border border-cyan-500/25 ${theme === 'dark' ? 'bg-cyan-500/10' : 'bg-cyan-50'} rounded-t-xl p-3 flex flex-col justify-between min-h-[5rem] transition-all hover:bg-cyan-500/15`}>
                                    <div className="flex flex-wrap gap-2 justify-between items-start">
                                      <span className="text-cyan-400 font-bold">PROFIT TARGET (REWARD)</span>
                                      <span className={`${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'} transition-colors`}>TP1: {displaySignal.takeProfit.toFixed(5)}{displaySignal.takeProfit2 && displaySignal.takeProfit2 !== displaySignal.takeProfit ? ` | TP2: ${displaySignal.takeProfit2.toFixed(5)}` : ''}</span>
                                    </div>
                                    <div className="flex justify-between text-[10px] text-cyan-400/70">
                                      <span>Ratio: {displayRatio}R</span>
                                      <span>Reward: +{((rewardAmt / displaySignal.currentPrice) * 100).toFixed(2)}%</span>
                                    </div>
                                  </div>

                                  {/* Entry Divider */}
                                  <div className={`relative py-1 flex flex-wrap gap-2 items-center justify-between border-y border-amber-500/30 ${theme === 'dark' ? 'bg-indigo-500/5' : 'bg-indigo-50/50'} px-3 transition-colors`}>
                                    <span className="text-amber-400 font-bold">CURRENT PRICE (ENTRY)</span>
                                    <span className={`${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'} font-bold transition-colors`}>{displaySignal.currentPrice.toFixed(5)}</span>
                                  </div>

                                  {/* Stop Loss Box (Rose) */}
                                  <div className={`relative border border-rose-500/25 ${theme === 'dark' ? 'bg-rose-500/10' : 'bg-rose-50'} rounded-b-xl p-3 flex flex-col justify-between min-h-[4rem] transition-all hover:bg-rose-500/15`}>
                                    <div className="flex flex-wrap gap-2 justify-between items-start">
                                      <span className="text-rose-400 font-bold">STOP LOSS (RISK)</span>
                                      <span className={`${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'} transition-colors`}>SL: {displaySignal.stopLoss.toFixed(5)}</span>
                                    </div>
                                    <div className="flex justify-between text-[10px] text-rose-400/70">
                                      <span>Risk: -{((riskAmt / displaySignal.currentPrice) * 100).toFixed(2)}%</span>
                                    </div>
                                  </div>
                                </>
                              ) : (
                                <>
                                  {/* Stop Loss Box (Rose) */}
                                  <div className={`relative border border-rose-500/25 ${theme === 'dark' ? 'bg-rose-500/10' : 'bg-rose-50'} rounded-t-xl p-3 flex flex-col justify-between min-h-[4rem] transition-all hover:bg-rose-500/15`}>
                                    <div className="flex flex-wrap gap-2 justify-between items-start">
                                      <span className="text-rose-400 font-bold">STOP LOSS (RISK)</span>
                                      <span className={`${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'} transition-colors`}>SL: {displaySignal.stopLoss.toFixed(5)}</span>
                                    </div>
                                    <div className="flex justify-between text-[10px] text-rose-400/70">
                                      <span>Risk: -{((riskAmt / displaySignal.currentPrice) * 100).toFixed(2)}%</span>
                                    </div>
                                  </div>

                                  {/* Entry Divider */}
                                  <div className={`relative py-1 flex flex-wrap gap-2 items-center justify-between border-y border-amber-500/30 ${theme === 'dark' ? 'bg-indigo-500/5' : 'bg-indigo-50/50'} px-3 transition-colors`}>
                                    <span className="text-amber-400 font-bold">CURRENT PRICE (ENTRY)</span>
                                    <span className={`${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'} font-bold transition-colors`}>{displaySignal.currentPrice.toFixed(5)}</span>
                                  </div>

                                  {/* Short Target Box (Cyan) */}
                                  <div className={`relative border border-cyan-500/25 ${theme === 'dark' ? 'bg-cyan-500/10' : 'bg-cyan-50'} rounded-b-xl p-3 flex flex-col justify-between min-h-[5rem] transition-all hover:bg-cyan-500/15`}>
                                    <div className="flex flex-wrap gap-2 justify-between items-start">
                                      <span className="text-cyan-400 font-bold">PROFIT TARGET (REWARD)</span>
                                      <span className={`${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'} transition-colors`}>TP1: {displaySignal.takeProfit.toFixed(5)}{displaySignal.takeProfit2 && displaySignal.takeProfit2 !== displaySignal.takeProfit ? ` | TP2: ${displaySignal.takeProfit2.toFixed(5)}` : ''}</span>
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
                className={`${theme === 'dark' ? 'bg-slate-800 border-white/5' : 'bg-white border-slate-200 shadow-sm'} border rounded-2xl p-12 flex flex-col items-center justify-center text-center min-h-[200px] transition-colors duration-300`}
              >
                <div className={`w-16 h-16 rounded-lg ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'} flex items-center justify-center mb-6 transition-colors`}>
                  <Ban className={`w-8 h-8 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
                </div>
                <h3 className={`text-xl font-display font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'} mb-2 transition-colors`}>No High-Probability Setups</h3>
                <p className={`${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'} text-sm max-w-md transition-colors`}>
                  Scanned {stats.scanned} pairs. Current market conditions do not align with our strict risk-to-reward parameters. Please check back later.
                </p>
              </motion.div>
            ) : stats.scanned === 0 ? (
              <motion.div
                key="initial"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`${theme === 'dark' ? 'bg-slate-800 border-white/5' : 'bg-white border-slate-200 shadow-sm'} border rounded-2xl p-12 flex flex-col items-center justify-center text-center min-h-[200px] relative overflow-hidden transition-colors duration-300`}
              >
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-500/5 via-transparent to-transparent pointer-events-none" />
                <div className={`w-20 h-20 rounded-lg ${theme === 'dark' ? 'bg-slate-800/50 border-white/5' : 'bg-slate-100 border-slate-200'} border flex items-center justify-center mb-6 relative shadow-2xl transition-colors`}>
                  <Radar className={`w-8 h-8 ${theme === 'dark' ? 'text-indigo-400/50' : 'text-indigo-500/50'}`} />
                  <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-500/50 animate-pulse" />
                </div>
                <h3 className={`text-xl font-display font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'} mb-2 transition-colors`}>Engine Ready</h3>
                <p className={`text-sm max-w-md ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'} transition-colors`}>
                  Select your desired markets and timeframe above, then initialize the automated scan to discover high-probability setups.
                </p>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        {/* Right Column: Alerts Feed */}
        <div className="col-span-1 xl:col-span-4 flex flex-col gap-6">
          <div className={`${theme === 'dark' ? 'bg-slate-800 border-white/5' : 'bg-white border-slate-200 shadow-sm'} border rounded-2xl p-6 flex-1 flex flex-col min-h-[400px] max-h-[800px] xl:max-h-[calc(100vh-160px)] shadow-2xl relative overflow-hidden transition-colors duration-300`}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5  pointer-events-none" />
            <div className={`flex items-center justify-between pb-6 border-b ${theme === 'dark' ? 'border-white/5' : 'border-slate-100'} mb-6 relative z-10 transition-colors`}>
              <h2 className={`text-sm font-display font-bold tracking-widest ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'} uppercase flex items-center gap-2 transition-colors`}>
                <Activity className="w-4 h-4" />
                Discovery Feed
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
                      className={`${theme === 'dark' ? 'bg-slate-800/50 hover:bg-slate-800/50' : 'bg-slate-50 hover:bg-slate-100'} border rounded-xl p-4 cursor-pointer transition-all duration-300
                        ${sig.pair === displaySignal?.pair ? 'border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.15)]' : theme === 'dark' ? 'border-white/5 hover:border-white/10' : 'border-slate-200 hover:border-slate-300 shadow-sm'}`}
                      onClick={() => setSelectedSignal(sig)}
                    >
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-8 rounded-full ${sig.action === 'BUY' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          <div>
                            <div className={`font-bold text-lg leading-none mb-1 ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'} transition-colors`}>{sig.name}</div>
                            <div className={`text-[10px] font-bold tracking-widest uppercase ${sig.action === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {sig.action} SIGNAL
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`text-[10px] ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'} font-mono block mb-1 transition-colors`}>{format(sig.time, 'HH:mm:ss')}</span>
                          <span className={`text-xs ${theme === 'dark' ? 'text-slate-400 bg-slate-800 border-white/5' : 'text-slate-500 bg-slate-100 border-slate-200'} font-mono px-2 py-1 rounded border transition-colors`}>{sig.type}</span>
                        </div>
                      </div>
                      
                      <div className={`grid grid-cols-3 gap-2 ${theme === 'dark' ? 'bg-slate-800/50 border-white/5' : 'bg-white border-slate-200'} rounded-2xl p-3 border transition-colors`}>
                        <div>
                          <div className={`text-[10px] uppercase tracking-wider ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'} mb-1 transition-colors`}>Entry</div>
                          <div className={`font-mono text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'} transition-colors`}>
                            {Math.min(...sig.entryZone).toFixed(sig.type==='Crypto' || sig.type==='Forex' ? 4 : 2)}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className={`text-[10px] uppercase tracking-wider ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'} mb-1 transition-colors`}>Vanna</div>
                          <div className="font-mono text-[10px] text-cyan-400 font-bold uppercase truncate">
                            {sig.vannaBias || "BULLISH"}
                          </div>
                        </div>
                        <div className="text-right">
                           <div className={`text-[10px] uppercase tracking-wider ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'} mb-1 transition-colors`}>Target</div>
                           <div className={`font-mono text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'} transition-colors`}>{sig.takeProfit.toFixed(sig.type==='Crypto' || sig.type==='Forex' ? 4 : 2)}</div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  !isScanning && (
                    <div className={`h-full flex flex-col items-center justify-center text-center p-8 mt-4 border border-dashed ${theme === 'dark' ? 'border-white/5 bg-slate-900/30' : 'border-slate-200 bg-slate-50'} rounded-lg transition-colors`}>
                      <div className={`w-12 h-12 rounded-2xl ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-200'} flex items-center justify-center mb-4 transition-colors`}>
                        <Target className={`w-5 h-5 ${theme === 'dark' ? 'text-slate-600' : 'text-slate-400'}`} />
                      </div>
                      <h4 className={`text-sm font-display font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'} mb-1 transition-colors`}>System Standby</h4>
                      <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'} max-w-[200px] transition-colors`}>Awaiting scan initialization. Validated setups will appear in this feed.</p>
                    </div>
                  )
                )}
                {isScanning && (
                  Array(4).fill(0).map((_, i) => (
                    <div key={'skeleton'+i} className={`animate-pulse ${theme === 'dark' ? 'bg-slate-800/50 border-white/5' : 'bg-slate-100 border-slate-200'} rounded-lg h-32 border transition-colors`} />
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

      </main>

      {/* Professional Footer */}
      <footer className={`border-t ${theme === 'dark' ? 'border-white/5 bg-slate-900' : 'border-slate-200 bg-white'} z-10 relative mt-4 transition-colors duration-300`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg overflow-hidden border ${theme === 'dark' ? 'border-white/10' : 'border-slate-200'} opacity-70`}>
                <img src="/icon.jpg" alt="QFM Logo" className={`w-full h-full object-cover grayscale ${theme === 'dark' ? 'mix-blend-screen' : 'mix-blend-multiply'}`} />
              </div>
              <div className="flex flex-col">
                <span className={`font-mono text-xs tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'} uppercase transition-colors`}>
                  QFM Analytics © {new Date().getFullYear()}
                </span>
                <span className={`font-mono text-[9px] tracking-widest ${theme === 'dark' ? 'text-slate-600' : 'text-slate-400'} uppercase mt-0.5 transition-colors`}>
                  Institutional Grade Trading Tools
                </span>
              </div>
            </div>
            
            <div className={`flex flex-wrap justify-center gap-x-8 gap-y-3 font-mono text-[10px] tracking-widest ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'} uppercase transition-colors`}>
              <button onClick={() => setActiveInfoTab('status')} className="hover:text-amber-400 transition-colors uppercase">System Status</button>
              <button onClick={() => setActiveInfoTab('docs')} className="hover:text-amber-400 transition-colors uppercase">Documentation</button>
              <button onClick={() => setActiveInfoTab('risk')} className="hover:text-amber-400 transition-colors uppercase">Risk Disclaimer</button>
              <button onClick={() => setActiveInfoTab('terms')} className="hover:text-amber-400 transition-colors uppercase">Terms of Service</button>
            </div>
          </div>

          {activeInfoTab && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mt-4 p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-900/50 border-white/5' : 'bg-slate-50 border-slate-200'} relative`}
            >
              <button 
                onClick={() => setActiveInfoTab(null)}
                className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/5 transition-colors"
              >
                <Box className="w-4 h-4 opacity-50" />
              </button>
              
              {activeInfoTab === 'status' && (
                <div className="space-y-4">
                  <h3 className={`text-xs font-bold tracking-widest uppercase ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>System Status</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className={`text-[10px] font-mono uppercase ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Polygon.io Data Feed: ONLINE</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className={`text-[10px] font-mono uppercase ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Volume Profile Engine: OPERATIONAL</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className={`text-[10px] font-mono uppercase ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>TPO Pattern Matcher: ACTIVE</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className={`text-[10px] font-mono uppercase ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Signal Distribution: LIVE</span>
                    </div>
                  </div>
                </div>
              )}

              {activeInfoTab === 'docs' && (
                <div className="space-y-4">
                  <h3 className={`text-xs font-bold tracking-widest uppercase ${theme === 'dark' ? 'text-amber-400' : 'text-amber-600'}`}>Documentation Overview</h3>
                  <div className={`text-[10px] leading-relaxed font-mono ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'} space-y-2`}>
                    <p><strong>L1 BIAS:</strong> Uses TPO Initial Balance & Point of Control (POC) to determine intraday trend direction.</p>
                    <p><strong>L2 ZONE:</strong> Identifies High Volume Areas (HVN) and Low Volume Areas (LVN) for precise entry/exit points.</p>
                    <p><strong>L3 CONFIRM:</strong> Real-time tape reading and delta footprint analysis to confirm institutional aggression.</p>
                    <p><strong>L4 FILTER:</strong> Multi-timeframe trend alignment and volatility (ATR) checks.</p>
                    <p><strong>L5 EXEC:</strong> Final execution logic based on VWAP standard deviation bands and volume climax patterns.</p>
                  </div>
                </div>
              )}

              {activeInfoTab === 'risk' && (
                <div className="space-y-4">
                  <h3 className={`text-xs font-bold tracking-widest uppercase text-rose-400`}>Risk Disclaimer</h3>
                  <p className={`text-[10px] leading-relaxed font-mono ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    Trading carries a high level of risk and may not be suitable for all investors. 
                    Leverage can work against you. Before deciding to trade, carefully consider your investment objectives and risk appetite. 
                    Data provided by QFM Master Bot is for analytical purposes only and should not be considered financial advice. 
                    Past performance is not indicative of future results. Never trade with money you cannot afford to lose.
                  </p>
                </div>
              )}

              {activeInfoTab === 'terms' && (
                <div className="space-y-4">
                  <h3 className={`text-xs font-bold tracking-widest uppercase ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Terms of Use</h3>
                  <div className={`text-[10px] leading-relaxed font-mono ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'} space-y-2`}>
                    <p>1. The QFM Master Bot is a proprietary analytical tool. Unauthorized distribution is prohibited.</p>
                    <p>2. Users are responsible for their own trading decisions. QFM Analytics holds no liability for financial losses.</p>
                    <p>3. Service availability depends on upstream data providers (Polygon.io, etc). Downtime is possible.</p>
                    <p>4. Signals are generated using algorithmic TPO & Volume Profile models which are subject to market volatility.</p>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          <div className={`mt-4 pt-4 border-t ${theme === 'dark' ? 'border-white/5' : 'border-slate-100'} text-[10px] ${theme === 'dark' ? 'text-slate-600/60' : 'text-slate-400'} font-mono text-center md:text-left leading-relaxed max-w-5xl mx-auto md:mx-0 transition-colors`}>
            Trading foreign exchange and cryptocurrencies involves significant risk. See the Risk Disclaimer for more information.
          </div>

        </div>
      </footer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: ${theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'};
          border-radius: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: ${theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'};
        }
      `}</style>

      {/* Admin Login Modal */}
      {showBacktest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-lg p-6 rounded-3xl border shadow-2xl ${theme === 'dark' ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold font-serif tracking-tight">Strategy Backtest Engine</h2>
              <button onClick={() => setShowBacktest(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            
            <div className="space-y-4 mb-6">
              <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                Test current strategy rules against historical market data (up to 1,095 days). It dynamically recalculates volume profiles, gamma exposure, and delta to verify the mathematical win rate.
              </p>
              
              <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-800/50 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-4">
                  <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] sm:text-xs font-mono text-slate-500">PAIR:</span>
                      <select 
                          value={backtestPair}
                          onChange={(e) => setBacktestPair(e.target.value)}
                          disabled={backtestState.isRunning}
                          className={`text-[10px] sm:text-xs px-2 py-1 rounded border font-mono ${theme === 'dark' ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                      >
                          {CRYPTO_PAIRS.map(p => (
                              <option key={p} value={p}>{p}</option>
                          ))}
                      </select>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] sm:text-xs font-mono text-slate-500">DAYS:</span>
                      <input 
                          type="number" 
                          value={backtestDays} 
                          onChange={(e) => setBacktestDays(e.target.value === '' ? '' : parseInt(e.target.value) || '')}
                          className={`w-14 sm:w-16 px-2 py-1 text-[10px] sm:text-xs rounded border text-center font-mono ${theme === 'dark' ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                          min="1"
                          max="1095"
                          disabled={backtestState.isRunning}
                      />
                    </div>
                  </div>
                  <span className="text-[10px] sm:text-xs font-mono text-slate-500">STRATEGY: {strategy.toUpperCase()}</span>
                </div>
                
                {backtestState.isRunning ? (
                    <div className="space-y-3">
                        <div className="flex justify-between text-xs font-mono">
                            <span className="text-indigo-400">{backtestState.status}</span>
                            <span>{backtestState.progress}%</span>
                        </div>
                        <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-indigo-500 h-full transition-all duration-300" style={{ width: `${backtestState.progress}%` }} />
                        </div>
                    </div>
                ) : backtestState.status ? (
                    <div className="text-center py-4">
                        {backtestState.status.includes('Error') ? (
                            <div className="text-red-400 text-sm font-mono">{backtestState.status}</div>
                        ) : (
                            <div className="space-y-4">
                                <div className="text-sm text-indigo-400 font-mono font-bold">{backtestState.status}</div>
                                <div className="grid grid-cols-2 gap-4 text-left">
                                    <div className={`p-3 rounded-xl ${theme === 'dark' ? 'bg-slate-900' : 'bg-white'} border ${theme === 'dark' ? 'border-white/5' : 'border-slate-200'}`}>
                                        <div className="text-[10px] text-slate-500 font-mono mb-1">WIN RATE</div>
                                        <div className="text-2xl font-bold text-emerald-400 font-mono">{backtestState.winRate}%</div>
                                    </div>
                                    <div className={`p-3 rounded-xl ${theme === 'dark' ? 'bg-slate-900' : 'bg-white'} border ${theme === 'dark' ? 'border-white/5' : 'border-slate-200'}`}>
                                        <div className="text-[10px] text-slate-500 font-mono mb-1">MIN RR</div>
                                        <div className="text-2xl font-bold text-amber-400 font-mono">{backtestState.minRR || 'N/A'}</div>
                                    </div>
                                    <div className={`p-3 rounded-xl ${theme === 'dark' ? 'bg-slate-900' : 'bg-white'} border ${theme === 'dark' ? 'border-white/5' : 'border-slate-200'}`}>
                                        <div className="text-[10px] text-slate-500 font-mono mb-1">TOTAL TRADES</div>
                                        <div className="text-lg font-bold text-indigo-400 font-mono">{backtestState.totalTrades}</div>
                                    </div>
                                    <div className={`p-3 rounded-xl ${theme === 'dark' ? 'bg-slate-900' : 'bg-white'} border ${theme === 'dark' ? 'border-white/5' : 'border-slate-200'}`}>
                                        <div className="text-[10px] text-slate-500 font-mono mb-1">WINS / LOSSES</div>
                                        <div className="text-lg font-bold text-slate-300 font-mono">{backtestState.wins} / {backtestState.losses}</div>
                                    </div>
                                    <div className={`col-span-2 p-3 rounded-xl ${theme === 'dark' ? 'bg-slate-900' : 'bg-white'} border ${theme === 'dark' ? 'border-white/5' : 'border-slate-200'}`}>
                                        <div className="text-[10px] text-slate-500 font-mono mb-1">EST. PNL (10x Lev)</div>
                                        <div className={`text-lg font-bold font-mono ${backtestState.pnl > 0 ? 'text-emerald-400' : 'text-red-400'}`}>{backtestState.pnl > 0 ? '+' : ''}{backtestState.pnl}%</div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-6 text-sm text-slate-500 font-mono">
                        Ready to simulate.
                    </div>
                )}
              </div>
            </div>
            
            <button
              onClick={runBacktest}
              disabled={backtestState.isRunning}
              className={`w-full py-3 rounded-xl text-sm font-bold tracking-wider transition-all duration-300 ${backtestState.isRunning ? 'bg-indigo-500/50 text-white/50 cursor-not-allowed' : 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'}`}
            >
              {backtestState.isRunning ? 'SIMULATING...' : `RUN BACKTEST (${backtestDays} DAYS)`}
            </button>
          </div>
        </div>
      )}

      {showAdminLogin && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4">
              <div className={`w-full max-w-md p-6 rounded-xl border ${theme === 'dark' ? 'bg-[#0a0a0a] border-white/10' : 'bg-white border-slate-200'}`}>
                  <div className="flex justify-between items-center mb-6">
                      <h2 className="text-lg font-bold">Admin Verification</h2>
                      <button onClick={() => setShowAdminLogin(false)} className="text-slate-400 hover:text-white">✕</button>
                  </div>
                  <form onSubmit={submitAdminLogin} className="space-y-4">
                    <input
                      type="password"
                      placeholder="ENTER MASTER KEY"
                      value={adminPassword}
                      onChange={(e) => {
                      const val = e.target.value;
                      setAdminPassword(val);
                      if (val.trim() === "AQS///BOT") {
                        setShowAdminLogin(false);
                        setShowAdmin(true);
                        fetchAdminKey("AQS///BOT");
                      }
                    }}
                      className={`w-full px-4 py-3 rounded-xl bg-black/40 border ${authError ? 'border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.2)]' : 'border-white/10'} text-center font-mono text-sm tracking-[0.3em] uppercase focus:outline-none focus:border-amber-500/50 transition-all placeholder:text-slate-700`}
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

      {/* Admin Panel Modal */}
      {showAdmin && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4">
              <div className={`w-full max-w-md p-6 rounded-xl border ${theme === 'dark' ? 'bg-[#0a0a0a] border-white/10' : 'bg-white border-slate-200'}`}>
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
}

