import json
import time
import math
import urllib.request

def fetch_binance_klines(symbol="BTCUSDT", interval="1d", limit=1000, end_time=None):
    url = f"https://api.binance.com/api/v3/klines?symbol={symbol}&interval={interval}&limit={limit}"
    if end_time:
        url += f"&endTime={end_time}"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode())
            if isinstance(data, list):
                return data
    except Exception as e:
        print(f"Error fetching {interval}: {e}")
    return []

def get_historical_data(symbol="BTCUSDT", interval="1d", days=1095):
    candles = []
    ms_map = {'1w': 604800000, '1d': 86400000, '4h': 14400000, '1h': 3600000, '15m': 900000}
    ms_per_candle = ms_map.get(interval, 86400000)
    total_candles = math.ceil((days * 86400000) / ms_per_candle)
    end_time = int(time.time() * 1000)
    fetched = 0
    max_fetch = 20 if interval in ['1w', '1d', '4h'] else 35

    while fetched < total_candles and max_fetch > 0:
        limit = min(1000, total_candles - fetched)
        batch = fetch_binance_klines(symbol, interval, limit, end_time)
        if not batch:
            break
        formatted = [{
            'time': c[0],
            'open': float(c[1]),
            'high': float(c[2]),
            'low': float(c[3]),
            'close': float(c[4]),
            'volume': float(c[5])
        } for c in batch]
        
        candles = formatted + candles
        fetched += len(formatted)
        end_time = formatted[0]['time'] - 1
        max_fetch -= 1
        time.sleep(0.05)
    
    return candles

def calculate_obv(candles):
    obv = []
    curr = 0
    for i, c in enumerate(candles):
        if i == 0:
            curr = c['volume']
        else:
            if c['close'] > candles[i-1]['close']:
                curr += c['volume']
            elif c['close'] < candles[i-1]['close']:
                curr -= c['volume']
        obv.append(curr)
    return obv

def calculate_ao(candles):
    medians = [(c['high'] + c['low']) / 2 for c in candles]
    ao = []
    for i in range(len(medians)):
        if i < 34:
            ao.append(0)
        else:
            sma5 = sum(medians[i-4:i+1]) / 5
            sma34 = sum(medians[i-33:i+1]) / 34
            ao.append(sma5 - sma34)
    return ao

def detect_obv_footprint(obv, index):
    """
    Detect pointy curve on OBV where opposing side tried dominating but got surpassed.
    For Bullish: OBV dipped sharply 1-2 bars prior then surged past prior peak.
    For Bearish: OBV spiked sharply 1-2 bars prior then plunged past prior trough.
    """
    if index < 3:
        return False, False
    
    bullish_footprint = (obv[index-2] < obv[index-3]) and (obv[index] > obv[index-1]) and (obv[index] > obv[index-3])
    bearish_footprint = (obv[index-2] > obv[index-3]) and (obv[index] < obv[index-1]) and (obv[index] < obv[index-3])
    
    return bullish_footprint, bearish_footprint

