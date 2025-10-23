#!/usr/bin/env python3
"""
Check Railway database users
This script will run on Railway to check the production database
"""

from models import User
from app import app, db
import os
import sys
from flask import Flask
from werkzeug.security import generate_password_hash

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


def check_railway_users():
    """Check users in Railway production database"""

    with app.app_context():
        print("🔍 Checking Railway production database...")
        print(f"Database URI: {app.config.get('DATABASE_URI', 'Not set')}")

        try:
            # Check if users table exists
            users = User.query.all()
            print(f"📊 Found {len(users)} users in Railway database")

            if users:
                print("\n👥 Railway users:")
                for user in users:
                    print(
                        f"  - {user.email} (Tier: {user.tier}, Active: {user.is_active})")
            else:
                print("❌ No users found in Railway database")
                print("🔧 Creating test accounts...")

                # Create test accounts
                test_accounts = [
                    {"email": "test-free@example.com",
                        "tier": 0, "password": "password123"},
                    {"email": "test-pro@example.com",
                        "tier": 1, "password": "password123"},
                    {"email": "test-elite@example.com",
                        "tier": 2, "password": "password123"},
                ]

                created_count = 0
                for account in test_accounts:
                    try:
                        new_user = User(
                            email=account["email"],
                            password_hash=generate_password_hash(
                                account["password"]),
                            tier=account["tier"],
                            is_active=True,
                            email_confirmed=True
                        )
                        db.session.add(new_user)
                        created_count += 1
                        print(
                            f"  ➕ Created {account['email']} (Tier {account['tier']})")
                    except Exception as e:
                        print(f"  ❌ Failed to create {account['email']}: {e}")

                if created_count > 0:
                    try:
                        db.session.commit()
                        print(
                            f"✅ Successfully created {created_count} test accounts")
                    except Exception as e:
                        print(f"❌ Failed to commit: {e}")
                        db.session.rollback()
                        return False

        except Exception as e:
            print(f"❌ Database error: {e}")
            return False

        return True


if __name__ == "__main__":
    print("🚀 Railway Database Checker")
    print("=" * 50)

    success = check_railway_users()

    if success:
        print("\n✅ Railway database check completed!")
    else:
        print("\n❌ Railway database check failed!")
        sys.exit(1)
