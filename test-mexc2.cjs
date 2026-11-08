const axios = require('axios');
(async () => {
  try {
    const res = await axios.get(`https://api.mexc.com/api/v3/klines?symbol=ETHUSDT&interval=1W&limit=1`);
    console.log(`MEXC 1W: OK`);
  } catch(e) {
    console.log(`MEXC 1W: FAILED`);
  }
})();
