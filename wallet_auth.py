"""
Wallet Authentication Module for Binance Dashboard
──────────────────────────────────────────────────
Handles crypto wallet-based authentication (MetaMask, WalletConnect, etc.).
Provides secure, password-less sign-in via Ethereum signature verification.
"""

from flask import Blueprint, request, jsonify, session, redirect, url_for, render_template
from flask_login import login_user, current_user
from models import db, User, create_default_alert_preferences
from datetime import datetime, timezone
import secrets
import logging
import config

# Web3 for signature verification
try:
    from eth_account.messages import encode_defunct
    from web3 import Web3
    from web3.auto import w3 as web3_instance
    WEB3_AVAILABLE = True
except ImportError:
    WEB3_AVAILABLE = False
    logging.warning(
        "⚠️ Web3.py not installed. Wallet authentication disabled.")

# Solana signature verification
try:
    from nacl.signing import VerifyKey
    import base58
    SOLANA_AVAILABLE = True
except ImportError:
    SOLANA_AVAILABLE = False
    logging.warning(
        "⚠️ PyNaCl or base58 not installed. Solana signature verification disabled.")

# Get logger
logger = logging.getLogger(__name__)

# Create wallet auth blueprint
wallet_bp = Blueprint('wallet', __name__, url_prefix='/wallet')

# ══════════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ══════════════════════════════════════════════════════════════════════════════


def is_valid_ethereum_address(address: str) -> bool:
    """
    Validate Ethereum address format.

    Args:
        address: Ethereum address to validate

    Returns:
        Boolean indicating if address is valid
    """
    if not WEB3_AVAILABLE:
        return False

    try:
        # Check if address is valid checksum address
        return Web3.is_address(address)
    except Exception:
        return False


def is_valid_solana_address(address: str) -> bool:
    """
    Validate Solana address format (base58, 32-44 characters).

    Args:
        address: Solana address to validate

    Returns:
        Boolean indicating if address is valid
    """
    try:
        # Solana addresses are base58 encoded, typically 32-44 characters
        if not address or len(address) < 32 or len(address) > 44:
            return False

        # Check if it's valid base58 (no 0, O, I, l)
        import re
        if not re.match(r'^[1-9A-HJ-NP-Za-km-z]+$', address):
            return False

        return True
    except Exception:
        return False


def is_valid_wallet_address(address: str, wallet_type: str = None) -> bool:
    """
    Validate wallet address based on type.

    Args:
        address: Wallet address to validate
        wallet_type: Type of wallet ('evm' or 'solana')

    Returns:
        Boolean indicating if address is valid
    """
    if wallet_type == 'solana':
        return is_valid_solana_address(address)
    elif wallet_type == 'evm':
        return is_valid_ethereum_address(address)
    else:
        # Try both if type unknown
        return is_valid_ethereum_address(address) or is_valid_solana_address(address)


def generate_nonce() -> str:
    """
    Generate a random nonce for signature verification.

    Returns:
        Random hex string (32 bytes)
    """
    return secrets.token_hex(32)


def verify_signature(address: str, message: str, signature: str) -> bool:
    """
    Verify that a signature was created by the owner of an address.

    Args:
        address: Ethereum address that supposedly signed the message
        message: Original message that was signed
        signature: Signature to verify

    Returns:
        Boolean indicating if signature is valid
    """
    if not WEB3_AVAILABLE:
        logger.error("❌ Web3 not available - cannot verify signature")
        return False

    try:
        # Encode message (EIP-191 standard)
        message_hash = encode_defunct(text=message)

        # Recover address from signature
        recovered_address = Web3().eth.account.recover_message(
            message_hash,
            signature=signature
        )

        # Compare addresses (case-insensitive)
        return recovered_address.lower() == address.lower()

    except Exception as e:
        logger.error(f"❌ Signature verification failed: {str(e)}")
        return False


