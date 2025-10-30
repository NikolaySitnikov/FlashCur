# Tech Architecture

## Components
- **Web App (Next/React)**: UI, client WS to exchanges (where allowed), auth, settings.
- **Auth/Billing API (Hono/Node)**: Auth, Stripe webhooks, per‑user config & credits.
- **Alert Worker**: Headless process/cron for signal computation/delivery.
- **Integrations**: Stripe, SendGrid, Telegram, Twilio.
- **DB**: Postgres (Prisma). KV cache for rolling baselines if desired.

## Data Flow
- Client connects to exchange WS for live UI; server worker confirms signals from snapshots/WS and sends alerts.
- Stripe → webhook → update subscription/credits; expose `/me` for UI.
- Telegram bot uses signed deep‑link to map user ↔ chat.

## Key Decisions
- **Keep infra lean**; paywall **server‑confirmed alerts** (not raw data).
- **Multi‑exchange abstraction**: driver interface per venue (Binance/Bybit/OKX).
- **Resilience**: degraded mode (last good snapshot), exponential backoff on WS.
