"""
Database Migration Script for Pro Tier Payment System
──────────────────────────────────────────────────────
Adds Subscription and AuditLog tables to existing database.

Usage:
    python migrate_payments_db.py
"""

from app import app, db
from models import Subscription, AuditLog
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def migrate_database():
    """Create new tables for payment system."""
    try:
        with app.app_context():
            # Create all tables (only creates missing ones)
            db.create_all()

            logger.info("✅ Database migration completed successfully!")
            logger.info("📊 New tables created:")
            logger.info(
                "   - subscriptions (for Stripe subscription tracking)")
            logger.info("   - audit_logs (for payment and security events)")

            # Verify tables exist
            from sqlalchemy import inspect
            inspector = inspect(db.engine)
            tables = inspector.get_table_names()

            logger.info("\n📋 Current database tables:")
            for table in sorted(tables):
                logger.info(f"   ✓ {table}")

            # Check if new tables were created
            if 'subscriptions' in tables and 'audit_logs' in tables:
                logger.info("\n✅ Payment system tables are ready!")
                logger.info("🎉 You can now accept payments via Stripe!")
                return True
            else:
                logger.error("\n❌ Failed to create payment tables")
                return False

    except Exception as e:
        logger.error(f"❌ Database migration failed: {e}")
        return False


if __name__ == '__main__':
    print("=" * 70)
    print("🗄️  Database Migration: Adding Payment System Tables")
    print("=" * 70)
    print()

    success = migrate_database()

    print()
    print("=" * 70)
    if success:
        print("✅ Migration completed successfully!")
        print()
        print("Next steps:")
        print("1. Configure Stripe API keys in .env file")
        print("2. Create products/prices in Stripe Dashboard")
        print("3. Test payment flow with test cards")
        print("4. Set up webhook endpoint in Stripe Dashboard")
    else:
        print("❌ Migration failed. Check error messages above.")
    print("=" * 70)

