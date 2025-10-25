"""
WebSocket Connection Manager
===========================
Manages real-time WebSocket connections for user-specific data streaming.
"""

import json
import logging
from typing import Dict, Set
from fastapi import WebSocket
from .models import User

logger = logging.getLogger(__name__)


class WebSocketManager:
    """Manages WebSocket connections and user-specific data streaming."""

    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        # user_id -> set of subscription types
        self.user_subscriptions: Dict[str, Set[str]] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        """Accept WebSocket connection and store user mapping."""
        await websocket.accept()
        self.active_connections[user_id] = websocket
        self.user_subscriptions[user_id] = set()
        logger.info(f"🔌 WebSocket connected: {user_id}")

    def disconnect(self, user_id: str):
        """Remove WebSocket connection."""
        if user_id in self.active_connections:
            del self.active_connections[user_id]
        if user_id in self.user_subscriptions:
            del self.user_subscriptions[user_id]
        logger.info(f"🔌 WebSocket disconnected: {user_id}")

    async def handle_message(self, user_id: str, message: str):
        """Handle incoming WebSocket messages from client."""
        try:
            data = json.loads(message)
            message_type = data.get('type')

            if message_type == 'subscribe':
                # Subscribe to specific data types
                subscription_type = data.get('subscription')
                if subscription_type:
                    self.user_subscriptions[user_id].add(subscription_type)
                    logger.info(
                        f"📡 User {user_id} subscribed to {subscription_type}")

            elif message_type == 'unsubscribe':
                # Unsubscribe from specific data types
                subscription_type = data.get('subscription')
                if subscription_type:
                    self.user_subscriptions[user_id].discard(subscription_type)
                    logger.info(
                        f"📡 User {user_id} unsubscribed from {subscription_type}")

            elif message_type == 'ping':
                # Respond to ping with pong
                await self.send_personal_message(user_id, {'type': 'pong'})

        except json.JSONDecodeError:
            logger.warning(f"⚠️ Invalid JSON from user {user_id}: {message}")
        except Exception as e:
            logger.error(f"❌ WebSocket message handling error: {e}")

    async def send_personal_message(self, user_id: str, message: dict):
        """Send message to specific user."""
        if user_id in self.active_connections:
            try:
                websocket = self.active_connections[user_id]
                await websocket.send_text(json.dumps(message))
            except Exception as e:
                logger.error(f"❌ Failed to send message to {user_id}: {e}")
                # Remove disconnected connection
                self.disconnect(user_id)

    async def send_to_subscribers(self, subscription_type: str, message: dict):
        """Send message to all users subscribed to specific data type."""
        for user_id, subscriptions in self.user_subscriptions.items():
            if subscription_type in subscriptions:
                await self.send_personal_message(user_id, message)

    async def broadcast_alert(self, user_id: str, alert_data: dict):
        """Send alert to specific user."""
        message = {
            'type': 'alert',
            'data': alert_data,
            'timestamp': alert_data.get('timestamp')
        }
        await self.send_personal_message(user_id, message)

    async def broadcast_tier_upgrade(self, user_id: str, new_tier: int):
        """Notify user of tier upgrade."""
        message = {
            'type': 'tier_upgrade',
            'new_tier': new_tier,
            'timestamp': alert_data.get('timestamp')
        }
        await self.send_personal_message(user_id, message)

    def get_connection_count(self) -> int:
        """Get total number of active connections."""
        return len(self.active_connections)

    def get_user_subscriptions(self, user_id: str) -> Set[str]:
        """Get user's current subscriptions."""
        return self.user_subscriptions.get(user_id, set())