def verify_solana_signature(address: str, message: str, signature: str) -> bool:
    """
    Verify that a Solana signature was created by the owner of an address.

    Args:
        address: Solana address that supposedly signed the message
        message: Original message that was signed
        signature: Signature to verify (hex string from frontend)

    Returns:
        Boolean indicating if signature is valid
    """
    if not SOLANA_AVAILABLE:
        logger.error("❌ PyNaCl not available - cannot verify Solana signature")
        return False

    try:
        # Convert hex signature to bytes
        signature_bytes = bytes.fromhex(signature)

        # Convert address to public key bytes using base58
        public_key_bytes = base58.b58decode(address)

        # Create verify key
        verify_key = VerifyKey(public_key_bytes)

        # Verify signature
        verify_key.verify(message.encode('utf-8'), signature_bytes)

        return True

    except Exception as e:
        logger.error(f"❌ Solana signature verification failed: {str(e)}")
        return False


def verify_wallet_signature(address: str, message: str, signature: str, wallet_type: str) -> bool:
    """
    Verify wallet signature based on type.

    Args:
        address: Wallet address that supposedly signed the message
        message: Original message that was signed
        signature: Signature to verify
        wallet_type: Type of wallet ('evm' or 'solana')

    Returns:
        Boolean indicating if signature is valid
    """
    if wallet_type == 'solana':
        return verify_solana_signature(address, message, signature)
    elif wallet_type == 'evm':
        return verify_signature(address, message, signature)
    else:
        # Try both if type unknown
        return verify_signature(address, message, signature) or verify_solana_signature(address, message, signature)


# ══════════════════════════════════════════════════════════════════════════════
# WALLET AUTHENTICATION ROUTES
# ══════════════════════════════════════════════════════════════════════════════

@wallet_bp.route('/check-availability')
def check_availability():
    """
    Check if wallet authentication is available.

    Returns:
        JSON response with availability status
    """
    return jsonify({
        'available': WEB3_AVAILABLE,
        'message': 'Wallet authentication ready' if WEB3_AVAILABLE else 'Web3 not installed'
    })


@wallet_bp.route('/request-nonce', methods=['POST'])
def request_nonce():
    """
    Request a nonce for wallet signature.
    User provides their wallet address, we return a nonce to sign.

    Expected JSON:
        {
            "address": "0x1234..."
        }

    Returns:
        JSON with nonce and message to sign
    """
    if not WEB3_AVAILABLE:
        return jsonify({
            'success': False,
            'error': 'Wallet authentication not available'
        }), 503

    try:
        data = request.get_json()
        address = data.get('address', '').strip()
        wallet_type = data.get('wallet_type', 'evm').strip().lower()

        # Validate address format
        if not address:
            return jsonify({
                'success': False,
                'error': 'Address is required'
            }), 400

        if not is_valid_wallet_address(address, wallet_type):
            error_msg = f'Invalid {wallet_type.upper()} address format'
            return jsonify({
                'success': False,
                'error': error_msg
            }), 400

        # Normalize address based on type
        if wallet_type == 'evm':
            address = Web3.to_checksum_address(address)
        # Solana addresses don't need normalization

        # Generate nonce
        nonce = generate_nonce()

        # Create message to sign
        message = config.WALLET_SIGN_MESSAGE.format(nonce=nonce)

        # Store nonce temporarily in session (expires when browser closes)
        session['wallet_nonce'] = nonce
        session['wallet_address'] = address
        session['wallet_type'] = wallet_type

        logger.info(f"🔑 Nonce requested for wallet: {address[:10]}...")

        return jsonify({
            'success': True,
            'address': address,
            'nonce': nonce,
            'message': message
        })

    except Exception as e:
        logger.error(f"❌ Error in request_nonce: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Server error: {str(e)}'
        }), 500


