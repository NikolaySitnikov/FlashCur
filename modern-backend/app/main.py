"""
Modern FastAPI Backend for FlashCur
==================================
Async-first architecture with real-time WebSocket streaming,
proper data pipeline, and scalable infrastructure.
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
from contextlib import asynccontextmanager
import asyncio
import logging
from typing import Dict, List, Optional
import redis.asyncio as redis
from sqlalchemy.ext.asyncio import AsyncSession
import uvicorn

# Import our modules
from .auth import get_current_user, User
from .database import get_db_session
from .websocket_manager import WebSocketManager
from .data_pipeline import DataPipeline
from .config import settings
from .routes import auth, payments, dashboard, alerts

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global instances
websocket_manager = WebSocketManager()
data_pipeline = DataPipeline()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    # Startup
    logger.info("🚀 Starting FlashCur backend...")

    # Initialize Redis connection
    app.state.redis = redis.from_url(settings.REDIS_URL)
    await app.state.redis.ping()
    logger.info("✅ Redis connected")

    # Initialize data pipeline
    await data_pipeline.initialize()
    logger.info("✅ Data pipeline initialized")

    # Start background tasks
    asyncio.create_task(data_pipeline.start_data_ingestion())
    asyncio.create_task(data_pipeline.start_alert_processing())
    logger.info("✅ Background tasks started")

    yield

    # Shutdown
    logger.info("🛑 Shutting down FlashCur backend...")
    await data_pipeline.cleanup()
    await app.state.redis.close()
    logger.info("✅ Cleanup complete")

# Create FastAPI app
app = FastAPI(
    title="FlashCur API",
    description="Modern Binance trading dashboard with real-time data",
    version="2.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["authentication"])
app.include_router(payments.router, prefix="/api/payments", tags=["payments"])
app.include_router(
    dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(alerts.router, prefix="/api/alerts", tags=["alerts"])


@app.get("/")
async def root():
    """Health check endpoint."""
    return {"message": "FlashCur API v2.0", "status": "healthy"}


@app.get("/health")
async def health_check():
    """Detailed health check."""
    redis_status = "healthy" if await app.state.redis.ping() else "unhealthy"
    pipeline_status = "healthy" if data_pipeline.is_running else "unhealthy"

    return {
        "status": "healthy",
        "redis": redis_status,
        "data_pipeline": pipeline_status,
        "websocket_connections": len(websocket_manager.active_connections)
    }


@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    """WebSocket endpoint for real-time data streaming."""
    await websocket_manager.connect(websocket, user_id)

    try:
        while True:
            # Keep connection alive and handle any incoming messages
            data = await websocket.receive_text()
            # Handle client messages if needed
            await websocket_manager.handle_message(user_id, data)

    except WebSocketDisconnect:
        websocket_manager.disconnect(user_id)
        logger.info(f"🔌 WebSocket disconnected: {user_id}")


@app.websocket("/ws/market-data")
async def market_data_websocket(websocket: WebSocket):
    """Public WebSocket for market data (no auth required)."""
    await websocket.accept()

    try:
        # Subscribe to market data updates
        await data_pipeline.subscribe_to_market_data(websocket)

        while True:
            # Keep connection alive
            await websocket.receive_text()

    except WebSocketDisconnect:
        await data_pipeline.unsubscribe_from_market_data(websocket)
        logger.info("🔌 Market data WebSocket disconnected")

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
