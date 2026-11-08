const https = require('https');

async function fetchBinanceKlines(symbol, interval, limit = 1000, endTime = null) {
    let url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
    if (endTime) url += `&endTime=${endTime}`;

    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (Array.isArray(parsed)) resolve(parsed);
                    else reject(parsed);
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

async function fetchHistorical(symbol, interval, days) {
    const candles = [];
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
    console.log("Fetching 1 year of 4h...");
    const h4 = await fetchHistorical('BTCUSDT', '4h', 365);
    console.log("Fetching 60 days of 15m...");
    const m15 = await fetchHistorical('BTCUSDT', '15m', 60);
    console.log("Done fetching!");
}
run();
