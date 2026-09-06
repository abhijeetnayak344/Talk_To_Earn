"""Kafka client for Engagement Service"""
from aiokafka import AIOKafkaConsumer, AIOKafkaProducer
from loguru import logger
from config import settings
import json


class KafkaConsumerClient:
    """Kafka consumer wrapper"""
    
    def __init__(self):
        self.consumer = None
    
    async def start(self):
        """Start Kafka consumer"""
        try:
            self.consumer = AIOKafkaConsumer(
                'message.sent',
                'call.completed',
                'status.posted',
                bootstrap_servers=settings.KAFKA_BROKERS.split(','),
                group_id=settings.KAFKA_GROUP_ID,
                value_deserializer=lambda m: json.loads(m.decode('utf-8')),
                auto_offset_reset='earliest',
                enable_auto_commit=True
            )
            await self.consumer.start()
            logger.info("Kafka consumer started")
        except Exception as e:
            logger.error(f"Failed to start Kafka consumer: {e}")
            raise
    
    async def stop(self):
        """Stop Kafka consumer"""
        if self.consumer:
            await self.consumer.stop()
            logger.info("Kafka consumer stopped")
    
    async def consume(self):
        """Consume messages"""
        async for message in self.consumer:
            yield message


class KafkaProducerClient:
    """Kafka producer wrapper"""
    
    def __init__(self):
        self.producer = None
    
    async def start(self):
        """Start Kafka producer"""
        try:
            self.producer = AIOKafkaProducer(
                bootstrap_servers=settings.KAFKA_BROKERS.split(','),
                value_serializer=lambda v: json.dumps(v).encode('utf-8')
            )
            await self.producer.start()
            logger.info("Kafka producer started")
        except Exception as e:
            logger.error(f"Failed to start Kafka producer: {e}")
            raise
    
    async def stop(self):
        """Stop Kafka producer"""
        if self.producer:
            await self.producer.stop()
            logger.info("Kafka producer stopped")
    
    async def send(self, topic: str, value: dict, key: str = None):
        """Send message to topic"""
        try:
            await self.producer.send_and_wait(
                topic,
                value=value,
                key=key.encode('utf-8') if key else None
            )
        except Exception as e:
            logger.error(f"Failed to send message to {topic}: {e}")
            raise


# Global instances
kafka_consumer = KafkaConsumerClient()
kafka_producer = KafkaProducerClient()
