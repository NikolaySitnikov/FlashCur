# Product Spec

## 1. Dashboard
- **Markets table**: Symbol, price, 24h vol, funding, OI (if available), % change, last spike time.
- **First‑Look panel**: Top 3 spikes / extremes across all markets.
- **Speed tiers**: Free = slower auto‑refresh; Pro/Elite = faster (client‑side throttle + server alert priority).
- **Acceptance**: p95 refresh under 3s on broadband; empty‑state + degraded mode if WS fails.

## 2. Alerts
- **Signals**: 
  - Volume spike vs rolling baseline (5m/15m/1h) at 2×/3×/5×.
  - Funding extremes (|funding| ≥ configurable threshold).
  - OI divergence (price down + OI up, or vice‑versa) where supported.
- **Channels**: Email (Pro/Elite), Telegram (Elite), optional SMS (Elite, metered).
- **Credits**: Pro 1,000/mo; Elite 5,000/mo; top‑ups $10 per bundle.
- **Acceptance**: p95 alert latency ≤ 30s; duplicate suppression within 5m window; per‑user rate‑limits.

## 3. Watchlist & Export
- Per‑user favorites and filters.
- One‑click **TradingView watchlist export** (clipboard + .txt download).
- Acceptance: 100% symbols compatible with TV’s format or provide fallbacks.

## 4. Account & Billing
- Signup/login via email + password (or OAuth later).
- Stripe subscriptions; dunning with 3‑step retries; pause subscription 1–3 months.
- Acceptance: PCI handled by Stripe; GDPR-compliant deletion.

## 5. Backtests (v0.1)
- 7–30 day rolling historical snapshots per signal type.
- Outcome stats: hit‑rate, median move after X minutes, drawdown.
- Acceptance: **honest, conservative** stats; do not imply returns.

## Non‑Functional
- **Reliability**: publish SLOs; graceful degradation when WS hiccups.
- **Privacy**: store minimal PII (email, billing IDs).
- **Security**: user isolation; signed Telegram links; rate limits everywhere.
