"""
Real-time Data Pipeline
======================
Async data ingestion from Binance with WebSocket streaming,
Redis caching, and alert processing.
"""

import asyncio
import aiohttp
import json
import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional, Set
import redis.asyncio as redis
from sqlalchemy.ext.asyncio import AsyncSession
from .database import get_db_session
from .models import User, AlertPreferences
from .config import settings

logger = logging.getLogger(__name__)


class DataPipeline:
    """Async data pipeline for real-time market data."""

    def __init__(self):
        self.redis: Optional[redis.Redis] = None
        self.session: Optional[aiohttp.ClientSession] = None
        self.is_running = False
        self.market_data_subscribers: Set = set()
        self.alert_subscribers: Set = set()

    async def initialize(self):
        """Initialize the data pipeline."""
        self.redis = redis.from_url(settings.REDIS_URL)
        self.session = aiohttp.ClientSession()
        self.is_running = True
        logger.info("✅ Data pipeline initialized")

    async def start_data_ingestion(self):
        """Start continuous data ingestion from Binance."""
        logger.info("🔄 Starting data ingestion...")

        while self.is_running:
            try:
                await self._fetch_and_cache_data()
                await asyncio.sleep(settings.DATA_REFRESH_INTERVAL)
            except Exception as e:
                logger.error(f"❌ Data ingestion error: {e}")
                await asyncio.sleep(30)  # Wait before retry

    async def start_alert_processing(self):
        """Start alert processing for volume spikes."""
        logger.info("🚨 Starting alert processing...")

        while self.is_running:
            try:
                await self._process_alerts()
                await asyncio.sleep(10)  # Check alerts every 10 seconds
            except Exception as e:
                logger.error(f"❌ Alert processing error: {e}")
                await asyncio.sleep(30)

    async def _fetch_and_cache_data(self):
        """Fetch data from Binance and cache in Redis."""
        try:
            # Fetch 24hr ticker data
            ticker_url = f"{settings.BINANCE_API_BASE}/fapi/v1/ticker/24hr"

            async with self.session.get(ticker_url) as response:
                if response.status == 200:
                    data = await response.json()

                    # Process and filter data
                    processed_data = self._process_ticker_data(data)

                    # Cache in Redis with TTL
                    await self.redis.setex(
                        "market_data",
                        settings.CACHE_TTL,
                        json.dumps(processed_data)
                    )

                    # Emit to WebSocket subscribers
                    await self._emit_to_subscribers(processed_data)

                    logger.info(f"✅ Cached {len(processed_data)} assets")
                else:
                    logger.error(f"❌ Binance API error: {response.status}")

        except Exception as e:
            logger.error(f"❌ Data fetch error: {e}")

    def _process_ticker_data(self, raw_data: List[Dict]) -> List[Dict]:
        """Process raw ticker data into our format."""
        processed = []

        for item in raw_data:
            # Filter USDT pairs with sufficient volume
            if (item['symbol'].endswith('USDT') and
                    float(item['quoteVolume']) >= settings.MIN_QUOTE_VOLUME):

                processed.append({
                    'symbol': item['symbol'],
                    'price': float(item['lastPrice']),
                    'price_change': float(item['priceChange']),
                    'price_change_percent': float(item['priceChangePercent']),
                    'volume': float(item['volume']),
                    'quote_volume': float(item['quoteVolume']),
                    'count': int(item['count']),
                    'timestamp': datetime.now(timezone.utc).isoformat()
                })

        # Sort by quote volume (descending)
        processed.sort(key=lambda x: x['quote_volume'], reverse=True)
        return processed

    async def _emit_to_subscribers(self, data: List[Dict]):
        """Emit data to all WebSocket subscribers."""
        if not self.market_data_subscribers:
            return

        message = {
            'type': 'market_data',
            'data': data,
            'timestamp': datetime.now(timezone.utc).isoformat()
        }

        # Send to all subscribers
        disconnected = set()
        for websocket in self.market_data_subscribers:
            try:
                await websocket.send_text(json.dumps(message))
            except Exception as e:
                logger.warning(f"⚠️ Failed to send to subscriber: {e}")
                disconnected.add(websocket)

        # Remove disconnected subscribers
        self.market_data_subscribers -= disconnected

    async def subscribe_to_market_data(self, websocket):
        """Subscribe WebSocket to market data updates."""
        self.market_data_subscribers.add(websocket)
        logger.info(
            f"📡 New market data subscriber (total: {len(self.market_data_subscribers)})")

    async def unsubscribe_from_market_data(self, websocket):
        """Unsubscribe WebSocket from market data updates."""
        self.market_data_subscribers.discard(websocket)
        logger.info(
            f"📡 Market data subscriber removed (total: {len(self.market_data_subscribers)})")

    async def _process_alerts(self):
        """Process volume spike alerts for all users."""
        try:
            # Get cached market data
            cached_data = await self.redis.get("market_data")
            if not cached_data:
                return

            market_data = json.loads(cached_data)

            # Get all users with alert preferences
            async with get_db_session() as db:
                users = await db.execute(
                    "SELECT u.id, u.email, u.tier, ap.volume_multiple, ap.min_quote_volume "
                    "FROM users u "
                    "JOIN alert_preferences ap ON u.id = ap.user_id "
                    "WHERE u.is_active = true AND ap.email_alerts_enabled = true"
                )

                for user in users:
                    await self._check_user_alerts(user, market_data)

        except Exception as e:
            logger.error(f"❌ Alert processing error: {e}")

    async def _check_user_alerts(self, user, market_data: List[Dict]):
        """Check alerts for a specific user."""
        try:
            volume_multiple = user.volume_multiple
            min_quote_volume = user.min_quote_volume

            alerts_triggered = []

            for asset in market_data:
                # Check if volume spike threshold is met
                if asset['quote_volume'] >= min_quote_volume:
                    # Calculate average volume (simplified - in production, use historical data)
                    avg_volume = asset['quote_volume'] / 24  # Rough estimate

                    if asset['quote_volume'] >= avg_volume * volume_multiple:
                        alerts_triggered.append({
                            'symbol': asset['symbol'],
                            'current_volume': asset['quote_volume'],
                            'price': asset['price'],
                            'price_change_percent': asset['price_change_percent']
                        })

            # Send alerts if any triggered
            if alerts_triggered:
                await self._send_alert_notification(user, alerts_triggered)

        except Exception as e:
            logger.error(f"❌ User alert check error: {e}")

    async def _send_alert_notification(self, user, alerts: List[Dict]):
        """Send alert notification to user."""
        try:
            # Store alert in Redis for email worker to process
            alert_data = {
                'user_id': user.id,
                'user_email': user.email,
                'alerts': alerts,
                'timestamp': datetime.now(timezone.utc).isoformat()
            }

            await self.redis.lpush("alert_queue", json.dumps(alert_data))
            logger.info(
                f"🚨 Alert queued for user {user.email}: {len(alerts)} triggers")

        except Exception as e:
            logger.error(f"❌ Alert notification error: {e}")

    async def get_cached_data(self, include_pro_metrics: bool = False) -> List[Dict]:
        """Get cached market data."""
        try:
            cached_data = await self.redis.get("market_data")
            if cached_data:
                data = json.loads(cached_data)

                # Apply tier-based filtering
                if not include_pro_metrics:
                    # Free tier: limit to top 50
                    data = data[:50]

                return data
            else:
                return []

        except Exception as e:
            logger.error(f"❌ Cache retrieval error: {e}")
            return []

    async def cleanup(self):
        """Cleanup resources."""
        self.is_running = False

        if self.session:
            await self.session.close()

        if self.redis:
            await self.redis.close()

        logger.info("✅ Data pipeline cleanup complete")
