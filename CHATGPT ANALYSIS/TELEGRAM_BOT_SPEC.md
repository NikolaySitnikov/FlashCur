# Telegram Bot Spec

## Commands
- `/link` — Start OAuth‑like flow to link account (signed token).
- `/me` — Show plan, credits, recent signals.
- `/alerts_on` `/alerts_off` — Toggle.
- `/help` — Commands + support link.

## Messages
- Real‑time signal: symbol, signal type, strength, time, quick links.
- Hourly recap in free channel: top 5 spikes + CTA.

## Auth
- Deep‑link with signed token: `t.me/volspike_bot?start=JWT` mapping user↔chat.

## Rate Limits
- Per‑user per‑minute cap; channel burst control; retry with backoff.
