# Engagement Engine Design

## Overview

The Engagement Engine is the **most critical component** of Talk to Earn. It differentiates this platform from a simple "1 message = 1 point" system by analyzing conversation quality and detecting fraudulent behavior.

## Core Philosophy

**We don't reward messages. We reward genuine engagement.**

```
Message Count ❌  →  Points
Engagement Quality ✅  →  Points
```

## Architecture

```
Message Event (Kafka)
        ↓
┌───────────────────────────────────┐
│     Engagement Engine Service     │
├───────────────────────────────────┤
│  1. Normalization                 │
│  2. Duplicate Detection           │
│  3. Semantic Similarity           │
│  4. Context Analysis              │
│  5. Engagement Scoring            │
│  6. Spam Detection                │
│  7. Point Calculation             │
└───────────────────────────────────┘
        ↓
Engagement Event (Kafka)
        ↓
Reward Service → Award Points
```

## 1. Message Normalization

Before analysis, all messages are normalized to enable consistent comparison.

### Normalization Pipeline

```python
def normalize_message(message: str) -> str:
    """
    Normalize message for duplicate detection and analysis.
    """
    # Convert to lowercase
    text = message.lower()
    
    # Remove extra whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    
    # Remove punctuation (but keep emoji)
    text = re.sub(r'[^\w\s\U0001F300-\U0001F9FF]', '', text)
    
    # Normalize common patterns
    replacements = {
        'haha': 'ha',
        'hahaha': 'ha',
        'lol': 'ha',
        'lmao': 'ha',
        'rofl': 'ha',
        'ok': 'okay',
        'okk': 'okay',
        'okkk': 'okay',
        'k': 'okay',
        'kk': 'okay',
        'u': 'you',
        'ur': 'your',
        'r': 'are',
        'plz': 'please',
        'pls': 'please',
        'thx': 'thanks',
        'ty': 'thanks'
    }
    
    for old, new in replacements.items():
        text = re.sub(r'\b' + old + r'\b', new, text)
    
    return text


# Examples:
normalize_message("Hey, how are you???")  # → "hey how are you"
normalize_message("hahaha that's funny!")  # → "ha thats funny"
normalize_message("ok okk okkk")           # → "okay okay okay"
```

### Multi-Language Support

```python
def normalize_code_mixed(message: str, languages: list = ['en', 'hi']) -> str:
    """
    Normalize code-mixed messages (e.g., Hinglish).
    
    Examples:
    - "kya kr rha bro" (Hinglish)
    - "cómo estás bro" (Spanglish)
    """
    # Transliteration for common patterns
    # This would use libraries like:
    # - indic-transliteration for Indian languages
    # - transliterate for other languages
    
    return text
```

## 2. Duplicate Detection

### 2.1 Exact Duplicate Detection

```python
def is_exact_duplicate(
    message: str, 
    recent_messages: list[str], 
    window: int = 10
) -> bool:
    """
    Check if message is an exact duplicate of recent messages.
    
    Args:
        message: Current message
        recent_messages: Last N messages in conversation
        window: How many recent messages to check
    
    Returns:
        True if duplicate found
    """
    normalized = normalize_message(message)
    recent_normalized = [normalize_message(m) for m in recent_messages[-window:]]
    
    return normalized in recent_normalized


# Examples:
recent = ["hi", "hello", "how are you"]
is_exact_duplicate("hi", recent)           # True
is_exact_duplicate("Hi!", recent)          # True (normalized)
is_exact_duplicate("hi there", recent)     # False
```

### 2.2 Near-Duplicate Detection (Levenshtein Distance)

```python
from Levenshtein import distance

def is_near_duplicate(
    message: str,
    recent_messages: list[str],
    threshold: float = 0.85,
    window: int = 10
) -> bool:
    """
    Check if message is nearly identical to recent messages.
    Uses Levenshtein distance for similarity.
    
    Args:
        message: Current message
        recent_messages: Last N messages
        threshold: Similarity threshold (0.0 - 1.0)
        window: How many recent messages to check
    
    Returns:
        True if near-duplicate found
    """
    normalized = normalize_message(message)
    
    for recent in recent_messages[-window:]:
        recent_normalized = normalize_message(recent)
        
        # Skip empty strings
        if not normalized or not recent_normalized:
            continue
        
        # Calculate similarity
        max_len = max(len(normalized), len(recent_normalized))
        edit_dist = distance(normalized, recent_normalized)
        similarity = 1 - (edit_dist / max_len)
        
        if similarity >= threshold:
            return True
    
    return False


# Examples:
recent = ["how are you"]
is_near_duplicate("how are you", recent)      # True (exact)
is_near_duplicate("how r u", recent)          # True (after normalization)
is_near_duplicate("how are you doing", recent) # False (different enough)
```

