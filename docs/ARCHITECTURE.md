# System Architecture

## Overview

Talk to Earn is designed as a distributed, event-driven, microservices-based platform that prioritizes scalability, reliability, and fraud prevention.

## Architecture Principles

1. **Separation of Concerns** - Each service has a single, well-defined responsibility
2. **Event-Driven** - Asynchronous communication via Kafka for loose coupling
3. **API-First** - Well-defined contracts between services
4. **Stateless Services** - Enable horizontal scaling
5. **Idempotency** - All operations can be safely retried
6. **Fail-Fast** - Quick failure detection and circuit breakers
7. **Defense in Depth** - Multiple layers of security and fraud detection

## System Components

### 1. API Gateway

**Responsibilities:**
- Single entry point for all client requests
- Authentication verification (JWT validation)
- Rate limiting (per user, per IP, per endpoint)
- Request routing to appropriate services
- Response aggregation (if needed)
- SSL termination

**Technology:** Kong / AWS API Gateway / nginx

**Rate Limiting Rules:**
```
Authentication endpoints: 5 requests/minute/IP
Message send: 30 messages/minute/user
API calls: 100 requests/minute/user
WebSocket connections: 5 connections/user
```

### 2. Auth Service

**Responsibilities:**
- User registration and login
- JWT token generation and validation
- Refresh token management and rotation
- Phone/email verification
- Password reset
- Device management
- Session tracking
- Suspicious login detection

**Database:** PostgreSQL

**Tables:**
- `users` - Core user data
- `auth_tokens` - JWT refresh tokens
- `devices` - Registered devices
- `sessions` - Active sessions
- `verification_codes` - OTP codes
- `login_attempts` - Failed login tracking

**API Endpoints:**
```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/refresh
POST /api/auth/verify-phone
POST /api/auth/verify-email
POST /api/auth/forgot-password
GET  /api/auth/sessions
DELETE /api/auth/sessions/:sessionId
```

**Security Features:**
- Bcrypt password hashing (cost factor: 12)
- JWT with short expiry (15 minutes)
- Refresh token rotation
- Device fingerprinting
- Rate limiting on failed attempts
- Account lockout after 5 failed attempts
- Suspicious login alerts (new location, new device)

### 3. Chat Service

**Responsibilities:**
- Real-time message delivery
- WebSocket connection management
- Message persistence
- Message history retrieval
- Online/offline status
- Typing indicators
- Read receipts
- Message reactions
- File upload handling

**Technology:** Node.js + Socket.io / Go + gorilla/websocket

**Database:** PostgreSQL (messages), Redis (real-time state)

**WebSocket Events:**
```
Client → Server:
- message:send
- message:edit
- message:delete
- typing:start
- typing:stop
- message:read
- reaction:add
- reaction:remove

Server → Client:
- message:new
- message:edited
- message:deleted
- typing:user
- user:online
- user:offline
- message:delivered
- message:read
- reaction:added
```

**Message Flow:**
```
Client A                Chat Service            Redis Pub/Sub         Client B
   │                         │                       │                    │
   │──message:send──→        │                       │                    │
   │                         │──validate──→          │                    │
   │                         │──save to DB──→        │                    │
   │                         │──publish──→           │                    │
   │                         │                       │──subscribe──→      │
   │                         │                       │                    │
   │←──ack────────────       │                       │                    │
   │                         │                       │        ←──message:new
   │                         │←──emit Kafka event─→  │                    │
```

**Redis Data Structures:**
```
# Online users
SET online:users {userId1, userId2, ...}

# User connections (for routing)
HASH user:connections userId → [connectionId1, connectionId2]

# Typing indicators
SET typing:conversation:123 {userId1} EX 5

# Undelivered messages queue
LIST pending:user:456 [messageId1, messageId2]
```

**Scaling Strategy:**
- Multiple chat service instances
- Redis pub/sub for cross-instance communication
- Sticky sessions not required
- Message persistence guarantees delivery

### 4. User Service

**Responsibilities:**
- User profile management
- Privacy settings
- Block/unblock users
- Report users
- Friend/contact management
- User search
- Profile photos (S3 URLs)

**Database:** PostgreSQL

**API Endpoints:**
```
GET    /api/users/:userId
PUT    /api/users/:userId
GET    /api/users/search?q=query
POST   /api/users/:userId/block
DELETE /api/users/:userId/block
POST   /api/users/:userId/report
GET    /api/users/:userId/contacts
```

