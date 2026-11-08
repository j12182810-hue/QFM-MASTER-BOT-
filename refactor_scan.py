import re

with open("server.ts", "r") as f:
    content = f.read()

# Define the new architecture string
new_architecture = """

// --- DECOUPLED ARCHITECTURE FOR 3M+ CCU SCALE ---

interface MarketDataCache {
  candlesLTF: Candle[];
  candlesStruct: Candle[];
  candlesTrend: Candle[];
  displayPair: string;
  type: string;
}
const globalMarketData: Record<string, MarketDataCache> = {};

let isFetchingData = false;
async function runDataFetchLoop() {
  if (isFetchingData) return;
  isFetchingData = true;

  try {
    const htf = getHTFIntervals(activeTimeframe);
    console.log("[DataFetch] Fetching latest market data for all pairs...");

    // 1. Fetch Crypto Klines (Binance)
    let cryptoPromise = Promise.resolve();
    let cIndex = 0;
    let activeCrypto = 0;
    cryptoPromise = new Promise(resolve => {
      const next = async () => {
        if (cIndex >= CRYPTO_PAIRS.length) {
          if (activeCrypto === 0) resolve(undefined);
          return;
        }
        activeCrypto++;
        const pair = CRYPTO_PAIRS[cIndex++];
        try {
          const [dataLTF, dataStruct, dataTrend] = await Promise.all([
            fetchCryptoKlines(pair, activeTimeframe, 1000),
            fetchCryptoKlines(pair, htf.struct, 500),
            fetchCryptoKlines(pair, htf.trend, 200)
          ]);
          
          const mapCandle = (d: any) => ({
            time: d[0], open: parseFloat(d[1]), high: parseFloat(d[2]), low: parseFloat(d[3]),
            close: parseFloat(d[4]), volume: parseFloat(d[5]), takerBuyBaseVolume: parseFloat(d[9]),
          });
          const candles = dataLTF.map(mapCandle);
          const candlesStruct = dataStruct.map(mapCandle);
          const candlesTrend = dataTrend.map(mapCandle);
          
          let displayPair = pair.replace("USDT", "USD");
          if (realtimePrices[pair]) {
             candles[candles.length - 1].close = realtimePrices[pair];
          }

          globalMarketData[pair] = {
             candlesLTF: candles,
             candlesStruct,
             candlesTrend,
             displayPair,
             type: "Crypto"
          };
        } catch (err: any) {
          console.error(`Failed to fetch crypto ${pair}:`, err.message || String(err));
        } finally {
          activeCrypto--;
          setTimeout(next, 50); // Stagger to prevent rate limit
        }
      };
      // 5 concurrent for Binance to respect limits (30s interval means we have plenty of time)
      for(let i=0; i<5; i++) next();
    });

    // 2. Fetch Yahoo Finance (Forex/Commodities/Indices/Stocks)
    let yahooPairs = [
      ...FOREX_PAIRS.map(p => ({ pair: p, type: "Forex" })),
      ...COMMODITY_PAIRS.map(p => ({ pair: p, type: "Commodity" })),
      ...INDEX_PAIRS.map(p => ({ pair: p, type: "Index" })),
      ...STOCK_PAIRS.map(p => ({ pair: p, type: "Stock" }))
    ];

    const isWeekend = false;
    let yahooPromise = Promise.resolve();
    if (!isWeekend) {
        let yIndex = 0;
        let active = 0;
        yahooPromise = new Promise(resolve => {
            const next = () => {
                if (yIndex >= yahooPairs.length) {
                    if (active === 0) resolve(undefined);
                    return;
                }
                active++;
                const item = yahooPairs[yIndex++];
                
                (async () => {
                   try {
                        const yActive = activeTimeframe === "1h" ? "60m" : activeTimeframe;
                        const daysToFetch = activeTimeframe === "30m" ? 59 : 365;
                        const period1 = new Date(Date.now() - daysToFetch * 24 * 60 * 60 * 1000);
                        const queryOptions: any = { period1, interval: yActive };
                        
                        const result = await (yahooFinance.chart(item.pair, queryOptions as any) as Promise<any>).catch(() => ({ quotes: [] }));
                        const rawQuotes: any[] = result.quotes as any;
                        if (!rawQuotes || rawQuotes.length === 0) return;
                        
                        const parseQuotes = (quotes: any[]) => {
                          const candles: Candle[] = [];
                          for (const quote of quotes) {
                            if (!quote.open || !quote.high || !quote.low || !quote.close) continue;
                            candles.push({
                              time: quote.date.getTime(), open: quote.open, high: quote.high,
                              low: quote.low, close: quote.close, volume: quote.volume || 0
                            });
                          }
                          return candles;
                        };
                        const candles = parseQuotes(rawQuotes);
                        const candlesStruct = aggregateByTime(candles, htf.struct as any);
                        const candlesTrend = aggregateByTime(candles, htf.trend as any);
                        
                        let displayPair = item.pair.replace("=X", "").replace("-USD", "USD").replace(/^\^/g, "").toUpperCase();
                        if (realtimePrices[item.pair]) {
                           candles[candles.length - 1].close = realtimePrices[item.pair];
                        }
                        if (item.type === "Commodity") {
                            const commMap: Record<string, string> = { "GC": "GOLD", "SI": "SILVER", "CL": "WTI", "NG": "NATGAS" };
                            for(const [k, v] of Object.entries(commMap)) { if (displayPair.startsWith(k)) displayPair = v; }
                        } else if (item.type === "Index") {
                            if (displayPair.includes("GSPC")) displayPair = "SPX";
                            if (displayPair.includes("IXIC")) displayPair = "NDX";
                            if (displayPair.includes("DJI")) displayPair = "US30";
                        }
                        
                        globalMarketData[item.pair] = {
                            candlesLTF: candles,
                            candlesStruct,
                            candlesTrend,
                            displayPair,
                            type: item.type
                        };
                   } catch(e) {}
                })().finally(() => {
                    active--;
                    setTimeout(next, 50); // Staggering
                });
            };
            // 8 concurrent requests for Yahoo
            for(let i=0; i<8; i++) next();
        });
    }

    await Promise.all([cryptoPromise, yahooPromise]);
    console.log("[DataFetch] Completed data fetch for all pairs.");

  } catch (err) {
    console.error("[DataFetch] Error:", err);
  } finally {
    isFetchingData = false;
  }
}

async function runBackgroundScan() {
  if (isScanning) return;
  isScanning = true;
  scanIteration++;
  
  try {
    await fetchNews();
    const newSignals: Signal[] = [];
    const newLogs: string[] = [];
    const htf = getHTFIntervals(activeTimeframe);
    
    console.log(`[Scanner] Running analysis over cached data (Iteration ${scanIteration})...`);
    
    for (const [pair, data] of Object.entries(globalMarketData)) {
       try {
           const { signal, logs } = analyzeMarketStructure(
               data.candlesLTF, 
               data.candlesStruct, 
               data.candlesTrend, 
               htf.struct, 
               htf.trend, 
               data.displayPair, 
               data.type
           );
           newLogs.push(...logs);
           if (signal) newSignals.push(signal);
       } catch (err: any) {
           newLogs.push(`[${data.displayPair}] Analysis Error: ${err.message}`);
       }
    }
    
    cachedSignals = newSignals;
    cachedAllLogs = newLogs;
    totalScannedCache = Object.keys(globalMarketData).length;
    lastScanTime = Date.now();
    
    console.log(`[Scanner] Background scan completed. Active signals: ${cachedSignals.length}.`);
    await sendBatchedWebPushAlerts(newSignals);
  } catch (err) {
    console.error("[Scanner] Background scan failed:", err);
  } finally {
    isScanning = false;
  }
}
"""

start_str = "async function runBackgroundScan() {"
end_str = "// API Route triggers scan on request"

idx_start = content.find(start_str)
idx_end = content.find(end_str)

if idx_start != -1 and idx_end != -1:
    new_content = content[:idx_start] + new_architecture + content[idx_end:]
    
    # Also replace intervals in startServer
    old_interval = """    runBackgroundScan(); // Initial run
    setInterval(() => {
      if (!isScanning) runBackgroundScan();
    }, 120000); // Trigger every 2m"""
    
    new_interval = """    // DECOUPLED ARCHITECTURE: 
    // 1. Data Fetcher Loop (every 30 seconds for all pairs)
    runDataFetchLoop();
    setInterval(() => {
      runDataFetchLoop();
    }, 30000);
    
    // 2. Scan / Analysis Loop (every 2m + random 30s)
    setTimeout(() => {
        runBackgroundScan();
        setInterval(() => {
           runBackgroundScan();
        }, 120000 + Math.random() * 30000); 
    }, 5000); // initial offset"""
    
    new_content = new_content.replace(old_interval, new_interval)
    
    with open("server.ts", "w") as f:
        f.write(new_content)
    print("Decoupled architecture updated successfully!")
else:
    print("Could not find blocks to replace.")

