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
    ms_map = {'1w': 604800000, '1d': 86400000, '4h': 14400000, '1h': 3600000, '15m': 900000, '1m': 60000}
    ms_per_candle = ms_map.get(interval, 86400000)
    total_candles = math.ceil((days * 86400000) / ms_per_candle)
    end_time = int(time.time() * 1000)
    fetched = 0
    max_fetch = 20 if interval in ['1w', '1d', '4h'] else 40

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
    if index < 3:
        return False, False
    bullish_footprint = (obv[index-2] < obv[index-3]) and (obv[index] > obv[index-1]) and (obv[index] > obv[index-3])
    bearish_footprint = (obv[index-2] > obv[index-3]) and (obv[index] < obv[index-1]) and (obv[index] < obv[index-3])
    return bullish_footprint, bearish_footprint

def is_qualified_fvg(candles, i, direction="BULLISH"):
    """
    QFM Avantum FVG Rule:
    Middle candle (i-1) open should not be heavily inside recent candle's (i-2) body territory,
    and next candle (i) after this should not start heavily inside middle candle's body territory.
    """
    if i < 2:
        return False
    prev2 = candles[i-2]
    mid = candles[i-1]
    curr = candles[i]
    
    mid_body_size = abs(mid['close'] - mid['open'])
    prev2_body_size = abs(prev2['close'] - prev2['open'])
    
    if prev2_body_size == 0 or mid_body_size == 0:
        return False
        
    prev2_body_top = max(prev2['open'], prev2['close'])
    prev2_body_bot = min(prev2['open'], prev2['close'])
    
    mid_open_inside = max(0, min(mid['open'], prev2_body_top) - max(mid['open'], prev2_body_bot))
    if (mid_open_inside / prev2_body_size) > 0.40:
        return False

    mid_body_top = max(mid['open'], mid['close'])
    mid_body_bot = min(mid['open'], mid['close'])
    curr_open_inside = max(0, min(curr['open'], mid_body_top) - max(curr['open'], mid_body_bot))
    if (curr_open_inside / mid_body_size) > 0.40:
        return False

    if direction == "BULLISH":
        return curr['low'] > prev2['high']
    else:
        return curr['high'] < prev2['low']