### 5. Group Service

**Responsibilities:**
- Group creation and management
- Member management (add, remove, promote)
- Group settings
- Admin/moderator roles
- Invite link generation
- Group messaging coordination

**Database:** PostgreSQL

**Tables:**
- `groups`
- `group_members`
- `group_roles`
- `group_invites`

### 6. Couple Service

**Responsibilities:**
- Couple invitation and pairing
- Couple profile management
- Couple streak tracking
- Couple activity logging
- Couple dissolution
- Couple rewards eligibility

**Database:** PostgreSQL

**Tables:**
- `couples`
- `couple_invites`
- `couple_activity`
- `couple_streaks`

**Business Logic:**
- One user can be in only one active couple at a time
- Both users must accept invitation
- Personal points remain separate
- Couple points are shared
- Streak breaks if no interaction for 24 hours

### 7. Engagement Engine

**Responsibilities:**
- Analyze conversation quality
- Detect spam and duplicate messages
- Calculate engagement scores
- Emit engagement events to Kafka
- Multi-language support

**Technology:** Python (for NLP libraries) + FastAPI

**Input:** Message events from Kafka
**Output:** Engagement events to Kafka

**Analysis Pipeline:**
```
Message Event
    ↓
Normalization (lowercase, remove punctuation)
    ↓
Duplicate Check (exact match in last N messages)
    ↓
Semantic Similarity (vector embeddings)
    ↓
Conversation Context Analysis
    ↓
Engagement Score Calculation
    ↓
Spam Detection
    ↓
Emit Engagement Event
```

**Engagement Signals:**
```python
{
    "two_way_participation": 0.0 - 1.0,
    "response_time_score": 0.0 - 1.0,
    "conversation_continuity": 0.0 - 1.0,
    "message_uniqueness": 0.0 - 1.0,
    "interaction_variety": 0.0 - 1.0,
    "session_engagement": 0.0 - 1.0
}

# Final Score
engagement_score = weighted_average(signals)

# Points calculation
if engagement_score > 0.7:
    points = 2
elif engagement_score > 0.4:
    points = 1
else:
    points = 0  # Low-quality interaction
```

**Duplicate Detection:**
```python
# Exact duplicate
if message in recent_messages[-10:]:
    return 0 points

# Near duplicate (Levenshtein distance)
if edit_distance(message, recent) < threshold:
    return 0 points

# Semantic similarity (future)
if cosine_similarity(embedding(message), embedding(recent)) > 0.9:
    return 0 points
```

### 8. Reward Service

**Responsibilities:**
- Point wallet management
- Transaction ledger
- Reward catalog
- Redemption processing
- Voucher generation
- Idempotency enforcement

**Database:** PostgreSQL

**Tables:**
- `point_accounts` - Current balances
- `point_transactions` - Immutable ledger
- `rewards` - Available rewards
- `redemptions` - Redemption history
- `vouchers` - Generated vouchers

**Point Transaction Schema:**
```sql
CREATE TABLE point_transactions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    couple_id UUID,
    amount INTEGER NOT NULL,  -- Can be negative for redemptions
    type VARCHAR(50) NOT NULL,  -- 'chat', 'call', 'status', 'redemption'
    event_id UUID,  -- Idempotency key
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_pt_user ON point_transactions(user_id, created_at DESC);
CREATE UNIQUE INDEX idx_pt_event ON point_transactions(event_id);
```

**Idempotency:**
```python
def award_points(user_id, amount, event_id, type):
    # event_id ensures duplicate events don't double-award
    try:
        transaction = PointTransaction(
            user_id=user_id,
            amount=amount,
            type=type,
            event_id=event_id  # Unique constraint
        )
        db.session.add(transaction)
        db.session.commit()
        
        # Update balance
        account = PointAccount.query.get(user_id)
        account.balance += amount
        db.session.commit()
        
    except IntegrityError:
        # Event already processed
        pass
```

**Redemption Flow:**
```
User Request
    ↓
Check Balance (with row lock)
    ↓
Validate Reward Availability
    ↓
Start Transaction
    ↓
Deduct Points (negative transaction)
    ↓
Create Redemption Record
    ↓
Generate Voucher
    ↓
Commit Transaction
    ↓
Emit Kafka Event
    ↓
Send Notification
```

