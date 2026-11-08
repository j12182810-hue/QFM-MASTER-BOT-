const axios = require('axios');
const intervals = ['1m', '5m', '15m', '30m', '60m', '1h', '4h', '1d', '1w', '1M'];
(async () => {
  for (const interval of intervals) {
    try {
      const res = await axios.get(`https://api.mexc.com/api/v3/klines?symbol=ETHUSDT&interval=${interval}&limit=1`);
      console.log(`MEXC ${interval}: OK`);
    } catch(e) {
      console.log(`MEXC ${interval}: FAILED`);
    }
  }
})();
