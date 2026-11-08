const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const replacement = `    let cryptoPromise = Promise.resolve();
    if (selectedAssets.includes('crypto')) {
      console.log("[Scanner] Fetching historical charts for Crypto...");
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
            const [resLTF, res1D] = await Promise.all([
              axiosInstance.get(\`https://api.binance.com/api/v3/klines?symbol=\${pair}&interval=\${activeTimeframe}&limit=1000\`),
              axiosInstance.get(\`https://api.binance.com/api/v3/klines?symbol=\${pair}&interval=1d&limit=100\`)
            ]);
            const mapCandle = (d) => ({
              time: d[0], open: parseFloat(d[1]), high: parseFloat(d[2]), low: parseFloat(d[3]),
              close: parseFloat(d[4]), volume: parseFloat(d[5]), takerBuyBaseVolume: parseFloat(d[9]),
            });
            const candles = resLTF.data.map(mapCandle);
            const candles1d = res1D.data.map(mapCandle);
            let displayPair = pair.replace("USDT", "USD");
            const { signal, logs } = analyzeMarketStructure(candles, candles1d, displayPair, "Crypto");
            newLogs.push(...logs);
            if (signal) newSignals.push(signal);
          } catch (err) {
            console.error(\`Failed to fetch crypto \${pair}:\`, err.message || String(err));
          } finally {
            activeCrypto--;
            setTimeout(next, 100);
          }
        };
        next(); next(); next();
      });
    }`;

content = content.replace(/let cryptoPromise = Promise\.resolve\(\);[\s\S]*?cryptoPromise = fetchCrypto\(\);/, replacement);

fs.writeFileSync('server.ts', content);
console.log('Fixed crypto Promise.');
