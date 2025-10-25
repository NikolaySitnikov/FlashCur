"""
Authentication Routes
====================
FastAPI routes for user authentication including Web3 wallet support.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr
from typing import Optional
import jwt
import logging
from datetime import datetime, timedelta, timezone

from ..database import get_db_session
from ..models import User
from ..config import settings

logger = logging.getLogger(__name__)
router = APIRouter()
security = HTTPBearer()

# Pydantic models


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserRegister(BaseModel):
    email: EmailStr
    password: str
    confirm_password: str


class WalletAuth(BaseModel):
    address: str
    signature: str
    message: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: dict

# JWT utilities


def create_access_token(user_id: int, email: str) -> str:
    """Create JWT access token."""
    payload = {
        "user_id": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def verify_token(token: str) -> dict:
    """Verify JWT token."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY,
                             algorithms=[settings.JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db_session)
) -> User:
    """Get current authenticated user."""
    token = credentials.credentials
    payload = verify_token(token)

    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=401, detail="User not found or inactive")

    return user


@router.post("/register", response_model=TokenResponse)
async def register(
    user_data: UserRegister,
    db: AsyncSession = Depends(get_db_session)
):
    """Register new user."""
    try:
        # Validate passwords match
        if user_data.password != user_data.confirm_password:
            raise HTTPException(
                status_code=400, detail="Passwords do not match")

        # Check if user already exists
        result = await db.execute(select(User).where(User.email == user_data.email))
        existing_user = result.scalar_one_or_none()

        if existing_user:
            raise HTTPException(
                status_code=400, detail="Email already registered")

        # Create new user
        user = User(
            email=user_data.email,
            tier=0,  # Free tier
            is_active=True
        )
        user.set_password(user_data.password)

        db.add(user)
        await db.commit()
        await db.refresh(user)

        # Create access token
        access_token = create_access_token(user.id, user.email)

        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            user={
                "id": user.id,
                "email": user.email,
                "tier": user.tier,
                "is_active": user.is_active
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Registration error: {e}")
        raise HTTPException(status_code=500, detail="Registration failed")


@router.post("/login", response_model=TokenResponse)
async def login(
    login_data: UserLogin,
    db: AsyncSession = Depends(get_db_session)
):
    """Authenticate user with email/password."""
    try:
        # Find user
        result = await db.execute(select(User).where(User.email == login_data.email))
        user = result.scalar_one_or_none()

        if not user or not user.check_password(login_data.password):
            raise HTTPException(status_code=401, detail="Invalid credentials")

        if not user.is_active:
            raise HTTPException(status_code=401, detail="Account is inactive")

        # Create access token
        access_token = create_access_token(user.id, user.email)

        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            user={
                "id": user.id,
                "email": user.email,
                "tier": user.tier,
                "is_active": user.is_active
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Login error: {e}")
        raise HTTPException(status_code=500, detail="Login failed")


@router.post("/wallet/request-nonce")
async def request_wallet_nonce(
    address: str,
    db: AsyncSession = Depends(get_db_session)
):
    """Request nonce for wallet authentication."""
    try:
        # Generate random nonce
        import secrets
        nonce = secrets.token_hex(32)

        # Store nonce in user record (create if doesn't exist)
        result = await db.execute(select(User).where(User.wallet_address == address))
        user = result.scalar_one_or_none()

        if not user:
            # Create wallet-only user
            user = User(
                email=f"0x{address}@wallet.local",
                password_hash="",  # No password for wallet users
                wallet_address=address,
                tier=0,
                is_active=True
            )
            db.add(user)
        else:
            user.wallet_nonce = nonce

        await db.commit()

        return {"nonce": nonce, "message": f"Sign this message to authenticate: {nonce}"}

    except Exception as e:
        logger.error(f"❌ Wallet nonce error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate nonce")


@router.post("/wallet/verify-signature", response_model=TokenResponse)
async def verify_wallet_signature(
    wallet_data: WalletAuth,
    db: AsyncSession = Depends(get_db_session)
):
    """Verify wallet signature and authenticate user."""
    try:
        # Find user by wallet address
        result = await db.execute(select(User).where(User.wallet_address == wallet_data.address))
        user = result.scalar_one_or_none()

        if not user:
            raise HTTPException(status_code=401, detail="Wallet not found")

        # Verify signature (simplified - in production, use proper EIP-191 verification)
        if wallet_data.message != user.wallet_nonce:
            raise HTTPException(status_code=401, detail="Invalid nonce")

        # Clear nonce after successful verification
        user.wallet_nonce = None
        await db.commit()

        # Create access token
        access_token = create_access_token(user.id, user.email)

        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            user={
                "id": user.id,
                "email": user.email,
                "tier": user.tier,
                "is_active": user.is_active,
                "wallet_address": user.wallet_address
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Wallet verification error: {e}")
        raise HTTPException(
            status_code=500, detail="Wallet verification failed")


@router.get("/me")
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information."""
    return {
        "id": current_user.id,
        "email": current_user.email,
        "tier": current_user.tier,
        "is_active": current_user.is_active,
        "email_confirmed": current_user.email_confirmed,
        "wallet_address": current_user.wallet_address,
        "subscription_expires_at": current_user.subscription_expires_at
    }
