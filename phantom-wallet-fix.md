# Phantom Wallet Mobile/Desktop Sign-In – Critical Issues and Fix Plan

## Desktop Problems

- "Cannot read properties of undefined (reading emit)"
  - Adapter `readyState` not checked before `connect()` on desktop
  - Race condition while adapter is still initializing after `select(Phantom)`
  - Stale adapter reference immediately after wallet selection

## Mobile Problems

- WalletConnect modal interference (overrides Phantom native deep-link)
- In-app browser issue (missing proper redirect configuration)
- Failed deep linking (not using Phantom Universal Links correctly)

## Key Solutions Implemented

1) Conditional adapter loading
- Mobile: load Phantom only (no WalletConnect to avoid interference)
- Desktop: load both; prioritize Phantom

2) Proper state management
- Check `WalletReadyState.Installed` before `connect()` on desktop
- Debounce connect to avoid double-click issues
- Wait for `publicKey` to be available before proceeding

3) Mobile deep linking
- Direct deep-link format: `https://phantom.app/ul/browse/${encodedUrl}?ref=${encodedUrl}`
- No WalletConnect modal on mobile
- Proper return URL configuration via `NEXT_PUBLIC_PUBLIC_URL`

4) Enhanced error handling
- Clear error for missing extension on desktop
- Retry logic for failed connects (mobile deep-link timing)
- Safe fallbacks when deep-link fails

## Implementation Steps

- Update `src/components/solana-providers.tsx` to conditionally load adapters
- Enhance `src/hooks/use-solana-auth.ts` with readiness checks and deep-link timing
- Improve `src/components/phantom-signin-section.tsx` UX and error messaging
- Ensure env: `NEXT_PUBLIC_PUBLIC_URL=https://volspike.com` (or prod host)

## Quick Test Checklist

- Desktop: Single click → Phantom extension → sign → redirected to dashboard
- Mobile: Tap → opens Phantom app → approve → returns to Safari/Chrome signed in

This approach removes the desktop double-click, prevents WalletConnect from hijacking the mobile flow, and ensures proper deep-link/return behavior.
