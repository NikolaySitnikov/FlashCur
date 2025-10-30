# Operations Runbook

## SLOs
- p95 alert latency ≤ 30s, error rate < 2% per 5m.

## On‑Call
- Pager on delivery error_rate spike or latency breach.
- First response ≤ 15m; public status update if >30m.

## Incidents
- Severity levels SEV1–3; templates for comms.
- Postmortem within 48h; action items assigned.

## Releases
- Feature flags; canary users; rollback script documented.

## Billing & Dunning
- 3‑step retries (1d/3d/7d), card‑update deep‑link, pause plan 1–3 months.

## Support
- Macros for common issues (no alerts, Telegram link, credits exceeded).
- SLA: business‑day response under 24h.
