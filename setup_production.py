#!/usr/bin/env python3
"""
VolSpike Production Setup Script
This script helps configure VolSpike for production deployment on volspike.com
"""

import os
import sys
import secrets
import string


def generate_secret_key():
    """Generate a secure secret key for Flask"""
    return ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(50))


def create_production_env():
    """Create production environment file"""
    secret_key = generate_secret_key()

    env_content = f"""# VolSpike Production Environment Variables
# Generated on: {__import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

# Flask Configuration
FLASK_ENV=production
SECRET_KEY={secret_key}
DEBUG=False

# Database Configuration
# Replace with your production database URL
DATABASE_URL=postgresql://username:password@host:port/database_name

# Email Configuration
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USE_TLS=True
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password

# Stripe Configuration (Live Keys)
STRIPE_PUBLISHABLE_KEY=pk_live_your_live_stripe_key
STRIPE_SECRET_KEY=sk_live_your_live_stripe_secret
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Domain Configuration
DOMAIN=volspike.com
SERVER_NAME=volspike.com

# Binance API (Optional)
BINANCE_API_KEY=your_binance_api_key
BINANCE_SECRET_KEY=your_binance_secret_key

# Security
WTF_CSRF_ENABLED=True
SESSION_COOKIE_SECURE=True
SESSION_COOKIE_HTTPONLY=True
SESSION_COOKIE_SAMESITE='Lax'

# CORS Configuration
CORS_ORIGINS=https://volspike.com,https://www.volspike.com
"""

    with open('.env.production', 'w') as f:
        f.write(env_content)

    print("✅ Created .env.production file")
    print("⚠️  IMPORTANT: Update the database URL and email credentials before deploying!")


def create_requirements():
    """Create production requirements file"""
    requirements = """# VolSpike Production Requirements
Flask==2.3.3
Flask-SQLAlchemy==3.0.5
Flask-Login==0.6.3
Flask-WTF==1.1.1
Flask-Mail==0.9.1
Flask-CORS==4.0.0
Werkzeug==2.3.7
WTForms==3.0.1
SQLAlchemy==2.0.21
psycopg2-binary==2.9.7
stripe==6.7.0
requests==2.31.0
python-dotenv==1.0.0
gunicorn==21.2.0
"""

    with open('requirements.production.txt', 'w') as f:
        f.write(requirements)

    print("✅ Created requirements.production.txt")


def create_production_config():
    """Create production configuration"""
    config_content = '''"""
VolSpike Production Configuration
"""
import os
from config import Config

class ProductionConfig(Config):
    """Production configuration for VolSpike"""
    
    # Basic Flask settings
    DEBUG = False
    TESTING = False
    
    # Security
    SECRET_KEY = os.environ.get('SECRET_KEY')
    WTF_CSRF_ENABLED = True
    
    # Database
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL')
    
    # Email
    MAIL_SERVER = os.environ.get('MAIL_SERVER')
    MAIL_PORT = int(os.environ.get('MAIL_PORT', 587))
    MAIL_USE_TLS = os.environ.get('MAIL_USE_TLS', 'True').lower() == 'true'
    MAIL_USERNAME = os.environ.get('MAIL_USERNAME')
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD')
    
    # Stripe
    STRIPE_PUBLISHABLE_KEY = os.environ.get('STRIPE_PUBLISHABLE_KEY')
    STRIPE_SECRET_KEY = os.environ.get('STRIPE_SECRET_KEY')
    STRIPE_WEBHOOK_SECRET = os.environ.get('STRIPE_WEBHOOK_SECRET')
    
    # Domain
    DOMAIN = os.environ.get('DOMAIN', 'volspike.com')
    SERVER_NAME = os.environ.get('SERVER_NAME', 'volspike.com')
    
    # CORS
    CORS_ORIGINS = [
        'https://volspike.com',
        'https://www.volspike.com'
    ]
    
    # Session security
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
'''

    with open('production_config.py', 'w') as f:
        f.write(config_content)

    print("✅ Created production_config.py")


def create_deployment_script():
    """Create deployment script"""
    script_content = '''#!/bin/bash
# VolSpike Deployment Script

echo "🚀 Starting VolSpike deployment..."

# Install dependencies
echo "📦 Installing dependencies..."
pip install -r requirements.production.txt

# Set environment
echo "🔧 Setting up environment..."
export FLASK_ENV=production

# Run database migrations
echo "🗄️ Running database migrations..."
python migrate_db_step1.py
python migrate_payments_db.py
python migrate_settings_db.py

# Start the application
echo "🌟 Starting VolSpike..."
gunicorn --bind 0.0.0.0:$PORT --workers 4 --timeout 120 app:app

echo "✅ VolSpike deployment complete!"
'''

    with open('deploy.sh', 'w') as f:
        f.write(script_content)

    os.chmod('deploy.sh', 0o755)
    print("✅ Created deploy.sh")


def main():
    """Main setup function"""
    print("🎯 VolSpike Production Setup")
    print("=" * 40)

    # Create production files
    create_production_env()
    create_requirements()
    create_production_config()
    create_deployment_script()

    print("\n📋 Next Steps:")
    print("1. Update .env.production with your actual credentials")
    print("2. Choose a hosting platform (Railway, Render, DigitalOcean)")
    print("3. Configure your domain in CloudFlare")
    print("4. Deploy using the deployment guide")
    print("\n📖 See VOLSPIKE_DEPLOYMENT_GUIDE.md for detailed instructions")

    print("\n🔐 Security Reminders:")
    print("- Use strong, unique passwords")
    print("- Enable 2FA on all accounts")
    print("- Use environment variables for secrets")
    print("- Enable HTTPS/SSL")
    print("- Regular security updates")


if __name__ == "__main__":
    main()
