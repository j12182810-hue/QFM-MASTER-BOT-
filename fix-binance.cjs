const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const fetchHelper = `
async function fetchCryptoKlines(pair, interval, limit) {
  try {
    const url = \`https://api.binance.us/api/v3/klines?symbol=\${pair}&interval=\${interval}&limit=\${limit}\`;
    const res = await axiosInstance.get(url, { timeout: 10000 });
    return res.data;
  } catch (err) {
    // Fallback to MEXC
    let mexcInterval = interval;
    if (interval === '1h') mexcInterval = '60m';
    if (interval === '1w') mexcInterval = '1W';
    if (interval === '1M') mexcInterval = '1M';
    const url = \`https://api.mexc.com/api/v3/klines?symbol=\${pair}&interval=\${mexcInterval}&limit=\${limit}\`;
    const res = await axiosInstance.get(url, { timeout: 10000 });
    return res.data;
  }
}
`;

if (!code.includes('async function fetchCryptoKlines')) {
    code = code.replace('async function runBackgroundScan() {', fetchHelper + '\nasync function runBackgroundScan() {');
}

const target = `
          const [resLTF, resStruct, resTrend] = await Promise.all([
            axiosInstance.get(\`https://api.binance.com/api/v3/klines?symbol=\${pair}&interval=\${activeTimeframe}&limit=1000\`),
            axiosInstance.get(\`https://api.binance.com/api/v3/klines?symbol=\${pair}&interval=\${htf.struct}&limit=500\`),
            axiosInstance.get(\`https://api.binance.com/api/v3/klines?symbol=\${pair}&interval=\${htf.trend}&limit=200\`)
          ]);
`;

const replacement = `
          const [dataLTF, dataStruct, dataTrend] = await Promise.all([
            fetchCryptoKlines(pair, activeTimeframe, 1000),
            fetchCryptoKlines(pair, htf.struct, 500),
            fetchCryptoKlines(pair, htf.trend, 200)
          ]);
`;

code = code.replace(target, replacement);

code = code.replace('const candles = resLTF.data.map(mapCandle);', 'const candles = dataLTF.map(mapCandle);');
code = code.replace('const candlesStruct = resStruct.data.map(mapCandle);', 'const candlesStruct = dataStruct.map(mapCandle);');
code = code.replace('const candlesTrend = resTrend.data.map(mapCandle);', 'const candlesTrend = dataTrend.map(mapCandle);');

fs.writeFileSync('server.ts', code);
console.log('Fixed server.ts');
