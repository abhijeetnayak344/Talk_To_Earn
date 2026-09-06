"""Kafka consumer for processing engagement events"""
import json
import asyncio
from loguru import logger
from kafka_client import kafka_consumer, kafka_producer
from database import database
from engagement_scorer import EngagementScorer


class EngagementConsumer:
    """Process messages and calculate engagement"""
    
    def __init__(self):
        self.scorer = EngagementScorer()
    
    async def process_message_event(self, event: dict):
        """Process incoming message event"""
        try:
            message_id = event['message_id']
            user_id = event['user_id']
            conversation_id = event['conversation_id']
            content = event['content']
            created_at = event['created_at']
            
            logger.info(f"Processing message {message_id} from user {user_id}")
            
            # Load recent conversation messages
            recent_messages = await self._load_recent_messages(conversation_id)
            
            # Current message
            message = {
                'id': message_id,
                'sender_id': user_id,
                'content': content,
                'created_at': created_at
            }
            
            # Calculate engagement score
            result = self.scorer.calculate_engagement_score(message, recent_messages)
            
            logger.info(
                f"Engagement score: {result['engagement_score']}, "
                f"Points: {result['points_awarded']}, "
                f"Reason: {result['reason']}"
            )
            
            # Store engagement event
            await database.execute(
                """INSERT INTO engagement_events 
                   (user_id, conversation_id, event_type, engagement_score, 
                    signals, points_awarded, is_spam, is_duplicate, metadata)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)""",
                user_id, conversation_id, 'message_sent',
                result['engagement_score'],
                json.dumps(result['signals']),
                result['points_awarded'],
                result['is_spam'],
                result['is_duplicate'],
                json.dumps({'message_id': message_id, 'reason': result['reason']})
            )
            
            # Emit engagement event if points awarded
            if result['points_awarded'] > 0:
                await kafka_producer.send('engagement.calculated', {
                    'event_id': message_id,  # Idempotency key
                    'user_id': user_id,
                    'points': result['points_awarded'],
                    'event_type': 'chat_engagement',
                    'engagement_score': result['engagement_score'],
                    'reason': result['reason'],
                    'metadata': {
                        'conversation_id': conversation_id,
                        'message_id': message_id,
                        'signals': result['signals']
                    }
                })
                
                logger.info(f"Awarded {result['points_awarded']} points to user {user_id}")
        
        except Exception as e:
            logger.error(f"Error processing message event: {e}")
    
    async def _load_recent_messages(self, conversation_id: str, limit: int = 20):
        """Load recent messages from conversation"""
        rows = await database.fetch(
            """SELECT sender_id, content, created_at::text
               FROM messages
               WHERE conversation_id = $1
               ORDER BY created_at DESC
               LIMIT $2""",
            conversation_id, limit
        )
        
        messages = []
        for row in rows:
            messages.append({
                'sender_id': row['sender_id'],
                'content': row['content'],
                'created_at': row['created_at']
            })
        
        return list(reversed(messages))  # Oldest first
    
    async def run(self):
        """Start consuming messages"""
        logger.info("Starting engagement consumer...")
        
        async for message in kafka_consumer.consume():
            try:
                topic = message.topic
                value = message.value
                
                if topic == 'message.sent':
                    await self.process_message_event(value)
                elif topic == 'call.completed':
                    # TODO: Process call engagement
                    pass
                elif topic == 'status.posted':
                    # TODO: Process status engagement
                    pass
                
            except Exception as e:
                logger.error(f"Error processing Kafka message: {e}")


# Run consumer
async def main():
    consumer = EngagementConsumer()
    await consumer.run()


if __name__ == "__main__":
    asyncio.run(main())
