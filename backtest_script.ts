import fetch from 'node-fetch';

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

async function fetchBinanceKlines(symbol: string, interval: string, limit = 1000, endTime: number | null = null): Promise<any[]> {
    let url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
    if (endTime) url += `&endTime=${endTime}`;

    const res = await fetch(url);
    const data = await res.json();
    return Array.isArray(data) ? data : [];
}

async function fetchHistorical(symbol: string, interval: string, days: number): Promise<Candle[]> {
    const candles: Candle[] = [];
    const msPerCandle = interval === '15m' ? 15 * 60 * 1000 : interval === '4h' ? 4 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    const totalCandles = Math.ceil(days * 24 * 60 * 60 * 1000 / msPerCandle);
    let endTime = Date.now();
    let fetched = 0;

    while (fetched < totalCandles) {
        const limit = Math.min(1000, totalCandles - fetched);
        try {
            const data = await fetchBinanceKlines(symbol, interval, limit, endTime);
            if (!data || data.length === 0) break;
            
            const formatted = data.map(d => ({
                time: d[0],
                open: parseFloat(d[1]),
                high: parseFloat(d[2]),
                low: parseFloat(d[3]),
                close: parseFloat(d[4]),
                volume: parseFloat(d[5])
            }));
            
            candles.unshift(...formatted);
            fetched += formatted.length;
            endTime = formatted[0].time - 1;
            console.log(`Fetched ${fetched}/${totalCandles} ${interval} candles...`);
            await new Promise(r => setTimeout(r, 100)); // rate limit protection
        } catch (err) {
            console.error(err);
            break;
        }
    }
    return candles;
}

async function run() {
    console.log("Fetching 3 years of 1d...");
    const d1 = await fetchHistorical('BTCUSDT', '1d', 1095);
    console.log("Fetching 3 years of 4h...");
    const h4 = await fetchHistorical('BTCUSDT', '4h', 1095);
    console.log("Fetching 3 years of 15m...");
    const m15 = await fetchHistorical('BTCUSDT', '15m', 1095);
    
    // Output data length to check
    console.log(`D1: ${d1.length}, H4: ${h4.length}, M15: ${m15.length}`);
}

run();
