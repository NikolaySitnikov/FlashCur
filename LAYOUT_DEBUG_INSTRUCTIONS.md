# 🔍 Layout Debug Instructions

## Current Issue
- ❌ Refresh button is cut off
- ❌ Volume alerts tab not visible
- ❌ Layout not switching properly based on screen size

## Debug Steps

### 1. **Test Debug Page**
Visit: `http://localhost:8081/debug-layout`

This will show:
- ✅ Current screen width
- ✅ Which breakpoint is active
- ✅ Which layout should be visible
- ✅ Visual indicators for desktop vs mobile layout

### 2. **Check Console Logs**
Open browser console (F12) and look for:
```
Screen width: [your width]px
Desktop layout visible: true/false
Mobile layout visible: true/false
```

### 3. **Test Different Screen Sizes**
- **Desktop (> 480px)**: Should show "DESKTOP LAYOUT" indicator
- **Mobile (≤ 480px)**: Should show "MOBILE LAYOUT" indicator

### 4. **Check Main Dashboard**
Visit: `http://localhost:8081/dashboard`

Look for:
- ✅ Green "DESKTOP LAYOUT" indicator (top-right corner)
- ✅ Red "MOBILE LAYOUT" indicator (if mobile)
- ✅ Refresh button fully visible
- ✅ Volume alerts tab (mobile only)

## Expected Behavior

### Desktop/Tablet (> 480px)
- ✅ Desktop layout visible
- ✅ Refresh button visible and not cut off
- ✅ No volume alerts tab
- ✅ Green "DESKTOP LAYOUT" indicator

### Mobile (≤ 480px)
- ✅ Mobile layout visible
- ✅ Volume alerts tab visible
- ✅ No refresh button
- ✅ Red "MOBILE LAYOUT" indicator

## If Still Not Working

### Check CSS Loading
1. Open browser dev tools (F12)
2. Go to Network tab
3. Refresh page
4. Look for `style.css` - should load without errors

### Force Refresh
1. Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
2. Clear browser cache
3. Try incognito/private mode

### Check Screen Width
1. Open console (F12)
2. Type: `console.log(window.innerWidth)`
3. Should be > 480 for desktop layout

## Files Modified
- `static/css/style.css` - Updated responsive breakpoints
- `static/js/script.js` - Added debug logging
- `templates/debug_layout.html` - New debug page
- `app.py` - Added debug route

## Next Steps
1. Test debug page first
2. Check console logs
3. Report what you see
4. We'll fix based on results
