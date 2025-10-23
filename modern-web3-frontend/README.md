# Modern Web3 Frontend for Binance Dashboard

This is a modern React frontend using the latest Web3 libraries for seamless wallet integration.

## 🚀 Features

- **100+ Wallet Support**: MetaMask, WalletConnect, Coinbase Wallet, and more
- **Mobile-First**: Proper deep linking and mobile wallet support
- **Multi-Chain**: Ethereum, Polygon, BSC, Avalanche, Arbitrum, Optimism
- **Modern Stack**: RainbowKit + Wagmi + Viem (2025 best practices)
- **Sign-In With Ethereum (SIWE)**: Secure authentication without passwords

## 📦 Dependencies

- `@rainbow-me/rainbowkit`: Wallet connection UI
- `wagmi`: React hooks for Ethereum
- `viem`: TypeScript interface for Ethereum
- `@tanstack/react-query`: Data fetching and caching
- `siwe`: Sign-In With Ethereum implementation

## 🛠️ Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up WalletConnect Project ID:**
   - Go to [WalletConnect Cloud](https://cloud.walletconnect.com/)
   - Create a new project
   - Copy the Project ID
   - Create `.env.local` file:
     ```env
     REACT_APP_WALLETCONNECT_PROJECT_ID=your-project-id-here
     ```

3. **Start development server:**
   ```bash
   npm start
   ```

## 🔧 Configuration

### Supported Chains
- Ethereum Mainnet
- Polygon
- Binance Smart Chain
- Avalanche
- Arbitrum
- Optimism
- Sepolia (testnet)

### Supported Wallets
- MetaMask (browser extension)
- WalletConnect (mobile apps)
- Coinbase Wallet
- And 100+ more via WalletConnect

## 📱 Mobile Support

The app automatically detects mobile devices and:
- Uses WalletConnect for mobile wallet connections
- Provides proper deep linking to wallet apps
- Handles mobile-specific UI adjustments

## 🔗 Backend Integration

This frontend integrates with your existing Flask backend:
- Sends signed messages to `/wallet/verify-signature`
- Handles authentication responses
- Redirects to dashboard on successful login

## 🎨 Styling

The app uses a dark theme matching your existing design:
- Green accent color (#00ff88)
- Dark background
- Modern UI components

## 🧪 Testing

1. **Desktop Testing:**
   - Install MetaMask browser extension
   - Connect wallet and sign message

2. **Mobile Testing:**
   - Open in mobile browser
   - Use WalletConnect to connect mobile wallet
   - Test deep linking functionality

## 🚀 Deployment

1. **Build for production:**
   ```bash
   npm run build
   ```

2. **Deploy build folder** to your web server

3. **Update Flask backend** to serve the React build files

## 🔄 Migration from Old Frontend

To migrate from your current Flask templates:

1. **Keep Flask backend** as-is
2. **Replace templates** with this React frontend
3. **Update Flask routes** to serve React build files
4. **Test wallet integration** thoroughly

## 📚 Resources

- [RainbowKit Documentation](https://www.rainbowkit.com/)
- [Wagmi Documentation](https://wagmi.sh/)
- [WalletConnect Documentation](https://docs.walletconnect.com/)
- [SIWE Specification](https://docs.login.xyz/)