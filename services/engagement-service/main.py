"""
Engagement Engine Service

Analyzes conversation quality and calculates engagement scores.
This is the core differentiator of Talk to Earn.
"""

from fastapi import FastAPI
from contextlib import asynccontextmanager
from loguru import logger
import sys
import asyncio

from config import settings
from database import database
from kafka_client import kafka_consumer, kafka_producer
from consumer import EngagementConsumer

# Configure logger
logger.remove()
logger.add(
    sys.stdout,
    format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan> - <level>{message}</level>",
    level="INFO" if settings.ENVIRONMENT == "production" else "DEBUG"
)

# Global consumer
engagement_consumer = None
consumer_task = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    global engagement_consumer, consumer_task
    
    # Startup
    logger.info("Starting Engagement Engine Service...")
    
    # Connect to database
    await database.connect()
    logger.info("Database connected")
    
    # Start Kafka consumer
    await kafka_consumer.start()
    logger.info("Kafka consumer started")
    
    # Start Kafka producer
    await kafka_producer.start()
    logger.info("Kafka producer started")
    
    # Start engagement consumer
    engagement_consumer = EngagementConsumer()
    consumer_task = asyncio.create_task(engagement_consumer.run())
    logger.info("Engagement consumer started")
    
    logger.info(f"Engagement Engine Service ready on port {settings.PORT}")
    
    yield
    
    # Shutdown
    logger.info("Shutting down Engagement Engine Service...")
    if consumer_task:
        consumer_task.cancel()
    await kafka_consumer.stop()
    await kafka_producer.stop()
    await database.disconnect()
    logger.info("Shutdown complete")


app = FastAPI(
    title="Engagement Engine Service",
    description="Analyzes conversation quality and calculates engagement scores",
    version="1.0.0",
    lifespan=lifespan
)


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "engagement-service",
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT
    }


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "Engagement Engine",
        "description": "Intelligent conversation quality analysis",
        "docs": "/docs",
        "features": [
            "6-signal engagement scoring",
            "Duplicate detection (exact, near, semantic)",
            "Spam detection",
            "Multi-language support",
            "Real-time analysis"
        ]
    }


@app.get("/metrics")
async def metrics():
    """Get engagement metrics"""
    # TODO: Return metrics from database
    return {
        "total_messages_analyzed": 0,
        "average_engagement_score": 0.0,
        "spam_detected": 0,
        "duplicates_detected": 0
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.PORT,
        reload=settings.ENVIRONMENT == "development"
    )
