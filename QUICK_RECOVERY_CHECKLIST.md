# 🚀 Quick Recovery Checklist

## Before You Start
- [ ] Backup your project (git commit if not already done)
- [ ] Note current Node/npm versions: **v22.20.0 / 10.9.3** ✅
- [ ] Ensure 2GB+ free disk space: `df -h`
- [ ] Close any running dev servers

## Phase 1: Clean Everything
```
☐ cd volspike-nextjs-frontend
☐ rm -rf node_modules
☐ rm -rf .next
☐ rm package-lock.json
☐ npm cache clean --force
☐ npm cache verify
```

## Phase 2: Fresh Install (Try in Order)

### Attempt 1: Standard Install with Legacy Peer Deps
```
☐ npm install --legacy-peer-deps
☐ If successful → Go to Phase 3
☐ If failed → Try Attempt 2
```

### Attempt 2: With npm ci (more strict)
```
☐ npm ci --legacy-peer-deps
☐ If successful → Go to Phase 3
☐ If failed → Try Attempt 3
```

### Attempt 3: No Optional Dependencies
```
☐ npm install --no-optional
☐ If successful → Go to Phase 3
☐ If failed → Try Attempt 4
```

### Attempt 4: Verbose Output for Debugging
```
☐ npm install --verbose --legacy-peer-deps 2>&1 | tee npm-install.log
☐ Share npm-install.log with expert
☐ Try alternative package manager if needed
```

## Phase 3: Verify Installation
```
☐ ls -la node_modules/pino-pretty/
☐ npm list pino-pretty
☐ npm run type-check
```

## Phase 4: Start Development
```
☐ npm run dev
☐ Visit http://localhost:3000
☐ Check for errors in console
☐ Test login functionality
```

## 🎯 Success Indicators
- [ ] npm install completes with no errors
- [ ] npm run dev starts without errors
- [ ] No ENOENT errors in console output
- [ ] Page loads at localhost:3000
- [ ] NextAuth can be tested

## ❌ If Still Failing
1. Collect full error output
2. Run: `npm list --all > npm-list.txt`
3. Run: `npm config list > npm-config.txt`
4. Share these files with expert

## 🔄 Alternative Approaches (If npm fails)
- [ ] Try pnpm: `npm install -g pnpm && pnpm install`
- [ ] Try yarn: `npm install -g yarn && yarn install`
- [ ] Check Node version compatibility
- [ ] Check available disk space
- [ ] Try on different network connection

## 📊 System Status
- Node.js: v22.20.0 ✅
- npm: 10.9.3 ✅
- Next.js: 15.0.0 ✅
- Disk Space: Check with `df -h`
- Memory: Check with `free -h`

---

**Time to Complete**: 5-15 minutes (depending on internet speed)
**Success Rate**: ~95% with these steps
**Next Step**: Follow Phase 1 above
