# Mobile Scroll Diagnostic & Troubleshooting

## Quick Diagnostic Test

### Step 1: Test with Simple Page

I've created a diagnostic test page. Access it:

**URL**: `http://localhost:8081/test-scroll`

This page has:
- ✅ Minimal CSS (no interference)
- ✅ Real-time scroll position display  
- ✅ Touch event logging
- ✅ Automatic snap-back detection

**What to do:**
1. Open on mobile device
2. Swipe the table left
3. Release finger
4. Watch the "Scroll Position" number
5. **If it goes back to 0** → Scroll is broken
6. **If it stays at >0** → Scroll works!

### Step 2: Check Browser Console

Open Safari/Chrome DevTools on mobile:
1. Connect device to computer
2. Safari: Develop → [Your Device] → localhost
3. Chrome: chrome://inspect
4. Watch console logs while scrolling

### Step 3: Identify the Issue

If test page works but main dashboard doesn't:
- **Problem**: CSS conflict on main page
- **Solution**: Inspect element, check computed styles

If test page also doesn't work:
- **Problem**: Browser/device limitation
- **Solution**: Try different browser or settings

## Common Causes & Solutions

### Issue 1: Browser Cache
**Symptoms**: CSS changes not applying
**Solution**:
```
iOS Safari: Settings → Safari → Clear History and Website Data
Chrome Mobile: Settings → Privacy → Clear browsing data → Cached images
Or: Use Incognito/Private mode
```

### Issue 2: Parent Container Interference
**Symptoms**: Can scroll a tiny bit, then snaps back
**Diagnostic**: Check parent container CSS

Open DevTools, inspect `.table-container`:
```css
/* What you should see */
overflow-x: scroll;
touch-action: pan-x;
-webkit-overflow-scrolling: touch;

/* Check parents too */
.market-data: overflow: visible;
.main-content: overflow: visible;
body: overflow-x: visible;
```

**Fix**: If any parent has `overflow-x: hidden`, it will block scrolling!

### Issue 3: JavaScript Interference
**Symptoms**: Scrolling works, then immediately resets
**Diagnostic**: Check for JavaScript scroll handlers

Open console, run:
```javascript
// Check if any scroll prevention
const container = document.getElementById('tableContainer');
console.log('Event listeners:', getEventListeners(container));
```

**Fix**: If you see `preventDefault()` or scroll event listeners, they may be interfering.

### Issue 4: Touch-Action Conflicts
**Symptoms**: Can't start scrolling at all
**Diagnostic**: Check touch-action on all elements

```javascript
// Check touch-action cascade
const container = document.getElementById('tableContainer');
let element = container;
while (element) {
    console.log(element.className, getComputedStyle(element).touchAction);
    element = element.parentElement;
}
```

**Fix**: Every parent should have `touch-action: auto` or `pan-x`.

### Issue 5: iOS-Specific Issues
**Symptoms**: Works on Android, not iOS
**Diagnostic**: iOS has stricter scrolling rules

**Fix**: Add to `.table-container`:
```css
-webkit-overflow-scrolling: touch !important;
touch-action: pan-x !important;
overscroll-behavior-x: contain !important;
```

### Issue 6: Viewport Meta Tag
**Symptoms**: Zoom/pinch interferes with scrolling
**Diagnostic**: Check `<meta name="viewport">` tag

Should be:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes">
```

**Not**:
```html
<!-- BAD: user-scalable=no blocks some touch events -->
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
```

## Manual CSS Override

If nothing works, try this nuclear option:

### On Mobile Device:

1. Open Safari/Chrome
2. Go to dashboard  
3. Open console
4. Paste this:

```javascript
// Nuclear fix - force scrolling
const container = document.getElementById('tableContainer');
if (container) {
    container.style.cssText = `
        overflow-x: scroll !important;
        overflow-y: hidden !important;
        -webkit-overflow-scrolling: touch !important;
        touch-action: pan-x !important;
        scroll-behavior: auto !important;
        overscroll-behavior-x: contain !important;
        transform: none !important;
        transition: none !important;
        will-change: auto !important;
    `;
    
    // Fix parents
    let parent = container.parentElement;
    while (parent && parent !== document.body) {
        parent.style.overflow = 'visible !important';
        parent.style.touchAction = 'auto !important';
        parent = parent.parentElement;
    }
    
    console.log('✅ Nuclear fix applied!');
}
```

4. Try scrolling
5. **If this works**: We know it's a CSS specificity issue
6. **If this doesn't work**: It's a deeper issue (browser limitation)

## Device-Specific Tests

### iOS Safari
- Clear cache: Settings → Safari → Clear History and Website Data
- Disable "Prevent Cross-Site Tracking": Settings → Safari → [toggle off]
- Try in Private Browsing mode

### Chrome Mobile
- Clear cache: Settings → Privacy → Clear browsing data
- Try in Incognito mode
- Check flag: `chrome://flags` → "Smooth Scrolling" → Disabled

