# Theme Design Reference for Pro Tier Features

## Color Palette

### Dark Theme (Default)
```css
/* Background */
--bg-primary: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #2d2d2d 100%);
--bg-secondary: rgba(45, 45, 45, 0.95);
--bg-card: rgba(26, 26, 26, 0.95);

/* Text */
--text-primary: #ffffff;
--text-secondary: #9ca3af;
--text-muted: #6b7280;

/* Borders */
--border-primary: #404040;
--border-secondary: rgba(255, 255, 255, 0.1);

/* Accent Colors */
--accent-purple: #a855f7;
--accent-purple-bg: rgba(168, 85, 247, 0.15);
--accent-purple-border: rgba(168, 85, 247, 0.3);

--accent-green: #00ff88;
--accent-green-muted: #4ade80;
--accent-red: #ef4444;
--accent-yellow: #facc15;
--accent-blue: #3b82f6;
```

### Light Theme
```css
/* Background */
--bg-primary: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
--bg-secondary: rgba(255, 255, 255, 0.95);
--bg-card: rgba(255, 255, 255, 0.95);

/* Text */
--text-primary: #1f2937;
--text-secondary: #4b5563;
--text-muted: #6b7280;

/* Borders */
--border-primary: #e5e7eb;
--border-secondary: rgba(0, 0, 0, 0.1);

/* Accent Colors */
--accent-purple: #9333ea;
--accent-purple-bg: rgba(147, 51, 234, 0.1);
--accent-purple-border: rgba(147, 51, 234, 0.2);

--accent-green: #10b981;
--accent-red: #dc2626;
--accent-yellow: #f59e0b;
--accent-blue: #2563eb;
```

---

## Design Principles for Pro Features

### 1. **Buttons & CTAs**
```css
/* Primary Button (Upgrade, Submit) */
.btn-primary {
    background: rgba(168, 85, 247, 0.15);  /* Dark */
    background: rgba(147, 51, 234, 0.1);   /* Light */
    border: 1px solid rgba(168, 85, 247, 0.3);
    color: #a855f7;  /* Dark */
    color: #9333ea;  /* Light */
    padding: 0.5rem 1rem;
    border-radius: 10px;
    font-weight: 600;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.btn-primary:hover {
    background: rgba(168, 85, 247, 0.25);
    transform: scale(1.05);
}

/* Success Button (Confirm) */
.btn-success {
    background: rgba(0, 255, 136, 0.1);
    border: 1px solid rgba(0, 255, 136, 0.3);
    color: #00ff88;
}

/* Danger Button (Cancel, Delete) */
.btn-danger {
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    color: #ef4444;
}
```

### 2. **Cards & Containers**
```css
.card {
    background: rgba(26, 26, 26, 0.95);  /* Dark */
    background: rgba(255, 255, 255, 0.95);  /* Light */
    border: 1px solid #404040;  /* Dark */
    border: 1px solid #e5e7eb;  /* Light */
    border-radius: 16px;
    padding: 1.5rem;
    backdrop-filter: blur(10px);
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}
```

### 3. **Forms & Inputs**
```css
.form-input {
    background: rgba(0, 0, 0, 0.3);  /* Dark */
    background: rgba(255, 255, 255, 0.8);  /* Light */
    border: 1px solid #404040;  /* Dark */
    border: 1px solid #d1d5db;  /* Light */
    border-radius: 12px;
    color: #ffffff;  /* Dark */
    color: #1f2937;  /* Light */
    padding: 0.75rem 1rem;
    transition: all 0.2s;
}

.form-input:focus {
    border-color: #a855f7;  /* Dark */
    border-color: #9333ea;  /* Light */
    box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.1);
}
```

