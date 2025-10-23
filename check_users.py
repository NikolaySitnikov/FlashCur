#!/usr/bin/env python3
"""
Check and create test users for VolSpike
Run this to verify database users and create test accounts if needed
"""

from models import User
from app import app, db
import os
import sys
from flask import Flask
from werkzeug.security import generate_password_hash

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


def check_and_create_users():
    """Check existing users and create test accounts if needed"""

    with app.app_context():
        print("🔍 Checking database users...")

        # Check if users table exists
        try:
            users = User.query.all()
            print(f"📊 Found {len(users)} users in database")

            if users:
                print("\n👥 Existing users:")
                for user in users:
                    print(
                        f"  - {user.email} (Tier: {user.tier}, Active: {user.is_active})")
            else:
                print("❌ No users found in database")

        except Exception as e:
            print(f"❌ Database error: {e}")
            return False

        # Create test accounts if they don't exist
        test_accounts = [
            {"email": "test-free@example.com", "tier": 0, "password": "password123"},
            {"email": "test-pro@example.com", "tier": 1, "password": "password123"},
            {"email": "test-elite@example.com",
                "tier": 2, "password": "password123"},
        ]

        print("\n🔧 Creating test accounts...")
        created_count = 0

        for account in test_accounts:
            existing_user = User.query.filter_by(
                email=account["email"]).first()

            if existing_user:
                print(f"  ✅ {account['email']} already exists")
            else:
                try:
                    new_user = User(
                        email=account["email"],
                        password_hash=generate_password_hash(
                            account["password"]),
                        tier=account["tier"],
                        is_active=True,
                        email_confirmed=True  # Auto-confirm test accounts
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
                    f"\n✅ Successfully created {created_count} test accounts")
            except Exception as e:
                print(f"❌ Failed to commit changes: {e}")
                db.session.rollback()
                return False

        # Final check
        final_users = User.query.all()
        print(f"\n📊 Final user count: {len(final_users)}")

        return True


if __name__ == "__main__":
    print("🚀 VolSpike User Checker")
    print("=" * 50)

    success = check_and_create_users()

    if success:
        print("\n✅ Database check completed successfully!")
        print("\n🔑 Test account credentials:")
        print("  Free:  test-free@example.com / password123")
        print("  Pro:   test-pro@example.com / password123")
        print("  Elite: test-elite@example.com / password123")
    else:
        print("\n❌ Database check failed!")
        sys.exit(1)
