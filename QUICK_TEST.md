# ⚡ Step 2: Quick Testing Reference

## 🚀 Run Full Test Suite
```bash
cd "/Users/nikolaysitnikov/Documents/Documents_Nik_MacBook/Everyday Life/AI/VolumeFunding/FlashCur"
python test_database.py
```
**Expected:** `✅ ALL TESTS PASSED!`

---

## 🌐 Test via Browser

### Start Server
```bash
cd "/Users/nikolaysitnikov/Documents/Documents_Nik_MacBook/Everyday Life/AI/VolumeFunding/FlashCur"
python app.py
```

### Test URLs
Open these in your browser:

#### 1. View All Users
```
http://localhost:8081/debug/db
```

#### 2. Create User
```
http://localhost:8081/debug/create-user?email=test@example.com&password=testpass123&tier=0
```

#### 3. Test Password
```
http://localhost:8081/debug/test-password?email=test@example.com&password=testpass123
```

#### 4. Upgrade to Pro
```
http://localhost:8081/debug/upgrade-tier?email=test@example.com&tier=1
```

#### 5. Delete User
```
http://localhost:8081/debug/delete-user?email=test@example.com
```

---

## 🗄️ Inspect Database
```bash
cd "/Users/nikolaysitnikov/Documents/Documents_Nik_MacBook/Everyday Life/AI/VolumeFunding/FlashCur"
sqlite3 instance/binance_dashboard.db
.tables
SELECT email, tier FROM users;
.quit
```

---

## 🔄 Reset Database
```bash
rm instance/binance_dashboard.db
python test_database.py
```

---

## ✅ Success Checklist
- [ ] Test suite passes
- [ ] Database file exists: `instance/binance_dashboard.db`
- [ ] 3 test users created
- [ ] All debug routes work
- [ ] Passwords hash correctly

---

**🎯 Ready for Step 3!**