@wallet_bp.route('/verify-signature', methods=['POST'])
def verify_signature_route():
    """
    Verify wallet signature and log user in.

    Expected JSON:
        {
            "address": "0x1234...",
            "signature": "0xabcd..."
        }

    Returns:
        JSON with authentication result
    """
    if not WEB3_AVAILABLE:
        return jsonify({
            'success': False,
            'error': 'Wallet authentication not available'
        }), 503

    try:
        data = request.get_json()
        address = data.get('address', '').strip()
        signature = data.get('signature', '').strip()
        wallet_type = data.get('wallet_type', 'evm').strip().lower()

        # Validate inputs
        if not address or not signature:
            return jsonify({
                'success': False,
                'error': 'Address and signature are required'
            }), 400

        # Normalize address based on type
        if wallet_type == 'evm':
            address = Web3.to_checksum_address(address)
        # Solana addresses don't need normalization

        # Get nonce from session
        stored_nonce = session.get('wallet_nonce')
        stored_address = session.get('wallet_address')
        stored_wallet_type = session.get('wallet_type', 'evm')

        if not stored_nonce or not stored_address:
            return jsonify({
                'success': False,
                'error': 'Session expired. Please request a new nonce.'
            }), 400

        # Verify address matches
        if stored_address.lower() != address.lower():
            return jsonify({
                'success': False,
                'error': 'Address mismatch'
            }), 400

        # Use stored wallet type
        wallet_type = stored_wallet_type

        # Reconstruct message that was signed
        message = config.WALLET_SIGN_MESSAGE.format(nonce=stored_nonce)

        # Verify signature based on wallet type
        if not verify_wallet_signature(address, message, signature, wallet_type):
            logger.warning(
                f"⚠️ Invalid {wallet_type} signature for wallet: {address[:10]}...")
            return jsonify({
                'success': False,
                'error': 'Invalid signature. Please try again.'
            }), 401

        # Signature is valid! Find or create user
        user = User.query.filter_by(wallet_address=address).first()

        if not user:
            # Create new user with wallet address
            logger.info(f"✨ Creating new user for wallet: {address[:10]}...")

            user = User(
                # Dummy email for wallet users
                email=f"{address.lower()}@wallet.local",
                wallet_address=address,
                tier=config.TIERS['free'],
                is_active=True,
                email_confirmed=True,  # Wallet users don't need email confirmation
                email_confirmed_at=datetime.now(timezone.utc),
                theme_preference='dark'
            )
            # Set a random password (won't be used, but required by model)
            user.set_password(secrets.token_hex(32))

            # Save to database
            db.session.add(user)
            db.session.commit()

            # Create default alert preferences
            alert_prefs = create_default_alert_preferences(user)
            db.session.add(alert_prefs)
            db.session.commit()

            logger.info(f"✅ New wallet user created: {address[:10]}...")

        # Log user in
        login_user(user, remember=True)

        # Clear nonce from session (one-time use)
        session.pop('wallet_nonce', None)
        session.pop('wallet_address', None)
        session.pop('wallet_type', None)

        logger.info(
            f"✅ Wallet login successful: {address[:10]}... (Tier: {user.tier_name})")

        return jsonify({
            'success': True,
            'message': 'Authentication successful!',
            'user': {
                'wallet_address': address,
                'tier': user.tier,
                'tier_name': user.tier_name,
                'is_new': user.created_at > datetime.now(timezone.utc).replace(tzinfo=None) if user.created_at.tzinfo is None else user.created_at > datetime.now(timezone.utc)
            },
            'redirect': url_for('index')
        })

    except Exception as e:
        logger.error(f"❌ Error in verify_signature: {str(e)}")
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': f'Server error: {str(e)}'
        }), 500


