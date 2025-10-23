#!/usr/bin/env python3
"""
Database Migration: Add Settings/Preferences Support
===================================================
Adds preferences JSON column to users table for Pro tier customization.
"""

import sqlite3
import os
import sys
from pathlib import Path


def migrate_database():
    """Add preferences column to users table."""

    # Get database path
    db_path = Path(__file__).parent / "instance" / "binance_dashboard.db"

    if not db_path.exists():
        print("❌ Database not found. Please run the main app first to create the database.")
        return False

    try:
        # Connect to database
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()

        print("🔍 Checking if preferences column exists...")

        # Check if column already exists
        cursor.execute("PRAGMA table_info(users)")
        columns = [column[1] for column in cursor.fetchall()]

        if 'preferences' in columns:
            print("✅ Preferences column already exists. Migration not needed.")
            return True

        print("📝 Adding preferences column to users table...")

        # Add preferences column
        cursor.execute("ALTER TABLE users ADD COLUMN preferences TEXT")

        # Commit changes
        conn.commit()

        print("✅ Successfully added preferences column!")
        print("✅ Database migration completed successfully!")

        return True

    except Exception as e:
        print(f"❌ Migration failed: {e}")
        return False

    finally:
        if 'conn' in locals():
            conn.close()


if __name__ == "__main__":
    print("🚀 Starting Settings Database Migration...")
    print("=" * 50)

    success = migrate_database()

    if success:
        print("=" * 50)
        print("🎉 Migration completed successfully!")
        print("✅ Pro users can now access settings page")
        print("✅ User preferences will be stored in JSON format")
    else:
        print("=" * 50)
        print("❌ Migration failed!")
        sys.exit(1)