### 9. Anti-Fraud Service

**Responsibilities:**
- Monitor user behavior
- Detect bot accounts
- Rate limit enforcement
- Daily earning cap enforcement
- Suspicious pattern detection
- Account reputation scoring

**Technology:** Python + scikit-learn (ML models)

**Detection Strategies:**

**1. Rate Limiting:**
```python
# Daily earning limits
MAX_DAILY_POINTS = 500
MAX_HOURLY_POINTS = 100

# Message limits
MAX_MESSAGES_PER_MINUTE = 30
MAX_DUPLICATE_MESSAGES = 3
```

**2. Bot Detection:**
```python
# Signals of bot behavior:
- Too-regular message intervals
- Same message pattern across multiple conversations
- Unrealistic response times (< 500ms consistently)
- Account age vs. activity level
- Device fingerprint analysis
```

**3. Reputation Score:**
```python
reputation_score = f(
    account_age,
    verified_phone,
    verified_email,
    reports_received,
    blocks_received,
    interaction_diversity,
    redemption_history
)

# Low reputation → Lower daily caps
# High reputation → Higher daily caps
```

### 10. Notification Service

**Responsibilities:**
- Push notification delivery
- Email notifications
- SMS notifications (critical)
- In-app notifications
- Notification preferences
- Delivery tracking

**Technology:** Node.js + Firebase Cloud Messaging + AWS SES

**Kafka Consumer:** Listens to notification events

**Event Types:**
```
- message.new
- call.incoming
- call.missed
- couple.request
- couple.accepted
- reward.unlocked
- reward.redeemed
- points.earned
- streak.reminder
- security.alert
```

### 11. Call Service

**Responsibilities:**
- WebRTC signaling
- Call session management
- Call history
- Call quality monitoring
- Call engagement tracking

**Technology:** Node.js + WebRTC

**Flow:**
```
Caller                  Signal Server           Callee
  │                           │                    │
  │──call:initiate──→         │                    │
  │                           │──call:incoming──→  │
  │                           │                    │
  │                           │←──call:accept──    │
  │←──signaling data─→        │──relay──→          │
  │                           │                    │
  │←─────────Direct P2P Connection─────────────→  │
  │                           │                    │
  │──call:end──→              │                    │
  │                           │──emit Kafka──→     │
```

### 12. Status Service

**Responsibilities:**
- Status upload and storage
- Status viewing
- View tracking
- Status reactions
- Automatic expiry (24 hours)

**Storage:** S3 for media, PostgreSQL for metadata

## Data Flow Examples

### Example 1: User Sends Message

```
1. Client A sends message via WebSocket
2. Chat Service validates and saves to PostgreSQL
3. Chat Service publishes to Redis pub/sub
4. All Chat Service instances receive via Redis
5. Chat Service delivers to Client B (if online)
6. Chat Service emits MESSAGE_SENT event to Kafka
7. Engagement Service consumes event
8. Engagement Service analyzes message
9. Engagement Service emits ENGAGEMENT_CALCULATED event
10. Reward Service consumes event
11. Reward Service awards points (if score > threshold)
12. Notification Service sends push notification
```

### Example 2: User Redeems Reward

```
1. Client sends POST /api/rewards/redeem
2. API Gateway validates JWT and routes
3. Reward Service locks user's point account
4. Reward Service validates balance
5. Reward Service creates negative transaction
6. Reward Service generates voucher
7. Reward Service commits database transaction
8. Reward Service emits REWARD_REDEEMED event
9. Notification Service sends confirmation
10. Analytics Service records redemption
```

## Infrastructure Architecture

### Development Environment

```
Docker Compose:
- api-gateway
- auth-service
- chat-service
- user-service
- engagement-service
- reward-service
- notification-service
- postgres
- redis
- kafka + zookeeper
- minio (S3 compatible)
```

### Production Environment (AWS)

```
┌─────────────────┐
│   CloudFront    │ (CDN for static assets)
└────────┬────────┘
         │
┌────────▼────────┐
│  Load Balancer  │ (ALB)
└────────┬────────┘
         │
┌────────▼────────┐
│   ECS Cluster   │ (Container orchestration)
│   - Services    │
│   - Auto-scaling│
└────────┬────────┘
         │
    ┌────┴────┬─────────┬──────────┐
    ▼         ▼         ▼          ▼
  RDS     ElastiCache  MSK      S3
(PostgreSQL) (Redis)  (Kafka)  (Media)
```