### 2.3 Semantic Similarity Detection

For production, use embeddings to detect semantically similar messages.

```python
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

class SemanticDuplicateDetector:
    def __init__(self):
        # Use lightweight multilingual model
        self.model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
    
    def is_semantic_duplicate(
        self,
        message: str,
        recent_messages: list[str],
        threshold: float = 0.90,
        window: int = 10
    ) -> bool:
        """
        Detect semantically similar messages.
        
        Examples:
        - "how are you" vs "how are you doing" → Similar
        - "what's up" vs "how are you" → Similar
        - "good morning" vs "how are you" → Different
        """
        if not recent_messages:
            return False
        
        # Encode messages
        message_embedding = self.model.encode([message])
        recent_embeddings = self.model.encode(recent_messages[-window:])
        
        # Calculate cosine similarity
        similarities = cosine_similarity(message_embedding, recent_embeddings)[0]
        
        # Check if any similarity exceeds threshold
        return np.max(similarities) >= threshold


# Examples:
detector = SemanticDuplicateDetector()
recent = ["how are you", "what's going on"]

detector.is_semantic_duplicate("how r u", recent)      # True
detector.is_semantic_duplicate("how are you doing", recent)  # True
detector.is_semantic_duplicate("good morning", recent)  # False
```

## 3. Conversation Context Analysis

Analyze the conversation to understand engagement quality.

```python
from dataclasses import dataclass
from typing import List
from datetime import datetime, timedelta

@dataclass
class Message:
    id: str
    sender_id: str
    content: str
    created_at: datetime

@dataclass
class ConversationContext:
    messages: List[Message]
    participant_ids: List[str]
    
    def two_way_participation_score(self, current_user_id: str) -> float:
        """
        Score based on balanced conversation.
        
        Perfect score: Both users contributing equally
        Low score: One user dominating
        """
        if len(self.messages) < 2:
            return 0.5
        
        # Count messages per user in recent window
        recent_window = 20
        recent_messages = self.messages[-recent_window:]
        
        user_counts = {}
        for msg in recent_messages:
            user_counts[msg.sender_id] = user_counts.get(msg.sender_id, 0) + 1
        
        # Calculate balance ratio
        if len(user_counts) < 2:
            return 0.2  # Monologue, not dialogue
        
        counts = list(user_counts.values())
        min_count = min(counts)
        max_count = max(counts)
        
        if max_count == 0:
            return 0.5
        
        # Score closer to 1 when balanced
        balance_ratio = min_count / max_count
        
        return balance_ratio
    
    def response_time_score(self, current_message: Message) -> float:
        """
        Score based on response time.
        
        Too fast: Possibly bot (< 1 second consistently)
        Normal: Good (1-60 seconds)
        Slow: Okay (1-10 minutes)
        Very slow: Low engagement (> 10 minutes)
        """
        if len(self.messages) < 1:
            return 1.0
        
        last_message = self.messages[-1]
        
        # Different sender (actual response)
        if last_message.sender_id != current_message.sender_id:
            time_diff = (current_message.created_at - last_message.created_at).total_seconds()
            
            if time_diff < 1:
                return 0.3  # Suspiciously fast
            elif time_diff <= 60:
                return 1.0  # Good response time
            elif time_diff <= 600:
                return 0.8  # Acceptable
            elif time_diff <= 3600:
                return 0.5  # Slow but okay
            else:
                return 0.3  # Very slow
        
        return 0.5  # Same sender
    
    def conversation_continuity_score(self, current_message: Message) -> float:
        """
        Score based on whether conversation is continuing naturally.
        
        High score: Back-and-forth dialogue
        Low score: Disconnected messages
        """
        if len(self.messages) < 3:
            return 0.7
        
        recent = self.messages[-10:]
        
        # Count sender alternations
        alternations = 0
        for i in range(1, len(recent)):
            if recent[i].sender_id != recent[i-1].sender_id:
                alternations += 1
        
        # More alternations = better conversation flow
        alternation_ratio = alternations / (len(recent) - 1)
        
        return min(alternation_ratio * 1.5, 1.0)
    
    def message_length_score(self, message: str) -> float:
        """
        Score based on message substance.
        
        Too short: Minimal engagement ("k", "ok", "hi")
        Good: Meaningful messages
        """
        length = len(message.strip())
        
        if length <= 2:
            return 0.2  # "k", "ok"
        elif length <= 5:
            return 0.4  # "hello", "hi"
        elif length <= 20:
            return 0.7  # Short but meaningful
        elif length <= 100:
            return 1.0  # Good message
        else:
            return 0.9  # Very long (slightly reduce for spam potential)
    
    def interaction_variety_score(self, window: int = 20) -> float:
        """
        Score based on variety of interactions.
        
        High score: Mix of messages, reactions, different content
        Low score: Repetitive messages
        """
        if len(self.messages) < window:
            return 0.7
        
        recent = self.messages[-window:]
        
        # Count unique normalized messages
        unique_messages = set()
        for msg in recent:
            normalized = normalize_message(msg.content)
            if len(normalized) > 2:  # Ignore very short
                unique_messages.add(normalized)
        
        # Variety ratio
        variety_ratio = len(unique_messages) / len(recent)
        
        return variety_ratio
```

