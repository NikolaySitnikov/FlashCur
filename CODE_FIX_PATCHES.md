# VolSpike - Code Fix Patches

## 🔧 PATCH #1: Enable Password Authentication (Backend)

**File**: `volspike-nodejs-backend/src/routes/auth.ts`

### Location 1: Sign In Route (Lines 108-125)

**FIND THIS CODE:**
```typescript
        // Verify password (in production, compare with hashed password)
        // For now, we'll skip password verification as it's not implemented
        // const isValidPassword = await verifyPassword(password, user.passwordHash)
        // if (!isValidPassword) {
        //     return c.json({ error: 'Invalid credentials' }, 401)
        // }

        const token = await generateToken(user.id)

        logger.info(`User ${user.email} signed in`)

        return c.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                tier: user.tier,
                emailVerified: user.emailVerified,
                refreshInterval: user.refreshInterval,
                theme: user.theme,
                role: user.role,
                status: user.status,
                twoFactorEnabled: user.twoFactorEnabled,
            },
        })
```

**REPLACE WITH:**
```typescript
        // Verify password
        if (!user.passwordHash) {
            logger.error(`User ${email} has no password hash - may be OAuth-only user`)
            return c.json({ 
                error: 'Please use OAuth login (Google) for this account',
                oauthOnly: true 
            }, 401)
        }

        const isValidPassword = await verifyPassword(password, user.passwordHash)
        if (!isValidPassword) {
            logger.warn(`Invalid password attempt for ${email}`)
            return c.json({ error: 'Invalid email or password' }, 401)
        }

        const token = await generateToken(user.id)

        logger.info(`User ${user.email} signed in successfully`)

        return c.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                tier: user.tier,
                emailVerified: user.emailVerified,
                refreshInterval: user.refreshInterval,
                theme: user.theme,
                role: user.role,
                status: user.status,
                twoFactorEnabled: user.twoFactorEnabled,
            },
        })
```

---

### Location 2: Sign Up Route (Lines 155-165)

**FIND THIS CODE:**
```typescript
        // Create new user
        const user = await prisma.user.create({
            data: {
                email,
                tier,
                // passwordHash, // Uncomment when implementing password storage
            },
        })
```

**REPLACE WITH:**
```typescript
        // Create new user with hashed password
        const user = await prisma.user.create({
            data: {
                email,
                tier,
                passwordHash,
                emailVerified: null, // Will be set after email verification
            },
        })
```

---

## 🔧 PATCH #2: Fix Build Error - getMarketData Function

**File**: `volspike-nodejs-backend/src/services/binance-client.ts`

### Option A: Update Function Signature (Recommended)

**FIND THIS CODE:**
```typescript
export async function getMarketData(): Promise<MarketData[]> {
    // ... existing implementation
}
```

**REPLACE WITH:**
```typescript
export async function getMarketData(symbol?: string): Promise<MarketData[] | MarketData | null> {
    if (symbol) {
        // Fetch single symbol data
        try {
            const response = await axios.get(
                `https://fapi.binance.com/fapi/v1/ticker/24hr?symbol=${symbol}`,
                { timeout: 10000 }
            )
            
            if (!response.data) {
                logger.warn(`No data returned for symbol ${symbol}`)
                return null
            }
            
            return {
                symbol: response.data.symbol,
                lastPrice: parseFloat(response.data.lastPrice),
                priceChange: parseFloat(response.data.priceChange),
                priceChangePercent: parseFloat(response.data.priceChangePercent),
                volume24h: parseFloat(response.data.volume),
                quoteVolume: parseFloat(response.data.quoteVolume),
                openInterest: parseFloat(response.data.openInterest || '0'),
                fundingRate: parseFloat(response.data.lastFundingRate || '0'),
                timestamp: Date.now(),
            }
        } catch (error) {
            logger.error(`Error fetching data for ${symbol}:`, error)
            return null
        }
    }
    
    // Fetch all symbols data (existing implementation)
    try {
        const response = await axios.get(
            'https://fapi.binance.com/fapi/v1/ticker/24hr',
            { timeout: 15000 }
        )
        
        if (!response.data || !Array.isArray(response.data)) {
            logger.error('Invalid response from Binance API')
            return []
        }
        
        // Filter and transform data
        const marketData = response.data
            .filter((ticker: any) => {
                // Only USDT perpetual futures
                return ticker.symbol.endsWith('USDT') && 
                       parseFloat(ticker.quoteVolume) > 100_000_000 // >$100M volume
            })
            .map((ticker: any) => ({
                symbol: ticker.symbol,
                lastPrice: parseFloat(ticker.lastPrice),
                priceChange: parseFloat(ticker.priceChange),
                priceChangePercent: parseFloat(ticker.priceChangePercent),
                volume24h: parseFloat(ticker.volume),
                quoteVolume: parseFloat(ticker.quoteVolume),
                openInterest: parseFloat(ticker.openInterest || '0'),
                fundingRate: parseFloat(ticker.lastFundingRate || '0'),
                timestamp: Date.now(),
            }))
            .sort((a: any, b: any) => b.quoteVolume - a.quoteVolume) // Sort by volume descending
        
        logger.info(`Fetched ${marketData.length} market symbols from Binance API`)
        return marketData
    } catch (error) {
        logger.error('Error fetching market data:', error)
        return []
    }
}
```

---

## 🔧 PATCH #3: Fix Frontend Build Errors

**File**: `volspike-nextjs-frontend/src/app/dashboard/page.tsx`

### Location: Line 19 (Apostrophe)

**FIND THIS CODE:**
```typescript
<p className="text-gray-400">Welcome back! You're successfully logged in.</p>
```

**REPLACE WITH:**
```typescript
<p className="text-gray-400">Welcome back! You&apos;re successfully logged in.</p>
```

---

**File**: `volspike-nextjs-frontend/src/app/auth/page.tsx`

### Location: useEffect Hook (Around lines 30-40)

**FIND THIS CODE:**
```typescript
    useEffect(() => {
        const tabParam = searchParams.get('tab')
        if (tabParam === 'signin' || tabParam === 'signup') {
            setTab(tabParam)
        }
        // Force signin tab for admin mode
        if (isAdminMode) {
            setTab('signin')
        }
    }, [searchParams, isAdminMode])