**Cost Optimization:**
- Spot instances for non-critical services
- Auto-scaling based on metrics
- S3 lifecycle policies for old media
- RDS read replicas for scaling reads

## Security Architecture

### Network Security
- VPC with private and public subnets
- Security groups for service isolation
- No direct database access from internet
- Bastion host for admin access

### Application Security
- JWT with short expiry
- Refresh token rotation
- API rate limiting
- Input validation and sanitization
- SQL injection prevention (parameterized queries)
- XSS prevention
- CSRF tokens for web

### Data Security
- TLS 1.3 for all communications
- Encrypted data at rest (RDS encryption)
- Encrypted S3 buckets
- Secrets in AWS Secrets Manager
- Regular security audits

## Monitoring & Observability

### Metrics (Prometheus)
```
- HTTP request rate, latency, errors
- WebSocket connections (active, total)
- Message delivery rate and latency
- Database connection pool utilization
- Cache hit/miss rates
- Queue depths (Kafka lag)
- Point transactions per second
- Fraud detection alerts
```

### Logging (ELK Stack)
```
- Structured JSON logs
- Correlation IDs for request tracing
- Error tracking with stack traces
- Audit logs for sensitive operations
```

### Tracing (Jaeger)
```
- Distributed request tracing
- Service dependency mapping
- Performance bottleneck identification
```

### Alerts
```
Critical:
- Service down
- Database connection failures
- High error rate (> 5%)
- Kafka consumer lag > 10000

Warning:
- High latency (p95 > 500ms)
- Low cache hit rate (< 80%)
- Disk space > 80%
```

## Disaster Recovery

### Backup Strategy
```
- Database: Daily automated backups (7-day retention)
- Point-in-time recovery enabled
- Cross-region replication for critical data
- S3 versioning for media
```

### Recovery Objectives
```
- RPO (Recovery Point Objective): 1 hour
- RTO (Recovery Time Objective): 4 hours
```

### Incident Response
```
1. Alert triggered
2. On-call engineer paged
3. Incident assessment
4. Mitigation actions
5. Post-incident review
6. Update runbooks
```

## Performance Optimization

### Database Optimization
- Proper indexing strategy
- Query optimization
- Connection pooling
- Read replicas for scaling
- Partitioning for large tables (messages)

### Caching Strategy
```
Redis Cache:
- User profiles (TTL: 5 minutes)
- Online users (real-time)
- Conversation metadata (TTL: 10 minutes)
- Reward catalog (TTL: 1 hour)
```

### CDN Strategy
- Static assets cached at edge
- User profile photos
- Status media
- Reward images

## Scalability Targets

```
Phase 1 (MVP): 10,000 users
Phase 2: 100,000 users
Phase 3: 1,000,000 users
Phase 4: 10,000,000 users

Performance Targets:
- Message delivery: < 200ms
- API response: < 100ms (p95)
- WebSocket latency: < 50ms
- Uptime: 99.9% (8.76 hours downtime/year)
```

## Testing Strategy

### Unit Tests
- Service business logic
- Engagement calculations
- Fraud detection algorithms
- Target: 80% code coverage

### Integration Tests
- API endpoint tests
- Database interactions
- Kafka event handling
- WebSocket functionality

### Load Tests
- Simulate 10,000 concurrent users
- Message throughput: 1000 msg/sec
- API endpoints under load
- Database query performance

### Security Tests
- OWASP Top 10 vulnerabilities
- Penetration testing
- SQL injection attempts
- JWT tampering attempts

## Deployment Strategy

### CI/CD Pipeline
```
Git Push
    ↓
GitHub Actions
    ↓
Run Tests
    ↓
Build Docker Images
    ↓
Push to ECR
    ↓
Deploy to Staging
    ↓
Automated Tests
    ↓
Manual Approval
    ↓
Deploy to Production (Blue-Green)
    ↓
Health Checks
    ↓
Switch Traffic
```

### Rollback Strategy
- Keep previous 3 versions
- Automated rollback on health check failure
- Manual rollback capability
- Database migrations must be backwards compatible

---

This architecture is designed to be production-ready, scalable, and maintainable while demonstrating deep understanding of distributed systems principles.
