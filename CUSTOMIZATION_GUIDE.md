# 🎨 Quick Customization Guide

## Easy Color Changes

### Change Primary Color (Green → Your Color)

Edit `modern-base.css`:
```css
:root {
    --color-primary: #00ff88;        /* Change this */
    --color-primary-dark: #00cc6a;   /* Change this */
    --color-primary-light: #33ffaa;  /* Change this */
}
```

**Popular alternatives:**
- 🔵 Blue: `#3b82f6`, `#2563eb`, `#60a5fa`
- 🟣 Purple: `#a855f7`, `#9333ea`, `#c084fc`
- 🔴 Red: `#ef4444`, `#dc2626`, `#f87171`
- 🟡 Gold: `#f59e0b`, `#d97706`, `#fbbf24`

---

## Adjust Glass Effect Intensity

Edit `modern-base.css`:
```css
:root {
    --glass-blur: blur(30px);  /* More = 40px, Less = 15px */
}
```

For all glass cards, edit:
```css
backdrop-filter: blur(30px) saturate(180%);
/* Adjust blur and saturation values */
```

---

## Change Animation Speed

Edit `modern-base.css`:
```css
:root {
    --transition-fast: 150ms;   /* Quicker interactions */
    --transition-base: 300ms;   /* Default speed */
    --transition-slow: 500ms;   /* Slower animations */
}
```

Make everything faster: Set `--transition-base: 200ms`
Make everything slower: Set `--transition-base: 500ms`

---

## Adjust Shadow Intensity

Edit `modern-base.css`:
```css
:root {
    /* Lighter shadows */
    --shadow-xl: 0 12px 24px rgba(0, 0, 0, 0.15);
    --shadow-2xl: 0 20px 40px rgba(0, 0, 0, 0.20);
    
    /* Heavier shadows */
    --shadow-xl: 0 12px 24px rgba(0, 0, 0, 0.40);
    --shadow-2xl: 0 20px 40px rgba(0, 0, 0, 0.50);
}
```

---

## Change Border Radius (Roundness)

Edit `modern-base.css`:
```css
:root {
    --radius-lg: 16px;   /* Less round: 12px, More round: 24px */
    --radius-xl: 24px;   /* Less round: 16px, More round: 32px */
    --radius-2xl: 32px;  /* Less round: 24px, More round: 48px */
}
```

---

## Modify Button Hover Effects

### Remove Shimmer Effect:
Find all `.btn-primary::before` and `.btn-primary:hover::before` blocks and delete them.

### Adjust Lift Height:
```css
.btn-primary:hover {
    transform: translateY(-4px);  /* Change -4px to -2px (less) or -8px (more) */
}
```

---

## Turn Off Animations Entirely

Add to top of `style.css`:
```css
*, *::before, *::after {
    animation: none !important;
    transition: none !important;
}
```

---

## Change Background Gradient

Edit `style.css`:
```css
body {
    background: linear-gradient(135deg, 
        #000000 0%,      /* Darkest */
        #0a0a0a 25%,     /* Dark */
        #1a1a1a 75%,     /* Medium */
        #1e1e1e 100%     /* Light dark */
    );
}
```

**Lighter background:**
```css
background: linear-gradient(135deg, 
    #0f0f0f 0%, 
    #1a1a1a 50%, 
    #2d2d2d 100%
);
```

**Darker background:**
```css
background: linear-gradient(135deg, 
    #000000 0%, 
    #050505 50%, 
    #0a0a0a 100%
);
```

---

## Adjust Card Transparency

Find all `.profile-card`, `.auth-card`, `.table-container` etc:
```css
background: rgba(26, 26, 26, 0.7);  /* 0.7 = 70% opacity */
```

- More opaque (less see-through): `0.9`
- More transparent: `0.5`

---

## Quick Font Size Adjustments

Edit `modern-base.css`:
```css
:root {
    --font-base: 1rem;      /* Base size */
    --font-xl: 1.5rem;      /* Headings */
    --font-2xl: 2rem;       /* Large headings */
    --font-3xl: 2.5rem;     /* Page titles */
}
```

Make everything larger: Multiply all values by 1.1
Make everything smaller: Multiply all values by 0.9

---

## Remove Glow Effects

Find all `box-shadow` properties with `rgba(0, 255, 136, ...)` and remove those lines.

Example - From:
```css
box-shadow: 
    0 24px 64px rgba(0, 0, 0, 0.4),
    0 16px 48px rgba(0, 255, 136, 0.15);  /* ← Remove this line */
```

To:
```css
box-shadow: 
    0 24px 64px rgba(0, 0, 0, 0.4);
```

---

## Testing Changes

1. Save your CSS file
2. Hard refresh browser: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
3. Clear cache if needed

---

## Need More Help?

- All color variables: `modern-base.css` lines 1-50
- Button styles: `auth.css` lines 297-344
- Card styles: `profile.css` lines 203-224
- Table styles: `style.css` lines 964-983

---

*Happy customizing! 🎨*

