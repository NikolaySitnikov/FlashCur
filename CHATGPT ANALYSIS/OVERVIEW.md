# VolSpike — Overview

**What**: Real‑time crypto monitoring & alerts focused on **volume spikes**, **funding‑rate extremes**, and **OI/price divergences** across major perpetual futures markets. Users get **high‑signal notifications** via email / Telegram / (optionally SMS) and a workflow that exports clean watchlists to TradingView.

**Why now**: Volatility hunting is still noisy and manual. Binance/Bybit/OKX streams are open, but the value is **signal quality + delivery + workflow**. We keep infra lean (client WS where possible) and pay‑wall the **server‑confirmed alert engine** and **multi‑channel delivery**.

## Customers (ICPs)
- **Active retail traders** who want anomaly pings + quick setups.
- **Small prop groups / alpha chats** that share actionable screens.
- **Quant‑curious devs** who want a simple signals API later.

## Core Value
- **Be first to the move**: Debounced, server‑confirmed spikes reduce false alerts.
- **Act fast**: “First‑look” panel shows top 3 current opportunities.
- **Slot‑in workflow**: One‑click TradingView exports + Telegram streams.

## Plans & Pricing
- **Free**: Live dashboard (rate‑limited), no server alerts.
- **Pro — $29/mo**: Email alerts + alert credits + fast UI refresh.
- **Elite — $99/mo**: Email + Telegram + optional SMS credits, priority queues.
- **Annual**: 2 months free. Credit top‑ups available.

## Defensibility
- **Signal quality** (curated rules + backtests) and **delivery reliability** (queueing, debouncing, rate‑limits).
- **Community moat** via Telegram streams, referrals, and KOL affiliates.
- **Workflow integration** (TV export, later: API & Teams).

## Roadmap Summary
1) Ship server alert worker + Pro beta → 2) Telegram & multi‑exchange → 3) Backtests & API → 4) Teams & enterprise controls.
