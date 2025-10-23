# Expert Consultation: Mobile Horizontal Scroll Issue

## Problem Summary

**Issue**: Pro tier tables with 7 columns cannot scroll horizontally on mobile devices (iOS/Android). User can scroll slightly while finger is on screen, but table snaps back to left position when finger is released.

**Platform**: Flask web app with responsive CSS
**Affected**: Mobile Safari, Chrome Mobile
**Works**: Desktop browsers (Chrome, Firefox, Safari)

---

## Files to Share with Expert

### Priority 1 (Must Share):
1. **`FlashCur/static/css/style.css`** - Main stylesheet (lines 976-2193)
2. **`FlashCur/templates/dashboard.html`** - Dashboard HTML structure (lines 162-206)
3. **`FlashCur/templates/test_scroll.html`** - Minimal test page for diagnostics

### Priority 2 (If Needed):
4. **`FlashCur/static/js/script.js`** - JavaScript (lines 140-173, 929-973)

---

## Key Questions to Ask Expert

### Question 1: CSS Hierarchy
> "On mobile Safari, I have a table in a scrollable container (overflow-x: auto), but it snaps back after release. The container has `-webkit-overflow-scrolling: touch` and `touch-action: pan-x`. Parent containers have `overflow: visible`. What CSS property or parent element could be blocking this?"

**Show them**: Lines 976-999 in `style.css` (`.table-container`)

### Question 2: Touch-Action Cascade
> "I've set `touch-action: pan-x` on the scroll container, but also have `touch-action: auto` on parent containers. Could this be causing conflicts? Should all parents have the same touch-action value?"

**Show them**: Lines 672, 695, 2174, 2191 in `style.css`

### Question 3: Transform Interference
> "The container initially had `transform: translateZ(0)` for GPU acceleration. I've removed it (`transform: none !important`), but could transforms from parent elements or animations still be interfering?"

**Show them**: Lines 997, 2137 in `style.css`

### Question 4: iOS-Specific
> "This happens on iOS Safari specifically. Are there any iOS-specific CSS properties or meta viewport settings that could prevent momentum scrolling from working?"

**Show them**: 
- `dashboard.html` head section (meta viewport tag)
- Mobile CSS block: lines 2121-2167 in `style.css`

### Question 5: Testing Method
> "I created a minimal test page (`/test-scroll`) that should work but doesn't. Can you test it on an iOS device and tell me what's different from a working example?"

**Share**: `templates/test_scroll.html`

---

## What I've Already Tried (Tell Expert)

✅ Changed `overflow-x` from `hidden` to `visible` on body  
✅ Set `overflow-x: scroll` (not auto) on container  
✅ Added `-webkit-overflow-scrolling: touch`  
✅ Set `touch-action: pan-x` on container  
✅ Removed all transitions from container  
✅ Changed scroll hint from `position: sticky` to `absolute`  
✅ Added `pointer-events: none` to scroll hint  
✅ Set `transform: none !important` on container  
✅ Added `overscroll-behavior-x: contain`  
✅ Cleared browser cache multiple times  
✅ Tested in incognito mode  
✅ Added mobile-specific CSS with `!important` flags  
✅ Ensured parent containers have `overflow: visible`  
✅ Removed hover effects on touch devices  

---

## Reproduction Steps

1. Open `http://localhost:8081` on iPhone (iOS Safari)
2. Login as Pro user (tier >= 1)
3. Dashboard loads with table showing 7 columns
4. Table width (900px) exceeds screen width
5. Place finger on table and swipe left
6. **BUG**: Can scroll while touching, but snaps back to left when finger released

---

## Expected Behavior

- Smooth momentum scrolling (iOS style)
- Scroll position maintained after finger release
- All 7 columns accessible via horizontal scroll

---

## Current CSS (Simplified)

```css
/* Container */
.table-container {
    overflow-x: scroll !important;
    overflow-y: hidden !important;
    -webkit-overflow-scrolling: touch !important;
    touch-action: pan-x !important;
    transform: none !important;
    transition: none !important;
}

/* Parents */
body { overflow-x: visible; }
.app { overflow-x: hidden; }
.main-content { overflow: visible; touch-action: auto; }
.market-data { overflow: visible; touch-action: auto; }

/* Table */
.data-table {
    min-width: 900px;
    transform: none !important;
}
```