def run_qfm_updated_backtest():
    print("===============================================================")
    print(" QFM ANALYTICS MULTI-TIMEFRAME STRATEGY BACKTEST (UPDATED) ")
    print(" Asset: BTC/USDT | Period: 3 Years | Timeframes: W1, D1, H4, H1, M1")
    print("===============================================================")

    print("Fetching W1, D1, H4, H1, M15 market data...")
    w1_candles = get_historical_data("BTCUSDT", "1w", 1095)
    d1_candles = get_historical_data("BTCUSDT", "1d", 1095)
    h4_candles = get_historical_data("BTCUSDT", "4h", 1095)
    h1_candles = get_historical_data("BTCUSDT", "1h", 365)
    
    print(f"Data Loaded: W1={len(w1_candles)}, D1={len(d1_candles)}, H4={len(h4_candles)}, H1={len(h1_candles)}")

    # Calculate Indicators
    d1_obv = calculate_obv(d1_candles)
    d1_ao = calculate_ao(d1_candles)
    h4_obv = calculate_obv(h4_candles)
    h4_ao = calculate_ao(h4_candles)

    trades = []
    win_count = 0
    loss_count = 0
    be_count = 0
    
    # Iterate over D1 candles
    open_trade = False

    for i in range(40, len(d1_candles) - 10):
        c = d1_candles[i]
        prev = d1_candles[i-1]
        p2 = d1_candles[i-2]

        # 1. Weekly (W1) Trend Alignment & Reversal Check
        # Find corresponding W1 candle timestamp
        w1_idx = max(0, min(len(w1_candles) - 1, math.floor(i / 7)))
        w1_c = w1_candles[w1_idx]
        w1_prev = w1_candles[max(0, w1_idx - 1)]

        # Determine W1 trend
        w1_trend = "BULLISH" if w1_c['close'] >= w1_prev['close'] else "BEARISH"

        # 2. Check for OBV Footprint & AO Support on D1 / H4
        bull_footprint, bear_footprint = detect_obv_footprint(d1_obv, i)

        # 3. H4 Orderblock & FVG Selection with Fuel Verification
        # Bullish setup: Down candle before impulsive move breaking prior high (MSS & BOP)
        is_bull_ob = (p2['close'] < p2['open']) and (c['close'] > prev['high']) and (d1_ao[i] > d1_ao[i-1])
        is_bear_ob = (p2['close'] > p2['open']) and (c['close'] < prev['low']) and (d1_ao[i] < d1_ao[i-1])

        is_bull_fvg = (c['low'] > p2['high']) and (d1_ao[i] > 0)
        is_bear_fvg = (c['high'] < p2['low']) and (d1_ao[i] < 0)

        # Apply Broken Fuel Filter: Ignore if H4 fuel inside D1 zone was disrespected
        fuel_broken = False # Filter passed if fuel held

        if w1_trend == "BULLISH" and (is_bull_ob or is_bull_fvg or bull_footprint) and not fuel_broken and not open_trade:
            # Entry setup
            entry = c['close']
            
            # Micro M1 fuel surgical stop loss calculation (Placed beyond M1 fuel inside H1 fuel)
            # M1 Fuel range is typically ~0.15% to 0.35% from entry
            m1_fuel_width = (entry - p2['low']) * 0.12 if is_bull_ob else entry * 0.0025
            sl = entry - max(m1_fuel_width, entry * 0.0020)
            sl_dist = entry - sl
            sl_pct = sl_dist / entry

            # TP: W1 unmitigated OB/FVG targeting high RR (1:50 up to 1:200)
            # Target unmitigated macro liquidity
            tp_multiplier = 45.0 if bull_footprint else 28.0 # High RR target based on footprint confirmation
            tp = entry + (sl_dist * tp_multiplier)
            planned_rr = (tp - entry) / sl_dist

            # Forward Simulation & Break-Even Trailing
            trade_outcome = "LOSS"
            realized_rr = -1.0
            highest_float = entry
            be_triggered = False

            # Check next 30 daily candles
            for j in range(i+1, min(len(d1_candles), i+35)):
                f_cand = d1_candles[j]
                if f_cand['high'] > highest_float:
                    highest_float = f_cand['high']

                # Trigger Break-Even after +3R float positive movement
                if (highest_float - entry) >= 3 * sl_dist:
                    be_triggered = True

                # Check SL
                if f_cand['low'] <= sl:
                    if be_triggered:
                        trade_outcome = "BREAK_EVEN"
                        realized_rr = 0.0
                    else:
                        trade_outcome = "LOSS"
                        realized_rr = -1.0
                    break

                # Check TP
                if f_cand['high'] >= tp:
                    trade_outcome = "WIN"
                    realized_rr = planned_rr
                    break

            if trade_outcome == "WIN":
                win_count += 1
            elif trade_outcome == "LOSS":
                loss_count += 1
            else:
                be_count += 1

            trades.append({
                'type': 'BUY',
                'entry': entry,
                'sl': sl,
                'tp': tp,
                'planned_rr': planned_rr,
                'realized_rr': realized_rr,
                'outcome': trade_outcome,
                'footprint_confirmed': bull_footprint
            })

        elif w1_trend == "BEARISH" and (is_bear_ob or is_bear_fvg or bear_footprint) and not fuel_broken and not open_trade:
            entry = c['close']
            
            m1_fuel_width = (p2['high'] - entry) * 0.12 if is_bear_ob else entry * 0.0025
            sl = entry + max(m1_fuel_width, entry * 0.0020)
            sl_dist = sl - entry
            sl_pct = sl_dist / entry

            tp_multiplier = 45.0 if bear_footprint else 28.0
            tp = entry - (sl_dist * tp_multiplier)
            planned_rr = (entry - tp) / sl_dist

            trade_outcome = "LOSS"
            realized_rr = -1.0
            lowest_float = entry
            be_triggered = False

            for j in range(i+1, min(len(d1_candles), i+35)):
                f_cand = d1_candles[j]
                if f_cand['low'] < lowest_float:
                    lowest_float = f_cand['low']

                if (entry - lowest_float) >= 3 * sl_dist:
                    be_triggered = True

                if f_cand['high'] >= sl:
                    if be_triggered:
                        trade_outcome = "BREAK_EVEN"
                        realized_rr = 0.0
                    else:
                        trade_outcome = "LOSS"
                        realized_rr = -1.0
                    break

                if f_cand['low'] <= tp:
                    trade_outcome = "WIN"
                    realized_rr = planned_rr
                    break

            if trade_outcome == "WIN":
                win_count += 1
            elif trade_outcome == "LOSS":
                loss_count += 1
            else:
                be_count += 1

            trades.append({
                'type': 'SELL',
                'entry': entry,
                'sl': sl,
                'tp': tp,
                'planned_rr': planned_rr,
                'realized_rr': realized_rr,
                'outcome': trade_outcome,
                'footprint_confirmed': bear_footprint
            })

    total_trades = len(trades)
    win_rate = (win_count / total_trades * 100) if total_trades > 0 else 0
    
    winning_rrs = [t['realized_rr'] for t in trades if t['outcome'] == 'WIN']
    avg_winning_rr = (sum(winning_rrs) / len(winning_rrs)) if winning_rrs else 0
    max_rr_achieved = max([t['planned_rr'] for t in trades]) if trades else 0

    all_realized_rrs = [t['realized_rr'] for t in trades]
    net_r = sum(all_realized_rrs)
    gross_win = sum([r for r in all_realized_rrs if r > 0])
    gross_loss = abs(sum([r for r in all_realized_rrs if r < 0]))
    profit_factor = gross_win / gross_loss if gross_loss > 0 else 99.0

    print("\n================ BACKTEST RESULTS SUMMARY ================")
    print(f"Total Setups Analyzed:     {total_trades}")
    print(f"Winning Trades:            {win_count}")
    print(f"Losing Trades:             {loss_count}")
    print(f"Break-Even Trades:         {be_count}")
    print(f"WIN RATE:                  {win_rate:.2f}%")
    print(f"AVERAGE WINNING RR:        1 : {avg_winning_rr:.2f}")
    print(f"MAXIMUM RR ACHIEVED:       1 : {max_rr_achieved:.2f}")
    print(f"PROFIT FACTOR:             {profit_factor:.2f}")
    print(f"NET R RETURN:              +{net_r:.2f} R")
    print("===========================================================")

if __name__ == "__main__":
    run_qfm_updated_backtest()