```

**VERIFY IT INCLUDES ALL DEPENDENCIES** - This code is correct ✅

**IF YOU HAVE OTHER useEffect WARNINGS**, apply this pattern:
```typescript
useEffect(() => {
    // ... your code
}, [/* ADD ALL VARIABLES USED INSIDE */])
```

---

## 🔧 PATCH #4: Fix WebSocket Handler Build Errors

**File**: `volspike-nodejs-backend/src/websocket/handlers.ts`

### Location 1: Line 79 (subscribe-symbol handler)

**FIND THIS CODE:**
```typescript
                // Send current data for the symbol
                const symbolData = await getMarketData(symbol)
                if (symbolData) {
                    socket.emit('symbol-data', symbolData)
                }
```

**VERIFY YOUR binance-client.ts HAS THE UPDATED SIGNATURE** from Patch #2
Then this code will work correctly ✅

### Location 2: Line 121 (subscribe-watchlist handler)

**FIND THIS CODE:**
```typescript
                // Send current data for all symbols in watchlist
                for (const item of watchlist.items) {
                    const symbolData = await getMarketData(item.contract.symbol)
                    if (symbolData) {
                        socket.emit('symbol-data', symbolData)
                    }
                }
```

**VERIFY YOUR binance-client.ts HAS THE UPDATED SIGNATURE** from Patch #2
Then this code will work correctly ✅

---

## 📋 APPLICATION CHECKLIST

Apply patches in this order:

### Backend Patches (Do First)
- [ ] Apply PATCH #1 (Password Authentication)
- [ ] Apply PATCH #2 (getMarketData Function)
- [ ] Verify PATCH #4 locations work after PATCH #2
- [ ] Run: `cd volspike-nodejs-backend && npm run build`
- [ ] Fix any remaining TypeScript errors

### Database Update (After Backend Patches)
- [ ] Run: `cd volspike-nodejs-backend && npx prisma db push`
- [ ] Verify `passwordHash` column exists in User table
- [ ] Test with `npx prisma studio`

### Frontend Patches (Do Second)
- [ ] Replace `.env.local` with corrected version
- [ ] Apply PATCH #3 (Apostrophe fix)
- [ ] Run: `cd volspike-nextjs-frontend && npm run build`
- [ ] Fix any remaining build errors

### Testing (Do Last)
- [ ] Start backend: `cd volspike-nodejs-backend && npm run dev`
- [ ] Start frontend: `cd volspike-nextjs-frontend && npm run dev`
- [ ] Test signup with new user
- [ ] Test signin with valid credentials
- [ ] Test signin with invalid credentials
- [ ] Verify redirect to dashboard works
- [ ] Verify session persists after refresh

---

## 🚨 IMPORTANT NOTES

### Security Warning
After applying PATCH #1, **ALL EXISTING USERS NEED TO RE-REGISTER** because:
- Old user records don't have password hashes
- Password verification will fail for users created before this patch
- Users who signed up via OAuth are unaffected

### Migration Strategy
```sql
-- Option 1: Delete all non-OAuth users (recommended for development)
DELETE FROM "User" WHERE "walletAddress" IS NULL AND "passwordHash" IS NULL;

-- Option 2: Set a temporary password hash for existing users
-- (Users will need to use "forgot password" flow)
UPDATE "User" 
SET "passwordHash" = '$2a$12$YOUR_DEFAULT_HASH_HERE' 
WHERE "walletAddress" IS NULL AND "passwordHash" IS NULL;
```

### Testing Credentials
After patches are applied, create a test user:
```bash
curl -X POST http://localhost:3001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@volspike.com",
    "password": "Test123456!",
    "tier": "free"
  }'
```

Then test signin:
```bash
curl -X POST http://localhost:3001/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@volspike.com",
    "password": "Test123456!"
  }'
```

---

## ✅ SUCCESS VERIFICATION

After applying all patches, verify:

1. **Build Success**:
   ```bash
   cd volspike-nodejs-backend && npm run build # Should succeed
   cd volspike-nextjs-frontend && npm run build # Should succeed
   ```

2. **Password Hashing**:
   - Sign up creates users with `passwordHash` set
   - Passwords are not stored in plain text
   - Use `npx prisma studio` to verify

3. **Authentication Works**:
   - Valid credentials → Successful login + redirect
   - Invalid credentials → Error message displays
   - No credentials → Validation error

4. **Market Data Loads**:
   - Backend endpoint returns data
   - Frontend displays market data
   - WebSocket connections work (for Elite tier)

---

**Patch Version**: 1.0
**Last Updated**: October 28, 2025
**Status**: Ready for Application