## 4. Engagement Score Calculation

Combine all signals into a final engagement score.

```python
from typing import Dict

class EngagementScorer:
    def __init__(self):
        self.duplicate_detector = SemanticDuplicateDetector()
        
        # Weights for different signals
        self.weights = {
            'two_way_participation': 0.25,
            'response_time': 0.15,
            'conversation_continuity': 0.20,
            'message_length': 0.15,
            'interaction_variety': 0.15,
            'message_uniqueness': 0.10
        }
    
    def calculate_engagement_score(
        self,
        message: Message,
        context: ConversationContext
    ) -> Dict:
        """
        Calculate comprehensive engagement score.
        
        Returns:
            {
                'engagement_score': float (0.0 - 1.0),
                'signals': dict of individual signal scores,
                'is_spam': bool,
                'is_duplicate': bool,
                'points_awarded': int
            }
        """
        # Check for duplicates first
        recent_content = [m.content for m in context.messages[-10:]]
        
        is_exact_dup = is_exact_duplicate(message.content, recent_content)
        is_near_dup = is_near_duplicate(message.content, recent_content)
        is_semantic_dup = self.duplicate_detector.is_semantic_duplicate(
            message.content, recent_content
        )
        
        is_duplicate = is_exact_dup or is_near_dup or is_semantic_dup
        
        # If duplicate, return zero score
        if is_duplicate:
            return {
                'engagement_score': 0.0,
                'signals': {},
                'is_spam': True,
                'is_duplicate': True,
                'points_awarded': 0,
                'reason': 'Duplicate message'
            }
        
        # Calculate individual signals
        signals = {
            'two_way_participation': context.two_way_participation_score(message.sender_id),
            'response_time': context.response_time_score(message),
            'conversation_continuity': context.conversation_continuity_score(message),
            'message_length': context.message_length_score(message.content),
            'interaction_variety': context.interaction_variety_score(),
            'message_uniqueness': 1.0  # Already checked for duplicates
        }
        
        # Weighted average
        engagement_score = sum(
            signals[key] * self.weights[key]
            for key in self.weights
        )
        
        # Detect spam patterns
        is_spam = self._detect_spam(message, context, signals)
        
        # Calculate points
        points_awarded = self._calculate_points(engagement_score, is_spam)
        
        return {
            'engagement_score': round(engagement_score, 2),
            'signals': {k: round(v, 2) for k, v in signals.items()},
            'is_spam': is_spam,
            'is_duplicate': False,
            'points_awarded': points_awarded,
            'reason': self._get_reason(engagement_score, is_spam)
        }
    
    def _detect_spam(
        self,
        message: Message,
        context: ConversationContext,
        signals: Dict[float]
    ) -> bool:
        """
        Detect spam patterns.
        """
        # Pattern 1: Very short messages repeatedly
        if signals['message_length'] < 0.3 and signals['interaction_variety'] < 0.3:
            return True
        
        # Pattern 2: Too fast responses consistently
        if signals['response_time'] < 0.4:
            # Check if this is consistent behavior
            recent_response_times = []
            for i in range(1, min(len(context.messages), 10)):
                if context.messages[i].sender_id != context.messages[i-1].sender_id:
                    time_diff = (
                        context.messages[i].created_at - 
                        context.messages[i-1].created_at
                    ).total_seconds()
                    recent_response_times.append(time_diff)
            
            if recent_response_times:
                avg_response = sum(recent_response_times) / len(recent_response_times)
                if avg_response < 1.5:  # Consistently too fast
                    return True
        
        # Pattern 3: No two-way participation
        if signals['two_way_participation'] < 0.3:
            return True
        
        return False
    
    def _calculate_points(self, engagement_score: float, is_spam: bool) -> int:
        """
        Convert engagement score to points.
        
        Tiered system:
        - 0.0 - 0.3: 0 points (low quality)
        - 0.3 - 0.5: 1 point (basic engagement)
        - 0.5 - 0.7: 2 points (good engagement)
        - 0.7 - 1.0: 3 points (excellent engagement)
        """
        if is_spam:
            return 0
        
        if engagement_score >= 0.7:
            return 3
        elif engagement_score >= 0.5:
            return 2
        elif engagement_score >= 0.3:
            return 1
        else:
            return 0
    
    def _get_reason(self, engagement_score: float, is_spam: bool) -> str:
        """
        Human-readable reason for point allocation.
        """
        if is_spam:
            return "Spam or low-quality interaction detected"
        
        if engagement_score >= 0.7:
            return "Excellent genuine conversation"
        elif engagement_score >= 0.5:
            return "Good engagement"
        elif engagement_score >= 0.3:
            return "Basic interaction"
        else:
            return "Minimal engagement"
```

