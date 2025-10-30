# Alert Engine — Server Worker Spec

## Purpose
Confirm client‑observed events, compute signals, and deliver alerts while enforcing rate‑limits and credits.

## Data Inputs
- Exchange REST snapshots (fallback) and/or lightweight WS taps (aggregated server‑side if needed).
- Rolling baselines per symbol (5m/15m/1h).

## Pipeline
1. **Ingest** current candle ticks/snapshots.
2. **Compute** indicators (rolling volume mean/σ, funding thresholds, OI deltas where available).
3. **Detect** events (e.g., vol ≥ 3× baseline; |funding| ≥ 0.03%).
4. **Debounce & Dedupe** per symbol/signal (e.g., 5m cool‑down).
5. **Enqueue deliveries** (email/Telegram/SMS) respecting user tier, per‑minute and per‑day limits.
6. **Charge credits** and record delivery outcomes.

## Delivery
- **Email**: SendGrid API.
- **Telegram**: Bot API (chat or channel). Signed token to link user to chat.
- **SMS**: Twilio (Elite only, metered).

## Limits & Costs
- Per‑user/day & per minute limits.
- Account‑level burst caps to protect monthly budget.
- Alert “digest” fallback if the user is over quota.

## Storage
- `signals`: id, symbol, type, strength, detected_at, cooldown_until.
- `subscriptions`: user_id, tier, credits_remaining, channel_prefs.
- `deliveries`: signal_id, user_id, channel, status, cost.
- `budgets`: monthly cap, used, reset_at.

## Monitoring
- Metrics: detection rate, delivery latency p50/p95, failure codes, cost/use.
- Alert on delivery p95 > 60s or error_rate > 2% in 5m.