### 4. **Badges & Tags**
```css
/* Pro Tier Badge */
.badge-pro {
    background: linear-gradient(135deg, #a855f7, #ec4899);
    color: #ffffff;
    padding: 0.25rem 0.75rem;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

/* Elite Tier Badge */
.badge-elite {
    background: linear-gradient(135deg, #f59e0b, #eab308);
    color: #000000;
}

/* Status Badge (Active, Confirmed) */
.badge-success {
    background: rgba(0, 255, 136, 0.15);
    color: #00ff88;
    border: 1px solid rgba(0, 255, 136, 0.3);
}

.badge-warning {
    background: rgba(250, 204, 21, 0.15);
    color: #facc15;
    border: 1px solid rgba(250, 204, 21, 0.3);
}
```

### 5. **Alerts & Notifications**
```css
/* Success Alert */
.alert-success {
    background: rgba(0, 255, 136, 0.1);
    border-left: 4px solid #00ff88;
    color: #00ff88;  /* Dark */
    color: #10b981;  /* Light */
}

/* Error Alert */
.alert-error {
    background: rgba(239, 68, 68, 0.1);
    border-left: 4px solid #ef4444;
    color: #ef4444;  /* Dark */
    color: #dc2626;  /* Light */
}

/* Info Alert */
.alert-info {
    background: rgba(59, 130, 246, 0.1);
    border-left: 4px solid #3b82f6;
    color: #3b82f6;  /* Dark */
    color: #2563eb;  /* Light */
}
```

### 6. **Loading & Animations**
```css
/* Pulse animation for loading */
@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
}

.loading {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

/* Slide in animation */
@keyframes slideInRight {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}
```

---

## Usage Examples for Pro Features

### Email Confirmation Banner
```html
<div class="alert alert-info">
    <div class="alert-icon">📧</div>
    <div class="alert-content">
        <strong>Verify your email</strong>
        <p>Check your inbox for a confirmation link to unlock Pro features.</p>
    </div>
    <button class="btn-primary btn-sm">Resend Email</button>
</div>
```

### Upgrade Prompt Card
```html
<div class="card upgrade-prompt">
    <div class="card-header">
        <h3>🚀 Upgrade to Pro</h3>
        <span class="badge-pro">Pro</span>
    </div>
    <ul class="feature-list">
        <li>✅ Faster refresh (5 min)</li>
        <li>✅ Email alerts</li>
        <li>✅ No ads</li>
        <li>✅ Custom thresholds</li>
    </ul>
    <button class="btn-primary btn-lg">Upgrade Now - $9.99/mo</button>
</div>
```

### Wallet Connect Button
```html
<button class="btn-wallet">
    <img src="/static/images/metamask-icon.svg" alt="MetaMask" />
    <span>Connect Wallet</span>
</button>

<style>
.btn-wallet {
    background: linear-gradient(135deg, #f6851b, #e2761b);
    border: none;
    color: #ffffff;
    padding: 0.75rem 1.5rem;
    border-radius: 12px;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-weight: 600;
    box-shadow: 0 4px 12px rgba(246, 133, 27, 0.3);
    transition: all 0.3s;
}

.btn-wallet:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(246, 133, 27, 0.4);
}
</style>
```

---

## Animation Standards

- **Transition timing**: `0.3s` for hover effects
- **Easing function**: `cubic-bezier(0.4, 0, 0.2, 1)` for smooth animations
- **Transform on hover**: `scale(1.05)` or `translateY(-2px)` for lift effect
- **Backdrop blur**: `blur(10px)` for glass morphism effects

---

## Icons & Emojis

Use consistent emojis for features:
- 🚀 Upgrade/Pro features
- 📧 Email/Notifications
- 🔒 Security/Authentication
- 🎨 Theme/Customization
- 💳 Payments/Billing
- ⚡ Speed/Performance
- 🔔 Alerts/Notifications
- 👛 Wallet/Crypto
- ✅ Success/Confirmed
- ❌ Error/Failed
- ⚠️ Warning/Attention

---

## Responsive Breakpoints

```css
/* Mobile */
@media (max-width: 640px) { ... }

/* Tablet */
@media (min-width: 641px) and (max-width: 1024px) { ... }

/* Desktop */
@media (min-width: 1025px) { ... }
```

---

**Always test both dark and light themes when adding new Pro Tier UI components!**