@wallet_bp.route('/link-wallet', methods=['POST'])
def link_wallet():
    """
    Link a wallet address to an existing user account (email/password login).
    User must be logged in to use this endpoint.

    Expected JSON:
        {
            "address": "0x1234...",
            "signature": "0xabcd..."
        }

    Returns:
        JSON with link result
    """
    if not current_user.is_authenticated:
        return jsonify({
            'success': False,
            'error': 'You must be logged in to link a wallet'
        }), 401

    if not WEB3_AVAILABLE:
        return jsonify({
            'success': False,
            'error': 'Wallet authentication not available'
        }), 503

    try:
        data = request.get_json()
        address = data.get('address', '').strip()
        signature = data.get('signature', '').strip()

        # Validate inputs
        if not address or not signature:
            return jsonify({
                'success': False,
                'error': 'Address and signature are required'
            }), 400

        # Normalize address
        address = Web3.to_checksum_address(address)

        # Check if wallet is already linked to another user
        existing_user = User.query.filter_by(wallet_address=address).first()
        if existing_user and existing_user.id != current_user.id:
            return jsonify({
                'success': False,
                'error': 'This wallet is already linked to another account'
            }), 400

        # Get nonce from session
        stored_nonce = session.get('wallet_nonce')
        stored_address = session.get('wallet_address')

        if not stored_nonce or not stored_address:
            return jsonify({
                'success': False,
                'error': 'Session expired. Please request a new nonce.'
            }), 400

        # Verify address matches
        if stored_address.lower() != address.lower():
            return jsonify({
                'success': False,
                'error': 'Address mismatch'
            }), 400

        # Reconstruct message
        message = config.WALLET_SIGN_MESSAGE.format(nonce=stored_nonce)

        # Verify signature
        if not verify_signature(address, message, signature):
            logger.warning(
                f"⚠️ Invalid signature for wallet link: {address[:10]}...")
            return jsonify({
                'success': False,
                'error': 'Invalid signature. Please try again.'
            }), 401

        # Link wallet to current user
        current_user.wallet_address = address
        db.session.commit()

        # Clear nonce from session
        session.pop('wallet_nonce', None)
        session.pop('wallet_address', None)

        logger.info(
            f"✅ Wallet linked to user {current_user.email}: {address[:10]}...")

        return jsonify({
            'success': True,
            'message': 'Wallet linked successfully!',
            'wallet_address': address
        })

    except Exception as e:
        logger.error(f"❌ Error in link_wallet: {str(e)}")
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': f'Server error: {str(e)}'
        }), 500


@wallet_bp.route('/unlink-wallet', methods=['POST'])
def unlink_wallet():
    """
    Unlink wallet from current user account.
    User must be logged in to use this endpoint.

    Returns:
        JSON with unlink result
    """
    if not current_user.is_authenticated:
        return jsonify({
            'success': False,
            'error': 'You must be logged in to unlink a wallet'
        }), 401

    try:
        if not current_user.wallet_address:
            return jsonify({
                'success': False,
                'error': 'No wallet is currently linked to your account'
            }), 400

        # Check if user has email/password set (prevent lockout)
        # Wallet-only users have dummy emails
        if '@wallet.local' in current_user.email:
            return jsonify({
                'success': False,
                'error': 'Cannot unlink wallet from wallet-only account. Set an email/password first.'
            }), 400

        old_address = current_user.wallet_address
        current_user.wallet_address = None
        current_user.wallet_nonce = None
        db.session.commit()

        logger.info(
            f"✅ Wallet unlinked from user {current_user.email}: {old_address[:10]}...")

        return jsonify({
            'success': True,
            'message': 'Wallet unlinked successfully!'
        })

    except Exception as e:
        logger.error(f"❌ Error in unlink_wallet: {str(e)}")
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': f'Server error: {str(e)}'
        }), 500


# ══════════════════════════════════════════════════════════════════════════════
# INITIALIZATION FUNCTION
# ══════════════════════════════════════════════════════════════════════════════

def init_wallet_auth(app):
    """
    Initialize wallet authentication system with Flask app.

    Args:
        app: Flask application instance
    """
    # Register blueprint
    app.register_blueprint(wallet_bp)

    # Log availability
    if WEB3_AVAILABLE:
        logger.info("✅ Wallet authentication initialized (Web3 available)")
    else:
        logger.warning(
            "⚠️ Wallet authentication disabled (Web3 not installed)")