def run_qfm_avantum_backtest():
    print("===============================================================")
    print("      QFM AVANTUM STRATEGY BACKTEST (3 YEARS BTC/USDT)         ")
    print(" Target RR: Up to 1:1000 | Ultra-Micro Fuel (S1/S5/M1/M5/H1/H4/D1/W1)")
    print("===============================================================")

    print("Fetching W1, D1, H4, H1 market data...")
    w1_candles = get_historical_data("BTCUSDT", "1w", 1095)
    d1_candles = get_historical_data("BTCUSDT", "1d", 1095)
    h4_candles = get_historical_data("BTCUSDT", "4h", 1095)
    h1_candles = get_historical_data("BTCUSDT", "1h", 365)
    
    print(f"Data Loaded: W1={len(w1_candles)}, D1={len(d1_candles)}, H4={len(h4_candles)}, H1={len(h1_candles)}")

    d1_obv = calculate_obv(d1_candles)
    d1_ao = calculate_ao(d1_candles)

    trades = []
    win_count = 0
    loss_count = 0
    be_count = 0

    open_trade = False

    for i in range(40, len(d1_candles) - 10):
        c = d1_candles[i]
        prev = d1_candles[i-1]
        p2 = d1_candles[i-2]

        w1_idx = max(0, min(len(w1_candles) - 1, math.floor(i / 7)))
        w1_c = w1_candles[w1_idx]
        w1_prev = w1_candles[max(0, w1_idx - 1)]

        w1_trend = "BULLISH" if w1_c['close'] >= w1_prev['close'] else "BEARISH"

        bull_footprint, bear_footprint = detect_obv_footprint(d1_obv, i)

        is_bull_ob = (p2['close'] < p2['open']) and (c['close'] > prev['high']) and (d1_ao[i] > d1_ao[i-1])
        is_bear_ob = (p2['close'] > p2['open']) and (c['close'] < prev['low']) and (d1_ao[i] < d1_ao[i-1])

        is_bull_fvg = is_qualified_fvg(d1_candles, i, "BULLISH") and (d1_ao[i] > 0)
        is_bear_fvg = is_qualified_fvg(d1_candles, i, "BEARISH") and (d1_ao[i] < 0)

        reversal_ob_present = True

        if w1_trend == "BULLISH" and (is_bull_ob or is_bull_fvg or bull_footprint) and reversal_ob_present and not open_trade:
            entry = c['close']
            
            # Avantum S1/S5 Ultra-Micro Fuel Stop Loss Sizing:
            # S1/S5 micro-fuel SL distance is ultra-tight (~0.08% to 0.12% of price)
            sl_pct = 0.0008 if bull_footprint else 0.0012
            sl_dist = entry * sl_pct
            sl = entry - sl_dist

            # Avantum Target: Targeting macro W1 unmitigated liquidity pool with ultra-high RR potential (up to 1:1000)
            target_rr_multiplier = 250.0 if bull_footprint else 120.0
            tp = entry + (sl_dist * target_rr_multiplier)
            planned_rr = target_rr_multiplier

            trade_outcome = "LOSS"
            realized_rr = -1.0
            highest_float = entry
            be_triggered = False

            for j in range(i+1, min(len(d1_candles), i+45)):
                f_cand = d1_candles[j]
                if f_cand['high'] > highest_float:
                    highest_float = f_cand['high']

                if (highest_float - entry) >= 5 * sl_dist:
                    be_triggered = True

                if f_cand['low'] <= sl:
                    if be_triggered:
                        trade_outcome = "BREAK_EVEN"
                        realized_rr = 0.0
                    else:
                        trade_outcome = "LOSS"
                        realized_rr = -1.0
                    break

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

        elif w1_trend == "BEARISH" and (is_bear_ob or is_bear_fvg or bear_footprint) and reversal_ob_present and not open_trade:
            entry = c['close']
            
            sl_pct = 0.0008 if bear_footprint else 0.0012
            sl_dist = entry * sl_pct
            sl = entry + sl_dist

            target_rr_multiplier = 250.0 if bear_footprint else 120.0
            tp = entry - (sl_dist * target_rr_multiplier)
            planned_rr = target_rr_multiplier

            trade_outcome = "LOSS"
            realized_rr = -1.0
            lowest_float = entry
            be_triggered = False

            for j in range(i+1, min(len(d1_candles), i+45)):
                f_cand = d1_candles[j]
                if f_cand['low'] < lowest_float:
                    lowest_float = f_cand['low']

                if (entry - lowest_float) >= 5 * sl_dist:
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
    max_rr_achieved = max([t['planned_rr'] for t in trades if t['outcome'] == 'WIN'] + [0])

    all_realized_rrs = [t['realized_rr'] for t in trades]
    net_r = sum(all_realized_rrs)
    gross_win = sum([r for r in all_realized_rrs if r > 0])
    gross_loss = abs(sum([r for r in all_realized_rrs if r < 0]))
    profit_factor = gross_win / gross_loss if gross_loss > 0 else 99.0

    report = {
        'total_trades': total_trades,
        'win_count': win_count,
        'loss_count': loss_count,
        'be_count': be_count,
        'win_rate': round(win_rate, 2),
        'avg_winning_rr': round(avg_winning_rr, 2),
        'max_rr_achieved': round(max_rr_achieved, 2),
        'net_r': round(net_r, 2),
        'profit_factor': round(profit_factor, 2)
    }

    with open('qfm_avantum_report.json', 'w') as f:
        json.dump(report, f, indent=2)

    print("\n================ QFM AVANTUM BACKTEST RESULTS ================")
    print(f"Total Setups Analyzed:     {total_trades}")
    print(f"Winning Trades:            {win_count}")
    print(f"Losing Trades:             {loss_count}")
    print(f"Break-Even Trades:         {be_count}")
    print(f"WIN RATE:                  {win_rate:.2f}%")
    print(f"AVERAGE WINNING RR:        1 : {avg_winning_rr:.2f}")
    print(f"MAXIMUM RR ACHIEVED:       1 : {max_rr_achieved:.2f}")
    print(f"PROFIT FACTOR:             {profit_factor:.2f}")
    print(f"NET R RETURN:              +{net_r:.2f} R")
    print("==============================================================")

if __name__ == "__main__":
    run_qfm_avantum_backtest()
