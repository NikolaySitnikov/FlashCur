#!/usr/bin/env python3
"""
Populate Railway database with test users
This script creates the necessary users for VolSpike production
"""

import os
import sys
from flask import Flask
from werkzeug.security import generate_password_hash

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from models import User
from app import app, db

def populate_railway_database():
    """Create test users in Railway production database"""
    
    with app.app_context():
        print("🚀 Populating Railway database...")
        print(f"Database URI: {app.config.get('DATABASE_URI', 'Not set')}")
        
        try:
            # Create test accounts
            test_accounts = [
                {"email": "test-free@example.com", "tier": 0, "password": "password123"},
                {"email": "test-pro@example.com", "tier": 1, "password": "password123"},
                {"email": "test-elite@example.com", "tier": 2, "password": "password123"},
            ]
            
            created_count = 0
            
            for account in test_accounts:
                # Check if user already exists
                existing_user = User.query.filter_by(email=account["email"]).first()
                
                if existing_user:
                    print(f"  ✅ {account['email']} already exists")
                else:
                    try:
                        new_user = User(
                            email=account["email"],
                            password_hash=generate_password_hash(account["password"]),
                            tier=account["tier"],
                            is_active=True,
                            email_confirmed=True  # Auto-confirm test accounts
                        )
                        db.session.add(new_user)
                        created_count += 1
                        print(f"  ➕ Created {account['email']} (Tier {account['tier']})")
                    except Exception as e:
                        print(f"  ❌ Failed to create {account['email']}: {e}")
            
            if created_count > 0:
                try:
                    db.session.commit()
                    print(f"\n✅ Successfully created {created_count} test accounts")
                except Exception as e:
                    print(f"❌ Failed to commit changes: {e}")
                    db.session.rollback()
                    return False
            
            # Verify creation
            final_users = User.query.all()
            print(f"\n📊 Final user count: {len(final_users)}")
            
            if final_users:
                print("\n👥 Created users:")
                for user in final_users:
                    print(f"  - {user.email} (Tier: {user.tier}, Active: {user.is_active})")
            
            return True
            
        except Exception as e:
            print(f"❌ Database error: {e}")
            return False

if __name__ == "__main__":
    print("🚀 Railway Database Populator")
    print("=" * 50)
    
    success = populate_railway_database()
    
    if success:
        print("\n✅ Railway database populated successfully!")
        print("\n🔑 Test account credentials:")
        print("  Free:  test-free@example.com / password123")
        print("  Pro:   test-pro@example.com / password123")
        print("  Elite: test-elite@example.com / password123")
        print("\n🌐 You can now login at: https://volspike.com/login")
    else:
        print("\n❌ Failed to populate Railway database!")
        sys.exit(1)