## 5. Advanced Features

### 5.1 Call Engagement Scoring

```python
@dataclass
class CallEvent:
    call_id: str
    participants: List[str]
    duration: int  # seconds
    call_type: str  # audio, video
    quality_rating: int  # 1-5

def calculate_call_engagement(call: CallEvent) -> Dict:
    """
    Score call engagement.
    
    Prevent exploitation:
    - Don't reward just for duration
    - Require both participants to be active
    - Cap daily call rewards
    """
    # Minimum duration (30 seconds)
    if call.duration < 30:
        return {'points': 0, 'reason': 'Call too short'}
    
    # Base points for genuine call
    base_points = 5
    
    # Bonus for good quality (indicates both participated)
    if call.quality_rating >= 4:
        base_points += 2
    
    # Duration bonus (capped)
    # 5 minutes = +5 points
    # 10 minutes = +8 points (diminishing returns)
    # 30+ minutes = +10 points (max)
    duration_minutes = call.duration / 60
    
    if duration_minutes >= 30:
        duration_bonus = 10
    elif duration_minutes >= 10:
        duration_bonus = 8
    elif duration_minutes >= 5:
        duration_bonus = 5
    else:
        duration_bonus = 0
    
    total_points = base_points + duration_bonus
    
    # Cap per call
    total_points = min(total_points, 15)
    
    return {
        'points': total_points,
        'reason': f'Call engagement: {duration_minutes:.1f} minutes'
    }
```

### 5.2 Status Engagement Scoring

```python
def calculate_status_engagement(
    status_views: int,
    status_reactions: int,
    viewer_relationships: List[str]  # 'contact', 'couple', 'stranger'
) -> Dict:
    """
    Score status engagement.
    
    Prevent exploitation:
    - Small rewards (not primary earning method)
    - Weight contacts higher than strangers
    - Cap daily status rewards
    """
    points = 0
    
    # Views from contacts
    contact_views = sum(1 for r in viewer_relationships if r == 'contact')
    points += min(contact_views * 0.5, 5)  # Max 5 points from views
    
    # Reactions (more valuable)
    points += min(status_reactions * 1, 5)  # Max 5 points from reactions
    
    # Bonus for couple partner viewing/reacting
    if 'couple' in viewer_relationships:
        points += 2
    
    return {
        'points': int(points),
        'reason': 'Status engagement'
    }
```

### 5.3 Group Engagement Scoring

```python
def calculate_group_engagement(
    message: Message,
    group_size: int,
    active_members_ratio: float  # % of members active in last 24h
) -> Dict:
    """
    Score group message engagement.
    
    Challenges:
    - Harder to detect spam in groups
    - Multiple conversations happening
    - Varying group sizes
    
    Solution:
    - Lower points than 1-to-1
    - Consider group activity level
    """
    # Base points (lower than direct messages)
    base_points = 1
    
    # Bonus for active groups
    if active_members_ratio > 0.5:
        base_points += 1
    
    # Penalty for very large groups (spam risk)
    if group_size > 100:
        base_points = max(0, base_points - 1)
    
    return {
        'points': base_points,
        'reason': 'Group participation'
    }
```

