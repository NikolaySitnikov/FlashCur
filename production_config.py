"""
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
