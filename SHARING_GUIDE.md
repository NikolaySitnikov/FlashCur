# 🌐 Share Your Project with Friends

This guide shows you how to make your FlashCur dashboard accessible to anyone on the internet, even if they're on a different WiFi network.

## Option 1: Using ngrok (Recommended) ⭐

### Quick Start (3 steps):

1. **Install ngrok** (one-time setup):
   ```bash
   brew install ngrok/ngrok/ngrok
   ```

2. **Get a free ngrok account** (one-time setup):
   - Sign up at: https://dashboard.ngrok.com/signup
   - Copy your authtoken
   - Run: `ngrok config add-authtoken YOUR_TOKEN_HERE`

3. **Run the sharing script**:
   ```bash
   cd FlashCur
   chmod +x share_project.sh
   ./share_project.sh
   ```

### What happens:
- Your Flask app starts on port 8081
- ngrok creates a public URL (e.g., `https://abc123.ngrok.io`)
- Share that URL with your friend
- They can access your dashboard from anywhere!

### Example output:
```
Session Status                online
Account                       your_email@example.com
Version                       3.x.x
Region                        United States (us)
Latency                       35ms
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc123.ngrok.io -> http://localhost:8081

Share this URL with your friend: https://abc123.ngrok.io
```

## Option 2: Manual ngrok Setup

If you prefer to run things separately:

1. **Start your Flask app** (Terminal 1):
   ```bash
   cd FlashCur
   python3 app.py
   ```

2. **Start ngrok** (Terminal 2):
   ```bash
   ngrok http 8081
   ```

3. **Share the URL** that ngrok displays with your friend

## Option 3: Using localtunnel (Alternative)

If you prefer not to sign up for ngrok:

1. **Install localtunnel**:
   ```bash
   npm install -g localtunnel
   ```

2. **Start your Flask app**:
   ```bash
   cd FlashCur
   python3 app.py
   ```

3. **Start localtunnel** (new terminal):
   ```bash
   lt --port 8081
   ```

4. **Share the URL** with your friend

## Important Security Notes 🔒

- ⚠️ **Your app will be publicly accessible** on the internet
- ⚠️ **Anyone with the URL can access it** (until you stop the tunnel)
- ✅ Your app has authentication - make sure your friend creates an account
- ✅ Stripe payment webhooks are already configured for both local and remote access
- 💡 The tunnel URL changes each time (unless you use a paid ngrok plan)

## Troubleshooting

### ngrok shows "ERROR: authentication failed"
- Make sure you've added your authtoken: `ngrok config add-authtoken YOUR_TOKEN`

### Flask app won't start
- Check if port 8081 is already in use: `lsof -i :8081`
- Kill any processes using that port: `kill -9 PID`

### Friend can't connect
- Make sure your Flask app is running
- Make sure ngrok tunnel is active
- Share the **https** URL (not http)
- Check that they're using the full URL including `https://`

### CORS errors
- Your app already has CORS configured for various origins
- If issues persist, check `app.py` lines 72-81 for CORS settings

## Web Interface (ngrok)

When ngrok is running, you can view traffic at:
- http://127.0.0.1:4040

This shows:
- All requests coming through the tunnel
- Request/response details
- Performance metrics

## Stopping the Tunnel

- Press `Ctrl+C` in the ngrok terminal
- The script will automatically stop Flask
- Your app will no longer be accessible from the internet

## Production Deployment

For permanent hosting (not just showing to a friend), consider:
- **Heroku** - Easy Python deployment
- **Railway** - Modern platform with free tier
- **Render** - Simple deployment with free tier
- **DigitalOcean** - More control, $5/month
- **AWS/GCP/Azure** - Enterprise options

See `PRODUCTION_DEPLOYMENT_GUIDE.md` for more details.

