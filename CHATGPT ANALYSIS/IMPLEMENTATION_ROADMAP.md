# Implementation Roadmap (Issue‑sized tasks)

## Phase 0 — Foundations (Week 1)
- [ ] Stripe products & prices: Free/Pro/Elite + annual plans.
- [ ] User table + sessions + subscription status endpoint `/me`.
- [ ] Settings UI: channels, thresholds, credits visible.

## Phase 1 — Alert Worker (Weeks 2–3)
- [ ] Worker scaffold (Node/TS). ENV for APIs/keys.
- [ ] Exchange adapters: Binance (now), Bybit (next), OKX (later).
- [ ] Rolling baselines (5m/15m/1h) per symbol, in‑memory + periodic persist.
- [ ] Signals: vol 2×/3×/5×; funding extremes; OI divergence where available.
- [ ] Cooldowns/dedup + enqueue deliveries.
- [ ] Email delivery w/ SendGrid; per‑user rate limit; charge credits.
- [ ] Admin dashboard: signal count, p95 latency, error rate.

## Phase 2 — Telegram & First‑Look (Week 4)
- [ ] Telegram bot + user link flow.
- [ ] Elite stream channel + per‑user DMs.
- [ ] First‑Look panel in UI + deep link to symbol view.

## Phase 3 — Backtests v0.1 + Exports (Week 5)
- [ ] 7–30d store of OHLCV/funding snapshots.
- [ ] Backtest endpoints + simple charts in app.
- [ ] TradingView export button + file download.

## Phase 4 — Multi‑Exchange + Billing Polish (Week 6)
- [ ] Bybit driver + flags in UI.
- [ ] Dunning + pause; top‑ups for credits.
- [ ] Referral codes with bonus credits.

## Exit Criteria
- p95 alert latency ≤ 30s; error rate < 2%; NPS ≥ 40 from first 50 paid users.
