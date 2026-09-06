"""Engagement scoring engine"""
import re
from typing import Dict, List
from datetime import datetime
from Levenshtein import distance as levenshtein_distance
from loguru import logger


def normalize_message(message: str) -> str:
    """Normalize message for comparison"""
    # Convert to lowercase
    text = message.lower()
    
    # Remove extra whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    
    # Remove punctuation (keep alphanumeric and emojis)
    text = re.sub(r'[^\w\s]', '', text)
    
    # Normalize common patterns
    replacements = {
        'haha': 'ha', 'hahaha': 'ha', 'lol': 'ha', 'lmao': 'ha',
        'ok': 'okay', 'okk': 'okay', 'okkk': 'okay',
        'k': 'okay', 'kk': 'okay',
        'u': 'you', 'ur': 'your', 'r': 'are',
        'plz': 'please', 'pls': 'please',
        'thx': 'thanks', 'ty': 'thanks'
    }
    
    for old, new in replacements.items():
        text = re.sub(rf'\b{old}\b', new, text)
    
    return text


def is_exact_duplicate(message: str, recent_messages: List[str], window: int = 10) -> bool:
    """Check for exact duplicate"""
    normalized = normalize_message(message)
    recent_normalized = [normalize_message(m) for m in recent_messages[-window:]]
    return normalized in recent_normalized


def is_near_duplicate(message: str, recent_messages: List[str], threshold: float = 0.85, window: int = 10) -> bool:
    """Check for near duplicate using Levenshtein distance"""
    normalized = normalize_message(message)
    
    for recent in recent_messages[-window:]:
        recent_normalized = normalize_message(recent)
        
        if not normalized or not recent_normalized:
            continue
        
        max_len = max(len(normalized), len(recent_normalized))
        if max_len == 0:
            continue
            
        edit_dist = levenshtein_distance(normalized, recent_normalized)
        similarity = 1 - (edit_dist / max_len)
        
        if similarity >= threshold:
            return True
    
    return False


class EngagementScorer:
    """Calculate engagement scores for messages"""
    
    def __init__(self):
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
        message: Dict,
        recent_messages: List[Dict]
    ) -> Dict:
        """Calculate comprehensive engagement score"""
        
        # Check for duplicates
        recent_content = [m['content'] for m in recent_messages[-10:]]
        
        is_exact_dup = is_exact_duplicate(message['content'], recent_content)
        is_near_dup = is_near_duplicate(message['content'], recent_content)
        
        if is_exact_dup or is_near_dup:
            return {
                'engagement_score': 0.0,
                'signals': {},
                'is_spam': True,
                'is_duplicate': True,
                'points_awarded': 0,
                'reason': 'Duplicate message detected'
            }
        
        # Calculate signals
        signals = {
            'two_way_participation': self._two_way_participation(message, recent_messages),
            'response_time': self._response_time_score(message, recent_messages),
            'conversation_continuity': self._conversation_continuity(recent_messages),
            'message_length': self._message_length_score(message['content']),
            'interaction_variety': self._interaction_variety(recent_messages),
            'message_uniqueness': 1.0  # Already checked duplicates
        }
        
        # Weighted average
        engagement_score = sum(
            signals[key] * self.weights[key]
            for key in self.weights
        )
        
        # Detect spam
        is_spam = self._detect_spam(signals, recent_messages)
        
        # Calculate points
        points = self._calculate_points(engagement_score, is_spam)
        
        return {
            'engagement_score': round(engagement_score, 2),
            'signals': {k: round(v, 2) for k, v in signals.items()},
            'is_spam': is_spam,
            'is_duplicate': False,
            'points_awarded': points,
            'reason': self._get_reason(engagement_score, is_spam)
        }
    
    def _two_way_participation(self, message: Dict, recent_messages: List[Dict]) -> float:
        """Score based on balanced conversation"""
        if len(recent_messages) < 2:
            return 0.5
        
        recent_window = recent_messages[-20:]
        user_counts = {}
        
        for msg in recent_window:
            user_id = msg['sender_id']
            user_counts[user_id] = user_counts.get(user_id, 0) + 1
        
        if len(user_counts) < 2:
            return 0.2  # Monologue
        
        counts = list(user_counts.values())
        min_count = min(counts)
        max_count = max(counts)
        
        if max_count == 0:
            return 0.5
        
        balance_ratio = min_count / max_count
        return balance_ratio
    
    def _response_time_score(self, message: Dict, recent_messages: List[Dict]) -> float:
        """Score based on response time"""
        if len(recent_messages) < 1:
            return 1.0
        
        last_message = recent_messages[-1]
        
        # Different sender (actual response)
        if last_message['sender_id'] != message['sender_id']:
            time_diff = (
                datetime.fromisoformat(message['created_at']) -
                datetime.fromisoformat(last_message['created_at'])
            ).total_seconds()
            
            if time_diff < 1:
                return 0.3  # Too fast
            elif time_diff <= 60:
                return 1.0  # Good
            elif time_diff <= 600:
                return 0.8  # Acceptable
            elif time_diff <= 3600:
                return 0.5  # Slow
            else:
                return 0.3  # Very slow
        
        return 0.5
    
    def _conversation_continuity(self, recent_messages: List[Dict]) -> float:
        """Score based on conversation flow"""
        if len(recent_messages) < 3:
            return 0.7
        
        recent = recent_messages[-10:]
        alternations = 0
        
        for i in range(1, len(recent)):
            if recent[i]['sender_id'] != recent[i-1]['sender_id']:
                alternations += 1
        
        alternation_ratio = alternations / (len(recent) - 1)
        return min(alternation_ratio * 1.5, 1.0)
    
    def _message_length_score(self, content: str) -> float:
        """Score based on message substance"""
        length = len(content.strip())
        
        if length <= 2:
            return 0.2
        elif length <= 5:
            return 0.4
        elif length <= 20:
            return 0.7
        elif length <= 100:
            return 1.0
        else:
            return 0.9
    
    def _interaction_variety(self, recent_messages: List[Dict]) -> float:
        """Score based on variety of interactions"""
        if len(recent_messages) < 10:
            return 0.7
        
        recent = recent_messages[-20:]
        unique_messages = set()
        
        for msg in recent:
            normalized = normalize_message(msg['content'])
            if len(normalized) > 2:
                unique_messages.add(normalized)
        
        variety_ratio = len(unique_messages) / len(recent)
        return variety_ratio
    
    def _detect_spam(self, signals: Dict, recent_messages: List[Dict]) -> bool:
        """Detect spam patterns"""
        # Very short messages repeatedly
        if signals['message_length'] < 0.3 and signals['interaction_variety'] < 0.3:
            return True
        
        # No two-way participation
        if signals['two_way_participation'] < 0.3:
            return True
        
        # Too fast responses consistently
        if signals['response_time'] < 0.4:
            # Check consistency
            fast_count = 0
            for i in range(1, min(len(recent_messages), 10)):
                if recent_messages[i]['sender_id'] != recent_messages[i-1]['sender_id']:
                    time_diff = (
                        datetime.fromisoformat(recent_messages[i]['created_at']) -
                        datetime.fromisoformat(recent_messages[i-1]['created_at'])
                    ).total_seconds()
                    if time_diff < 1.5:
                        fast_count += 1
            
            if fast_count > 5:
                return True
        
        return False
    
    def _calculate_points(self, engagement_score: float, is_spam: bool) -> int:
        """Convert engagement score to points"""
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
        """Get reason for point allocation"""
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