## 6. Anti-Fraud Measures

### 6.1 Rate Limiting

```python
class RateLimiter:
    def __init__(self, redis_client):
        self.redis = redis_client
    
    def check_rate_limit(self, user_id: str, action: str) -> Dict:
        """
        Check if user is within rate limits.
        
        Limits:
        - Messages: 30 per minute, 500 per hour
        - Calls: 10 per hour
        - Points: 500 per day
        """
        limits = {
            'message_minute': (30, 60),
            'message_hour': (500, 3600),
            'call_hour': (10, 3600),
            'points_day': (500, 86400)
        }
        
        for limit_key, (max_count, window) in limits.items():
            if action in limit_key:
                key = f"rate_limit:{user_id}:{limit_key}"
                count = self.redis.incr(key)
                
                if count == 1:
                    self.redis.expire(key, window)
                
                if count > max_count:
                    return {
                        'allowed': False,
                        'reason': f'Rate limit exceeded: {limit_key}',
                        'retry_after': self.redis.ttl(key)
                    }
        
        return {'allowed': True}
```

### 6.2 Bot Detection

```python
class BotDetector:
    def calculate_bot_probability(
        self,
        user_id: str,
        recent_behavior: Dict
    ) -> float:
        """
        Calculate probability that user is a bot.
        
        Signals:
        - Too consistent message intervals
        - Unrealistic response times
        - High message volume
        - Low engagement scores
        - Account age vs activity
        """
        bot_score = 0.0
        
        # Signal 1: Message timing consistency
        intervals = recent_behavior.get('message_intervals', [])
        if len(intervals) > 10:
            avg = sum(intervals) / len(intervals)
            variance = sum((x - avg) ** 2 for x in intervals) / len(intervals)
            
            # Bots have low variance (too consistent)
            if variance < 0.5 and avg < 2:
                bot_score += 0.3
        
        # Signal 2: Consistently fast responses
        fast_responses = sum(1 for t in intervals if t < 1)
        if len(intervals) > 0 and fast_responses / len(intervals) > 0.8:
            bot_score += 0.3
        
        # Signal 3: High volume + low engagement
        message_count = recent_behavior.get('message_count_today', 0)
        avg_engagement = recent_behavior.get('avg_engagement_score', 0)
        
        if message_count > 200 and avg_engagement < 0.3:
            bot_score += 0.4
        
        return min(bot_score, 1.0)
```

### 6.3 Daily Earning Caps

```python
def enforce_daily_cap(user_id: str, new_points: int) -> Dict:
    """
    Enforce daily earning limits.
    
    Caps:
    - New users: 100 points/day
    - Regular users: 500 points/day
    - High reputation: 1000 points/day
    """
    # Get user's daily earnings and reputation
    account = get_point_account(user_id)
    user = get_user(user_id)
    
    # Determine cap based on reputation
    if user.reputation_score >= 150:
        daily_cap = 1000
    elif user.reputation_score >= 100:
        daily_cap = 500
    else:
        daily_cap = 100
    
    # Check if adding points would exceed cap
    if account.daily_earned_today + new_points > daily_cap:
        # Award partial points up to cap
        points_to_award = max(0, daily_cap - account.daily_earned_today)
        
        return {
            'points_awarded': points_to_award,
            'capped': True,
            'reason': f'Daily limit reached ({daily_cap} points/day)'
        }
    
    return {
        'points_awarded': new_points,
        'capped': False
    }
```

## 7. Implementation Example

Complete flow from message to points:

