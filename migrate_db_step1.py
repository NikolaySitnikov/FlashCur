"""
Database Migration Script - Step 1: Pro Tier Prep
──────────────────────────────────────────────────
Adds new columns to User model for Pro tier features:
- email_confirmed (Boolean)
- email_confirmed_at (DateTime)
- wallet_address (String)
- wallet_nonce (String)

Run this script to migrate existing databases.
"""

from app import app, db
from models import User
from sqlalchemy import inspect, text


def check_column_exists(table_name, column_name):
    """Check if a column exists in a table."""
    with app.app_context():
        inspector = inspect(db.engine)
        columns = [col['name'] for col in inspector.get_columns(table_name)]
        return column_name in columns


def migrate_database():
    """Add new columns to users table if they don't exist."""
    with app.app_context():
        print("🔄 Starting database migration for Pro Tier features...")
        print()

        # Get table name
        table_name = User.__tablename__

        # Check and add email_confirmed column
        if not check_column_exists(table_name, 'email_confirmed'):
            print(f"➕ Adding 'email_confirmed' column to {table_name}...")
            with db.engine.connect() as conn:
                # SQLite syntax
                conn.execute(text(
                    f"ALTER TABLE {table_name} ADD COLUMN email_confirmed BOOLEAN DEFAULT 0 NOT NULL"))
                conn.commit()
            print("   ✅ Added email_confirmed column")
        else:
            print(f"✓  'email_confirmed' column already exists")

        # Check and add email_confirmed_at column
        if not check_column_exists(table_name, 'email_confirmed_at'):
            print(f"➕ Adding 'email_confirmed_at' column to {table_name}...")
            with db.engine.connect() as conn:
                conn.execute(
                    text(f"ALTER TABLE {table_name} ADD COLUMN email_confirmed_at DATETIME"))
                conn.commit()
            print("   ✅ Added email_confirmed_at column")
        else:
            print(f"✓  'email_confirmed_at' column already exists")

        # Check and add wallet_address column
        if not check_column_exists(table_name, 'wallet_address'):
            print(f"➕ Adding 'wallet_address' column to {table_name}...")
            with db.engine.connect() as conn:
                # SQLite doesn't support adding UNIQUE columns directly, add without UNIQUE first
                conn.execute(
                    text(f"ALTER TABLE {table_name} ADD COLUMN wallet_address VARCHAR(42)"))
                conn.commit()
            print(
                "   ✅ Added wallet_address column (unique constraint will be enforced by SQLAlchemy)")
        else:
            print(f"✓  'wallet_address' column already exists")

        # Check and add wallet_nonce column
        if not check_column_exists(table_name, 'wallet_nonce'):
            print(f"➕ Adding 'wallet_nonce' column to {table_name}...")
            with db.engine.connect() as conn:
                conn.execute(
                    text(f"ALTER TABLE {table_name} ADD COLUMN wallet_nonce VARCHAR(64)"))
                conn.commit()
            print("   ✅ Added wallet_nonce column")
        else:
            print(f"✓  'wallet_nonce' column already exists")

        print()
        print("🎉 Migration completed successfully!")
        print()

        # Set email_confirmed=True for all existing users (grandfathering)
        print("📝 Setting email_confirmed=True for all existing users (grandfathering)...")
        users_updated = User.query.filter_by(
            email_confirmed=False).update({'email_confirmed': True})
        db.session.commit()
        print(f"   ✅ Updated {users_updated} existing user(s)")
        print()

        # Display summary
        print("📊 Migration Summary:")
        total_users = User.query.count()
        confirmed_users = User.query.filter_by(email_confirmed=True).count()
        wallet_users = User.query.filter(
            User.wallet_address.isnot(None)).count()

        print(f"   • Total users: {total_users}")
        print(f"   • Email confirmed: {confirmed_users}")
        print(f"   • With wallet: {wallet_users}")
        print()
        print("✅ Database is ready for Pro Tier features!")


if __name__ == '__main__':
    try:
        migrate_database()
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()
