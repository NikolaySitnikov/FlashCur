#!/usr/bin/env python3
"""
Clean Database - Remove All Non-Test Users
═══════════════════════════════════════════
Removes all user accounts and related data except test accounts.
Test accounts are identified by email domains: @test.com, @example.com

Usage:
    python clean_database.py           # Interactive mode with confirmation
    python clean_database.py --force   # Skip confirmation (auto-delete)
"""

import sys
from app import app
from models import db, User, AlertPreferences, Subscription, AuditLog

# Define test email domains/patterns to keep
TEST_PATTERNS = [
    '@test.com',
    '@example.com',
    'test@',
    'admin@'
]


def is_test_account(email: str) -> bool:
    """Check if email is a test account."""
    email_lower = email.lower()
    return any(pattern.lower() in email_lower for pattern in TEST_PATTERNS)


def clean_database(force=False):
    """Remove all non-test users and their related data."""

    with app.app_context():
        print("\n" + "="*70)
        print("🧹 DATABASE CLEANUP - Starting")
        print("="*70)

        # Get all users
        all_users = User.query.all()

        print(f"\n📊 Found {len(all_users)} total user(s) in database")

        # Separate test and non-test users
        test_users = [u for u in all_users if is_test_account(u.email)]
        users_to_delete = [
            u for u in all_users if not is_test_account(u.email)]

        print(f"\n✅ Test accounts to KEEP: {len(test_users)}")
        for user in test_users:
            print(f"   - {user.email} (Tier: {user.tier_name})")

        print(f"\n❌ Accounts to DELETE: {len(users_to_delete)}")
        for user in users_to_delete:
            print(
                f"   - {user.email} (Tier: {user.tier_name}, Wallet: {user.wallet_address or 'None'})")

        if not users_to_delete:
            print("\n✨ Database is already clean! No users to delete.")
            return

        # Confirm deletion (skip if force flag is set)
        if not force:
            print("\n" + "="*70)
            response = input(
                f"⚠️  Are you sure you want to DELETE {len(users_to_delete)} user(s)? (yes/no): ")

            if response.lower() != 'yes':
                print("\n❌ Cleanup cancelled.")
                return
        else:
            print("\n🔥 Force mode enabled - proceeding with deletion...")

        print("\n🗑️  Starting deletion process...")

        deleted_count = 0
        deleted_subscriptions = 0
        deleted_alert_prefs = 0
        deleted_audit_logs = 0

        for user in users_to_delete:
            try:
                # Count and delete related data
                user_id = user.id
                user_email = user.email

                # Delete subscriptions
                subs = Subscription.query.filter_by(user_id=user_id).all()
                for sub in subs:
                    db.session.delete(sub)
                    deleted_subscriptions += 1

                # Delete audit logs
                logs = AuditLog.query.filter_by(user_id=user_id).all()
                for log in logs:
                    db.session.delete(log)
                    deleted_audit_logs += 1

                # AlertPreferences will be cascade-deleted automatically
                if user.alert_preferences:
                    deleted_alert_prefs += 1

                # Delete user (will cascade-delete alert_preferences)
                db.session.delete(user)
                deleted_count += 1

                print(f"   ✓ Deleted: {user_email}")

            except Exception as e:
                print(f"   ✗ Error deleting {user.email}: {str(e)}")
                db.session.rollback()
                continue

        # Commit all deletions
        try:
            db.session.commit()
            print("\n" + "="*70)
            print("✅ CLEANUP COMPLETE!")
            print("="*70)
            print(f"\n📊 Summary:")
            print(f"   - Users deleted: {deleted_count}")
            print(f"   - Subscriptions deleted: {deleted_subscriptions}")
            print(f"   - Alert preferences deleted: {deleted_alert_prefs}")
            print(f"   - Audit logs deleted: {deleted_audit_logs}")
            print(f"\n   - Test accounts remaining: {len(test_users)}")

            # Show remaining users
            remaining_users = User.query.all()
            print(f"\n📋 Remaining users in database: {len(remaining_users)}")
            for user in remaining_users:
                print(f"   - {user.email} (Tier: {user.tier_name})")

        except Exception as e:
            db.session.rollback()
            print(f"\n❌ Error committing changes: {str(e)}")
            sys.exit(1)


if __name__ == '__main__':
    try:
        # Check for --force flag
        force_mode = '--force' in sys.argv or '-f' in sys.argv
        clean_database(force=force_mode)
    except KeyboardInterrupt:
        print("\n\n❌ Cleanup interrupted by user.")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {str(e)}")
        sys.exit(1)