```python
from kafka import KafkaConsumer, KafkaProducer
import json

class EngagementEngineService:
    def __init__(self):
        self.consumer = KafkaConsumer(
            'message.sent',
            bootstrap_servers=['kafka:9092'],
            value_deserializer=lambda m: json.loads(m.decode('utf-8'))
        )
        
        self.producer = KafkaProducer(
            bootstrap_servers=['kafka:9092'],
            value_serializer=lambda v: json.dumps(v).encode('utf-8')
        )
        
        self.scorer = EngagementScorer()
        self.rate_limiter = RateLimiter(redis_client)
        self.bot_detector = BotDetector()
    
    def process_message_event(self, event: Dict):
        """
        Process incoming message event.
        """
        message_id = event['message_id']
        user_id = event['user_id']
        conversation_id = event['conversation_id']
        content = event['content']
        
        # Step 1: Rate limiting check
        rate_limit = self.rate_limiter.check_rate_limit(user_id, 'message')
        if not rate_limit['allowed']:
            self.emit_fraud_event(user_id, 'rate_limit_exceeded', rate_limit)
            return
        
        # Step 2: Bot detection
        recent_behavior = self.get_recent_behavior(user_id)
        bot_probability = self.bot_detector.calculate_bot_probability(
            user_id, recent_behavior
        )
        
        if bot_probability > 0.7:
            self.emit_fraud_event(user_id, 'bot_detected', {
                'probability': bot_probability
            })
            # Still process but with 0 points
        
        # Step 3: Load conversation context
        context = self.load_conversation_context(conversation_id)
        
        # Step 4: Calculate engagement score
        message = Message(
            id=message_id,
            sender_id=user_id,
            content=content,
            created_at=datetime.fromisoformat(event['created_at'])
        )
        
        result = self.scorer.calculate_engagement_score(message, context)
        
        # Step 5: Apply bot penalty
        if bot_probability > 0.7:
            result['points_awarded'] = 0
            result['reason'] = 'Bot behavior detected'
        
        # Step 6: Enforce daily cap
        cap_result = enforce_daily_cap(user_id, result['points_awarded'])
        result['points_awarded'] = cap_result['points_awarded']
        
        if cap_result['capped']:
            result['reason'] = cap_result['reason']
        
        # Step 7: Store engagement event
        self.store_engagement_event(message_id, user_id, result)
        
        # Step 8: Emit engagement event to Kafka
        if result['points_awarded'] > 0:
            self.producer.send('engagement.calculated', {
                'event_id': message_id,  # Idempotency key
                'user_id': user_id,
                'points': result['points_awarded'],
                'event_type': 'chat_engagement',
                'metadata': result
            })
    
    def run(self):
        """
        Main consumer loop.
        """
        for message in self.consumer:
            try:
                self.process_message_event(message.value)
            except Exception as e:
                logger.error(f"Error processing message: {e}")
```

## 8. Performance Considerations

### Caching Strategy

```python
# Cache recent conversation context in Redis
def get_cached_context(conversation_id: str) -> Optional[ConversationContext]:
    key = f"conversation_context:{conversation_id}"
    data = redis.get(key)
    
    if data:
        return ConversationContext.from_json(data)
    
    return None

def cache_context(conversation_id: str, context: ConversationContext):
    key = f"conversation_context:{conversation_id}"
    redis.setex(key, 300, context.to_json())  # 5 min TTL
```

### Batch Processing

```python
# Process multiple messages in batch for efficiency
def process_batch(messages: List[Dict]):
    # Load all contexts in parallel
    contexts = load_contexts_parallel([m['conversation_id'] for m in messages])
    
    # Score all messages
    results = []
    for message, context in zip(messages, contexts):
        result = scorer.calculate_engagement_score(message, context)
        results.append(result)
    
    # Bulk insert engagement events
    bulk_insert_engagement_events(results)
    
    # Emit Kafka events
    for result in results:
        if result['points_awarded'] > 0:
            producer.send('engagement.calculated', result)
```

## 9. Metrics & Monitoring

Track these metrics for system health:

```yaml
Engagement Metrics:
  - Average engagement score: 0.55
  - Messages with 0 points: 25%
  - Messages with 1 point: 35%
  - Messages with 2 points: 30%
  - Messages with 3 points: 10%

Fraud Metrics:
  - Duplicate messages detected: 15%
  - Spam messages detected: 5%
  - Bot accounts detected: 2%
  - Rate limit hits: 100/hour

Performance Metrics:
  - Processing latency: p95 < 50ms
  - Kafka consumer lag: < 100 messages
  - Cache hit rate: > 80%
```

## 10. Tuning & Optimization

### A/B Testing Framework

```python
def get_scoring_weights(user_id: str) -> Dict:
    """
    A/B test different weight configurations.
    """
    experiment_group = hash(user_id) % 100
    
    if experiment_group < 50:
        # Control group
        return DEFAULT_WEIGHTS
    else:
        # Test group: emphasize two-way participation more
        return {
            'two_way_participation': 0.35,  # Increased
            'response_time': 0.10,
            'conversation_continuity': 0.20,
            'message_length': 0.15,
            'interaction_variety': 0.10,
            'message_uniqueness': 0.10
        }
```

---

This engagement engine transforms Talk to Earn from a simple chat app into an intelligent platform that rewards genuine human interaction while preventing fraud and exploitation.