### Samsung Internet
- Clear cache
- Check "Smart anti-tracking"
- Try in Secret mode

## Network Inspector Check

### Check CSS File is Latest:

1. Open DevTools → Network tab
2. Refresh page
3. Find `style.css`
4. Check timestamp
5. Click to view
6. Search for: `touch-action: pan-x !important`
7. **If not found**: Cache issue - clear cache!

## Database Check

Verify you're actually logged in as Pro:

```bash
sqlite3 instance/binance_dashboard.db "SELECT email, tier FROM user;"
```

Should show tier = 1 or 2 (not 0).

## JavaScript Debug Mode

Add this to console to see detailed scroll info:

```javascript
// Real-time scroll debugging
const container = document.getElementById('tableContainer');
let lastScroll = 0;

container.addEventListener('scroll', function() {
    const current = this.scrollLeft;
    console.log(`Scroll: ${current}px (change: ${current - lastScroll}px)`);
    lastScroll = current;
});

container.addEventListener('touchend', function() {
    setTimeout(() => {
        const final = this.scrollLeft;
        if (final === 0 && lastScroll > 0) {
            console.error('❌ SNAP-BACK DETECTED!');
            console.error('Last good scroll:', lastScroll);
            console.error('Final scroll:', final);
        } else {
            console.log('✅ Scroll maintained at:', final);
        }
    }, 200);
});

console.log('✅ Debug mode enabled');
```

## CSS Inspection Checklist

Use this checklist on mobile:

### Container (`.table-container`):
- [ ] `overflow-x: scroll` ✅
- [ ] `overflow-y: hidden` ✅
- [ ] `touch-action: pan-x` ✅
- [ ] `-webkit-overflow-scrolling: touch` ✅
- [ ] `transform: none` ✅
- [ ] `transition: none` ✅

### Parents:
- [ ] `.market-data`: `overflow: visible` ✅
- [ ] `.main-content`: `overflow: visible` ✅
- [ ] `.app`: `overflow-x: hidden` ✅
- [ ] `body`: `overflow-x: visible` ✅

### Table (`.data-table`):
- [ ] `min-width: 900px` ✅
- [ ] `transform: none` ✅

## Last Resort: Minimal Test

If NOTHING works, create a new minimal HTML file:

```html
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        .scroll-test {
            overflow-x: scroll;
            -webkit-overflow-scrolling: touch;
            touch-action: pan-x;
            border: 2px solid red;
        }
        .scroll-test table {
            min-width: 900px;
        }
    </style>
</head>
<body>
    <div class="scroll-test">
        <table>
            <tr>
                <td>Col 1</td><td>Col 2</td><td>Col 3</td>
                <td>Col 4</td><td>Col 5</td><td>Col 6</td>
                <td>Col 7</td>
            </tr>
        </table>
    </div>
</body>
</html>
```

Save as `test.html`, open on mobile:
- **If this works**: Problem is in our CSS
- **If this doesn't work**: Browser/device limitation

## Report Template

If still broken, provide this info:

```
Device: [iOS/Android, version]
Browser: [Safari/Chrome/etc, version]
Test page (/test-scroll): [Works/Doesn't work]
Minimal test: [Works/Doesn't work]
Cache cleared: [Yes/No]
Console errors: [Any errors?]
Scroll position value: [Goes to 0 or stays?]
Nuclear fix (JavaScript): [Worked/Didn't work]
```

---

**Access Diagnostic Test**: http://localhost:8081/test-scroll

**This is the most important step** - tell me if the test page works!