---

## Diagnostic Test

I created `/test-scroll` endpoint with minimal HTML/CSS:

```html
<div style="overflow-x: scroll; -webkit-overflow-scrolling: touch; touch-action: pan-x;">
    <table style="min-width: 900px;">...</table>
</div>
```

**Result**: Same issue - snaps back on mobile

This suggests it's NOT a CSS conflict, but something more fundamental.

---

## Possible Root Causes (Expert Should Check)

### Theory 1: Meta Viewport Issue
Could `user-scalable=yes` or viewport settings be interfering?

Current meta tag:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0">
```

### Theory 2: iOS Safari Restriction
Does iOS Safari block horizontal scrolling in certain contexts? (e.g., when page itself can't scroll horizontally?)

### Theory 3: Touch Event Listener
Could JavaScript event listeners (even passive ones) be preventing default scroll behavior?

Check: `script.js` lines 964-968 (scroll event listener)

### Theory 4: Container Size Constraint
Could flexbox parent (`.market-data`) be constraining the container in a way that prevents scrolling?

Check: `style.css` lines 688-698

### Theory 5: Hardware/Browser Bug
Could this be an iOS Safari bug with specific CSS combinations?

Try: Test on different iOS version or Chrome Mobile

---

## Quick Tests for Expert

### Test 1: Minimal HTML
Create standalone HTML file:
```html
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        .scroll-container {
            overflow-x: scroll;
            -webkit-overflow-scrolling: touch;
            width: 100%;
            border: 2px solid red;
        }
        table { min-width: 900px; }
    </style>
</head>
<body>
    <div class="scroll-container">
        <table><tr>
            <td>C1</td><td>C2</td><td>C3</td><td>C4</td>
            <td>C5</td><td>C6</td><td>C7</td>
        </tr></table>
    </div>
</body>
</html>
```

**If this works**: Problem is in our CSS  
**If this doesn't work**: iOS Safari limitation or device issue

### Test 2: JavaScript Override
In Safari console on mobile:
```javascript
document.getElementById('tableContainer').style.cssText = 
    'overflow-x: scroll !important; -webkit-overflow-scrolling: touch !important;';
```

**If this works**: CSS specificity issue  
**If this doesn't work**: Deeper issue

### Test 3: Different Device
Test on:
- Android device (Chrome Mobile)
- Different iOS version
- iPad Safari

**If works on Android**: iOS-specific issue  
**If doesn't work anywhere**: Universal mobile issue

---

## Device/Browser Info

**User Device**: [User to provide]
- Device model: _________
- iOS/Android version: _________
- Browser: _________
- Browser version: _________

---

## Success Criteria

✅ User can swipe table left on mobile  
✅ Scroll position stays after finger release  
✅ Momentum scrolling feels natural (iOS)  
✅ All 7 columns accessible  

---

## Contact Info for Follow-up

After expert reviews, please provide:
1. What they found was the root cause
2. What CSS changes they recommend
3. Whether it's a known iOS Safari limitation
4. Any workarounds or alternatives

---

## Alternative Solutions (If Unfixable)

If horizontal scroll can't work on mobile:

### Option A: Column Priority
Show 4 most important columns on mobile, collapse others into expandable rows

### Option B: Swipe Cards
Replace table with swipeable card interface on mobile

### Option C: Modal View
Tap row to open modal with all column data

### Option D: Rotate Device
Show message: "Rotate device to landscape for full table"

---

**Priority**: High (blocks Pro tier users on mobile)  
**Workaround Available**: No  
**Impact**: ~50% of users (mobile traffic)  

---

## Files Archive Command

To create a zip with all relevant files:

```bash
cd FlashCur
zip -r scroll_issue_files.zip \
    static/css/style.css \
    templates/dashboard.html \
    templates/test_scroll.html \
    static/js/script.js \
    DIAGNOSTIC_SCROLL_TROUBLESHOOTING.md \
    EXPERT_CONSULTATION_MOBILE_SCROLL.md
```

Send `scroll_issue_files.zip` to expert.

