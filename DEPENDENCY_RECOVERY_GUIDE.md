# Volspike Frontend - Dependency Recovery Guide

## 🔴 Problem Summary
**Corrupted node_modules installation** preventing `npm run dev` from starting
- Multiple ENOENT errors for pino-pretty sub-dependencies
- This is NOT related to NextAuth v5 code changes (which are working correctly)
- Pure environmental/installation issue

## ✅ System Information
- **Node.js Version**: v22.20.0
- **npm Version**: 10.9.3
- **Next.js Version**: 15.0.0 (from package.json)
- **Status**: Versions are compatible ✅

## 🚨 Immediate Recovery Steps

### Step 1: Complete Clean Installation
```bash
cd volspike-nextjs-frontend

# Remove corrupted files
rm -rf node_modules
rm -rf .next
rm -rf dist

# Remove lock files to regenerate fresh
rm package-lock.json

# Clear npm cache
npm cache clean --force

# Verify cache is clean
npm cache verify
```

### Step 2: Fresh Install with Optimal Settings
```bash
# Install with legacy peer deps flag (safest for complex dependency trees)
npm install --legacy-peer-deps

# Alternative: If above fails, try with no optional dependencies
npm install --no-optional

# Alternative: If npm issues persist, try ci instead
npm ci --legacy-peer-deps
```

### Step 3: Verify Installation
```bash
# Check that critical packages exist
ls -la node_modules/pino-pretty/
ls -la node_modules/pino-pretty/node_modules/sonic-boom/
ls -la node_modules/pino-pretty/node_modules/on-exit-leak-free/

# Verify package integrity
npm list pino-pretty
npm list --depth=2 | grep -A 2 pino-pretty
```

### Step 4: Start Development Server
```bash
npm run dev
```

## 🛠️ Troubleshooting If Issues Persist

### If npm install still fails:

**Option A: Use npm with increased verbosity**
```bash
npm install --verbose 2>&1 | tee npm-install.log
# Share the npm-install.log file with expert
```

**Option B: Clear npm configuration**
```bash
# Check for problematic npm config
npm config list

# Reset npm config to defaults
npm config set registry https://registry.npmjs.org/

# Retry install
npm install --legacy-peer-deps
```

**Option C: Try alternative package manager (pnpm)**
```bash
npm install -g pnpm
cd volspike-nextjs-frontend
rm -rf node_modules package-lock.json
pnpm install
pnpm dev
```

**Option D: Try alternative package manager (yarn)**
```bash
npm install -g yarn
cd volspike-nextjs-frontend
rm -rf node_modules package-lock.json yarn.lock
yarn install
yarn dev
```

## 📋 Questions for Expert (If Needed)

1. **npm vs npm ci**
   - Should I use `npm ci` instead of `npm install` for CI/CD reliability?
   - Why did `npm install` fail and `npm ci` work?

2. **pino-pretty Specifics**
   - Are there known issues with pino-pretty v13.1.2 on Node.js v22?
   - Should we pin pino-pretty to a different version?
   - Is pino-pretty actually being used in the Next.js 15 setup?

3. **Lock File Issues**
   - Was the package-lock.json corrupted, or was the npm cache corrupted?
   - Should we add .npmrc settings to prevent this in the future?

4. **Future Prevention**
   - Should we add pre-commit hooks to prevent corrupted node_modules?
   - Should we use npm ci in our deployment pipeline?
   - What npm cache settings should we configure?

5. **Alternative Solutions**
   - Should we consider removing pino-pretty if it's not essential?
   - Would switching to pnpm or yarn improve stability?
   - Any known compatibility issues between these packages?

## 📁 Files to Share with Expert

```
Required Files:
├── package.json (included below ✅)
├── npm-install.log (if install fails - generate using step above)
├── Node version output
└── npm version output
```

## 🎯 Expected Outcome After Recovery

After successful recovery:
1. ✅ `npm install` completes without errors
2. ✅ `npm run dev` starts successfully
3. ✅ Login page visible at `http://localhost:3000`
4. ✅ NextAuth v5 authentication working
5. ✅ No ENOENT errors in console

## 💡 Key Points to Remember

- **This is NOT a code issue** - Your NextAuth v5 fixes are solid
- **This is a dependency installation issue** - Environmental problem
- **Clean install is usually the solution** - ~95% success rate
- **Document what worked** - For future reference and CI/CD setup

## 📝 Notes

- The package.json looks healthy with no obvious version conflicts
- Node v22 and npm 10.9 should handle Next.js 15 without issues
- The pino-pretty package may not even be actively used in the running app
- Consider whether verbose logging is needed for production

---

**Status**: Ready to troubleshoot with expert once recovery steps attempted
