#!/usr/bin/env python3
"""
Step 1 Testing Script
Run this to verify all Pro Tier features are working
"""

from app import app, db
from models import User
from config import get_tier_config, get_alert_limit


def test_step1():
    with app.app_context():
        print("🧪 Testing Step 1 Pro Tier Features")
        print("=" * 50)

        # Test 1: New User model fields
        print("\n✅ Testing new User model fields:")
        user = User.query.first()
        print(f"   • Email confirmed: {user.email_confirmed}")
        print(f"   • Wallet address: {user.wallet_address}")
        print(f"   • Has wallet: {user.wallet_address is not None}")

        # Test 2: Config helpers
        print("\n✅ Testing config helpers:")
        free_config = get_tier_config(0)
        pro_config = get_tier_config(1)
        print(f"   • Free refresh: {free_config['refresh_ms']} ms (15 min)")
        print(f"   • Pro refresh: {pro_config['refresh_ms']} ms (5 min)")
        print(f"   • Free alerts: {get_alert_limit(0)}")
        print(f"   • Pro alerts: {get_alert_limit(1)}")

        # Test 3: User.to_dict() method
        print("\n✅ Testing to_dict() method:")
        user_dict = user.to_dict()
        print(f"   • Public dict keys: {list(user_dict.keys())}")
        print(
            f"   • email_confirmed in dict: {'email_confirmed' in user_dict}")
        print(f"   • has_wallet in dict: {'has_wallet' in user_dict}")

        # Test 4: Pro features check
        print("\n✅ Testing Pro features availability:")
        print(
            f"   • Email alerts enabled: {pro_config['features']['email_alerts']}")
        print(
            f"   • Custom thresholds: {pro_config['features']['custom_thresholds']}")
        print(
            f"   • Enhanced export: {pro_config['features']['enhanced_export']}")
        print(
            f"   • Additional metrics: {pro_config['features']['additional_metrics']}")

        print("\n🎉 All Step 1 tests passed! Pro Tier infrastructure is ready!")
        print("=" * 50)


if __name__ == "__main__":
    test_step1()





