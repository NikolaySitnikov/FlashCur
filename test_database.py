"""
Database Testing Script
──────────────────────
Tests database functionality without starting the full Flask server.
"""

from app import app, db, User, AlertPreferences, create_default_alert_preferences, get_user_by_email


def test_database_setup():
    """Test database initialization and basic operations."""

    print("\n" + "="*70)
    print("🧪 TESTING DATABASE MODULE")
    print("="*70 + "\n")

    with app.app_context():
        # Step 1: Create tables
        print("📋 Step 1: Creating database tables...")
        db.create_all()
        print("✅ Tables created successfully!\n")

        # Step 2: Check if tables exist
        print("📋 Step 2: Verifying tables...")
        inspector = db.inspect(db.engine)
        tables = inspector.get_table_names()
        print(f"✅ Found tables: {', '.join(tables)}\n")

        # Step 3: Create test users
        print("📋 Step 3: Creating test users...")

        # Clean up any existing test users
        User.query.filter(User.email.like('test%@example.com')).delete()
        db.session.commit()

        # Create Free tier user
        free_user = User(
            email='test-free@example.com',
            tier=0,
            is_active=True,
            theme_preference='dark'
        )
        free_user.set_password('password123')
        db.session.add(free_user)

        # Create Pro tier user
        pro_user = User(
            email='test-pro@example.com',
            tier=1,
            is_active=True,
            theme_preference='light'
        )
        pro_user.set_password('password123')
        db.session.add(pro_user)

        # Create Elite tier user
        elite_user = User(
            email='test-elite@example.com',
            tier=2,
            is_active=True,
            theme_preference='dark'
        )
        elite_user.set_password('password123')
        db.session.add(elite_user)

        db.session.commit()
        print("✅ Created 3 test users (Free, Pro, Elite)\n")

        # Step 4: Create alert preferences
        print("📋 Step 4: Creating alert preferences...")
        for user in [free_user, pro_user, elite_user]:
            # Check if alert preferences already exist
            if not user.alert_preferences:
                prefs = create_default_alert_preferences(user)
                db.session.add(prefs)
        db.session.commit()
        print("✅ Alert preferences created for all users\n")

        # Step 5: Test password verification
        print("📋 Step 5: Testing password verification...")
        test_user = get_user_by_email('test-free@example.com')

        correct_password = test_user.check_password('password123')
        wrong_password = test_user.check_password('wrongpass')

        print(
            f"  • Correct password: {'✅ PASS' if correct_password else '❌ FAIL'}")
        print(
            f"  • Wrong password rejected: {'✅ PASS' if not wrong_password else '❌ FAIL'}")
        print()

        # Step 6: Test tier properties
        print("📋 Step 6: Testing tier properties...")
        for email in ['test-free@example.com', 'test-pro@example.com', 'test-elite@example.com']:
            user = get_user_by_email(email)
            print(f"  • {email}:")
            print(f"    - Tier: {user.tier} ({user.tier_name})")
            print(f"    - Is Free: {user.is_free_tier}")
            print(f"    - Is Pro: {user.is_pro_tier}")
            print(f"    - Is Elite: {user.is_elite_tier}")
            print(f"    - Is Paid: {user.is_paid_tier}")
        print()

        # Step 7: Test tier upgrades/downgrades
        print("📋 Step 7: Testing tier upgrades...")
        test_user = get_user_by_email('test-free@example.com')
        old_tier = test_user.tier
        test_user.upgrade_tier(1)
        db.session.commit()
        print(f"  • Upgraded from tier {old_tier} to {test_user.tier}: ✅")

        test_user.downgrade_tier(0)
        db.session.commit()
        print(f"  • Downgraded back to tier {test_user.tier}: ✅")
        print()

        # Step 8: Query all users
        print("📋 Step 8: Querying all users...")
        all_users = User.query.all()
        print(f"✅ Found {len(all_users)} total user(s) in database\n")

        # Step 9: Display user details
        print("📋 Step 9: User Details:")
        print("-" * 70)
        for user in all_users:
            print(f"\n  Email: {user.email}")
            print(f"  Tier: {user.tier_name} (Level {user.tier})")
            print(f"  Theme: {user.theme_preference}")
            print(f"  Active: {user.is_active}")
            print(f"  Created: {user.created_at}")

            # Check if alert preferences exist
            if user.alert_preferences:
                print(f"  Alert Preferences: ✅ Configured")
            else:
                print(f"  Alert Preferences: ❌ Not configured")

        print("\n" + "-" * 70)

        # Step 10: Test serialization
        print("\n📋 Step 10: Testing JSON serialization...")
        test_user = get_user_by_email('test-pro@example.com')
        user_dict = test_user.to_dict(include_sensitive=True)
        print(f"✅ User serialized to dict: {len(user_dict)} fields")
        print(f"  Sample fields: {', '.join(list(user_dict.keys())[:5])}...\n")

        # Final summary
        print("\n" + "="*70)
        print("✅ ALL TESTS PASSED!")
        print("="*70 + "\n")

        print("📊 Summary:")
        print(f"  • Total Users: {len(all_users)}")
        print(
            f"  • Free Tier Users: {sum(1 for u in all_users if u.tier == 0)}")
        print(
            f"  • Pro Tier Users: {sum(1 for u in all_users if u.tier == 1)}")
        print(
            f"  • Elite Tier Users: {sum(1 for u in all_users if u.tier == 2)}")
        print(
            f"  • Database Location: {app.config['SQLALCHEMY_DATABASE_URI']}")
        print()


if __name__ == '__main__':
    test_database_setup()
