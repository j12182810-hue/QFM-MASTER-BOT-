const http = require('http');
http.get('http://localhost:3000/api/backtest?pair=BTCUSDT&days=1095&strategy=qfm', res => {
  res.on('data', d => process.stdout.write(d.toString()));
});
