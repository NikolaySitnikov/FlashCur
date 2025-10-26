# Quick Start Guide - VolSpike

## Fix Login Issues

### What Was Wrong
1. Login wasn't redirecting after successful authentication
2. Credentials `test-free@example.com` / `password123` weren't supported
3. No error messages shown on failed login

### What Was Fixed
✅ Added redirect after successful login  
✅ Added support for both credential sets  
✅ Added error message display  
✅ Updated authentication logic to handle both test accounts  

### Test Credentials

**Option 1:**
- Email: `test@volspike.com`
- Password: `password`

**Option 2:**
- Email: `test-free@example.com`
- Password: `password123`

---

## Run Locally (Quick Commands)

### 1. Start Database & Redis
```bash
docker-compose up -d
```

### 2. Start Backend
```bash
cd volspike-nodejs-backend
npm install  # if first time
npm run dev
```

### 3. Start Frontend
```bash
cd volspike-nextjs-frontend
npm install  # if first time
npm run dev
```

### 4. Open Browser
Visit: **http://localhost:3000**

### 5. Login
Use credentials above and click "Sign In"

---

## Quick Troubleshooting

### Login Not Working?
1. Check backend is running: `curl http://localhost:3001/health`
2. Check frontend console for errors
3. Verify `.env.local` has `NEXTAUTH_SECRET` set

### Database Issues?
```bash
docker ps | grep postgres  # Check if running
cd volspike-nodejs-backend
npx prisma db push  # Reset database
```

### Still Issues?
See `LOCAL_TESTING_GUIDE.md` for detailed troubleshooting

---

## What Changed

**Files Modified:**
- `volspike-nextjs-frontend/src/components/login-page.tsx` - Added redirect and error handling
- `volspike-nextjs-frontend/src/lib/auth.ts` - Added support for both credential sets

**New Files:**
- `LOCAL_TESTING_GUIDE.md` - Comprehensive testing guide
- `QUICK_START.md` - This file

---

## Next Steps

After login works:
1. Explore the dashboard
2. Test real-time data updates
3. Try wallet connection
4. Test different user tiers

---

## Need Help?

Check these files:
- `LOCAL_TESTING_GUIDE.md` - Detailed setup and testing
- `AGENTS.md` - Project overview and architecture
- `README_NEW_STACK.md` - Full documentation
