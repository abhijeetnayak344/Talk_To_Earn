# Database Schema Design

## Overview

This document outlines the complete database schema for the Talk to Earn platform. The design prioritizes:

- **Data integrity** - Foreign keys and constraints
- **Query performance** - Strategic indexing
- **Scalability** - Partitioning strategies for high-volume tables
- **Auditability** - Immutable transaction logs
- **Privacy** - Separation of sensitive data

## Technology

**Primary Database**: PostgreSQL 15+

**Why PostgreSQL?**
- ACID compliance for financial transactions
- JSON/JSONB support for flexible metadata
- Full-text search capabilities
- Mature replication and backup tools
- Excellent performance for read-heavy workloads
- Partitioning support for large tables

## Database Architecture

```
┌─────────────────────────────────────┐
│         Main Database (RDS)         │
├─────────────────────────────────────┤
│  - Users & Auth                     │
│  - Messages & Conversations         │
│  - Points & Rewards                 │
│  - Groups & Couples                 │
└─────────────────────────────────────┘
           │
           │ Replication
           ▼
┌─────────────────────────────────────┐
│      Read Replicas (RDS)            │
│  - Analytics queries                │
│  - Reporting                        │
│  - Message history                  │
└─────────────────────────────────────┘
```

## Schema Diagram

```
users ─────────┐
  │            │
  │            ├─── user_profiles
  │            │
  │            ├─── devices
  │            │
  │            ├─── sessions
  │            │
  │            └─── auth_tokens
  │
  ├─── conversations
  │      │
  │      ├─── conversation_members
  │      │
  │      └─── messages ─────┬─── message_reactions
  │                         │
  │                         └─── message_attachments
  │
  ├─── groups ──────┬─── group_members
  │                 │
  │                 └─── group_roles
  │
  ├─── couples ─────┬─── couple_invites
  │                 │
  │                 └─── couple_activity
  │
  ├─── calls ───────└─── call_participants
  │
  ├─── statuses ────┬─── status_views
  │                 │
  │                 └─── status_reactions
  │
  ├─── point_accounts
  │      │
  │      └─── point_transactions
  │
  ├─── engagement_events
  │
  ├─── redemptions ─── vouchers
  │
  ├─── notifications
  │
  ├─── blocks
  │
  └─── reports
```

## Core Tables

### 1. Users & Authentication

#### users
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number VARCHAR(20) UNIQUE,
    phone_verified BOOLEAN DEFAULT FALSE,
    email VARCHAR(255) UNIQUE,
    email_verified BOOLEAN DEFAULT FALSE,
    password_hash VARCHAR(255) NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100),
    status_message VARCHAR(200),
    profile_photo_url TEXT,
    last_seen_at TIMESTAMP,
    is_online BOOLEAN DEFAULT FALSE,
    account_status VARCHAR(20) DEFAULT 'active', -- active, suspended, banned, deleted
    reputation_score INTEGER DEFAULT 100,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP -- Soft delete
);

CREATE INDEX idx_users_phone ON users(phone_number) WHERE phone_number IS NOT NULL;
CREATE INDEX idx_users_email ON users(email) WHERE email IS NOT NULL;
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_online ON users(is_online) WHERE is_online = TRUE;
CREATE INDEX idx_users_account_status ON users(account_status);
```

#### user_profiles
```sql
CREATE TABLE user_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    bio TEXT,
    date_of_birth DATE,
    gender VARCHAR(20),
    country VARCHAR(100),
    city VARCHAR(100),
    language_preference VARCHAR(10) DEFAULT 'en',
    timezone VARCHAR(50),
    privacy_settings JSONB DEFAULT '{
        "profile_photo": "everyone",
        "last_seen": "everyone",
        "status": "everyone",
        "online_status": "everyone",
        "read_receipts": true
    }'::jsonb,
    notification_settings JSONB DEFAULT '{
        "push_notifications": true,
        "message_notifications": true,
        "call_notifications": true,
        "email_notifications": true
    }'::jsonb,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### devices
```sql
CREATE TABLE devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_name VARCHAR(100),
    device_type VARCHAR(50), -- ios, android, web
    device_token VARCHAR(255), -- FCM/APNS token
    device_fingerprint VARCHAR(255),
    last_active_at TIMESTAMP DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_devices_user ON devices(user_id);
CREATE INDEX idx_devices_token ON devices(device_token);
CREATE INDEX idx_devices_fingerprint ON devices(device_fingerprint);
```

#### sessions
```sql
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    ip_address INET,
    location_country VARCHAR(100),
    location_city VARCHAR(100),
    is_suspicious BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    last_activity_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(session_token);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);
```

#### auth_tokens (Refresh tokens)
```sql
CREATE TABLE auth_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    is_revoked BOOLEAN DEFAULT FALSE,
    revoked_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_auth_tokens_user ON auth_tokens(user_id);
CREATE INDEX idx_auth_tokens_hash ON auth_tokens(token_hash);
CREATE INDEX idx_auth_tokens_expires ON auth_tokens(expires_at);
```

#### verification_codes
```sql
CREATE TABLE verification_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    code VARCHAR(10) NOT NULL,
    code_type VARCHAR(20) NOT NULL, -- phone, email, password_reset
    phone_number VARCHAR(20),
    email VARCHAR(255),
    attempts INTEGER DEFAULT 0,
    is_verified BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_verification_user ON verification_codes(user_id);
CREATE INDEX idx_verification_phone ON verification_codes(phone_number);
CREATE INDEX idx_verification_email ON verification_codes(email);
```

#### login_attempts
```sql
CREATE TABLE login_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    phone_number VARCHAR(20),
    email VARCHAR(255),
    ip_address INET NOT NULL,
    user_agent TEXT,
    success BOOLEAN NOT NULL,
    failure_reason VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_login_attempts_user ON login_attempts(user_id, created_at DESC);
CREATE INDEX idx_login_attempts_ip ON login_attempts(ip_address, created_at DESC);
```

### 2. Messaging System

#### conversations
```sql
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(20) NOT NULL, -- direct, group
    name VARCHAR(100), -- For groups
    photo_url TEXT,
    created_by UUID REFERENCES users(id),
    last_message_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_conversations_type ON conversations(type);
CREATE INDEX idx_conversations_last_message ON conversations(last_message_at DESC);
```

#### conversation_members
```sql
CREATE TABLE conversation_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member', -- admin, moderator, member
    joined_at TIMESTAMP DEFAULT NOW(),
    left_at TIMESTAMP,
    last_read_at TIMESTAMP,
    is_muted BOOLEAN DEFAULT FALSE,
    muted_until TIMESTAMP,
    UNIQUE(conversation_id, user_id)
);

CREATE INDEX idx_conversation_members_conv ON conversation_members(conversation_id);
CREATE INDEX idx_conversation_members_user ON conversation_members(user_id);
CREATE INDEX idx_conversation_members_active ON conversation_members(conversation_id, user_id) 
    WHERE left_at IS NULL;
```

#### messages (Partitioned by created_at - monthly)
```sql
CREATE TABLE messages (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id),
    message_type VARCHAR(20) DEFAULT 'text', -- text, image, video, audio, document, voice
    content TEXT,
    reply_to_message_id UUID,
    forwarded_from_message_id UUID,
    is_edited BOOLEAN DEFAULT FALSE,
    edited_at TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    metadata JSONB, -- For storing extra info like link previews
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Create monthly partitions
CREATE TABLE messages_2024_01 PARTITION OF messages
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE messages_2024_02 PARTITION OF messages
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- Continue creating partitions...

CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender ON messages(sender_id, created_at DESC);
CREATE INDEX idx_messages_reply ON messages(reply_to_message_id) WHERE reply_to_message_id IS NOT NULL;
```

#### message_reactions
```sql
CREATE TABLE message_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reaction VARCHAR(10) NOT NULL, -- emoji
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(message_id, user_id, reaction)
);

CREATE INDEX idx_reactions_message ON message_reactions(message_id);
CREATE INDEX idx_reactions_user ON message_reactions(user_id);
```

#### message_attachments
```sql
CREATE TABLE message_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL,
    file_type VARCHAR(50) NOT NULL, -- image/jpeg, video/mp4, etc.
    file_url TEXT NOT NULL,
    file_name VARCHAR(255),
    file_size BIGINT, -- bytes
    thumbnail_url TEXT,
    duration INTEGER, -- For audio/video (seconds)
    width INTEGER, -- For images/videos
    height INTEGER, -- For images/videos
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_attachments_message ON message_attachments(message_id);
```

#### message_delivery (For tracking delivery and read status)
```sql
CREATE TABLE message_delivery (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    delivered_at TIMESTAMP,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(message_id, user_id)
);

CREATE INDEX idx_delivery_message ON message_delivery(message_id);
CREATE INDEX idx_delivery_user ON message_delivery(user_id);
```

### 3. Groups

#### groups
```sql
CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID UNIQUE NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    photo_url TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    member_limit INTEGER DEFAULT 256,
    settings JSONB DEFAULT '{
        "anyone_can_send": true,
        "only_admins_can_change_settings": true,
        "approval_required": false
    }'::jsonb,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_groups_conversation ON groups(conversation_id);
CREATE INDEX idx_groups_created_by ON groups(created_by);
```

#### group_members
```sql
CREATE TABLE group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member', -- admin, moderator, member
    added_by UUID REFERENCES users(id),
    joined_at TIMESTAMP DEFAULT NOW(),
    left_at TIMESTAMP,
    UNIQUE(group_id, user_id)
);

CREATE INDEX idx_group_members_group ON group_members(group_id);
CREATE INDEX idx_group_members_user ON group_members(user_id);
CREATE INDEX idx_group_members_active ON group_members(group_id, user_id) 
    WHERE left_at IS NULL;
```

#### group_invites
```sql
CREATE TABLE group_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    invite_code VARCHAR(50) UNIQUE NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id),
    max_uses INTEGER,
    use_count INTEGER DEFAULT 0,
    expires_at TIMESTAMP,
    is_revoked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_group_invites_code ON group_invites(invite_code);
CREATE INDEX idx_group_invites_group ON group_invites(group_id);
```

### 4. Couples System

#### couples
```sql
CREATE TABLE couples (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_a_id UUID NOT NULL REFERENCES users(id),
    user_b_id UUID NOT NULL REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'active', -- active, disconnected
    couple_name VARCHAR(100),
    couple_photo_url TEXT,
    anniversary_date DATE,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_interaction_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    disconnected_at TIMESTAMP,
    CHECK (user_a_id != user_b_id),
    UNIQUE(user_a_id, user_b_id)
);

CREATE INDEX idx_couples_user_a ON couples(user_a_id);
CREATE INDEX idx_couples_user_b ON couples(user_b_id);
CREATE INDEX idx_couples_status ON couples(status);
```

#### couple_invites
```sql
CREATE TABLE couple_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_user_id UUID NOT NULL REFERENCES users(id),
    to_user_id UUID NOT NULL REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, rejected, cancelled
    message TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    responded_at TIMESTAMP,
    CHECK (from_user_id != to_user_id)
);

CREATE INDEX idx_couple_invites_to ON couple_invites(to_user_id, status);
CREATE INDEX idx_couple_invites_from ON couple_invites(from_user_id);
```

#### couple_activity
```sql
CREATE TABLE couple_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    couple_id UUID NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL, -- message, call, status_interaction
    activity_metadata JSONB,
    points_awarded INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_couple_activity_couple ON couple_activity(couple_id, created_at DESC);
CREATE INDEX idx_couple_activity_type ON couple_activity(activity_type);
```

### 5. Calls

#### calls
```sql
CREATE TABLE calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id),
    call_type VARCHAR(20) NOT NULL, -- audio, video
    initiated_by UUID NOT NULL REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'initiated', -- initiated, ringing, active, ended, missed, rejected
    started_at TIMESTAMP,
    ended_at TIMESTAMP,
    duration INTEGER, -- seconds
    quality_rating INTEGER, -- 1-5
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_calls_conversation ON calls(conversation_id);
CREATE INDEX idx_calls_initiator ON calls(initiated_by, created_at DESC);
CREATE INDEX idx_calls_status ON calls(status);
```

#### call_participants
```sql
CREATE TABLE call_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    joined_at TIMESTAMP,
    left_at TIMESTAMP,
    status VARCHAR(20), -- invited, ringing, joined, left, missed
    UNIQUE(call_id, user_id)
);

CREATE INDEX idx_call_participants_call ON call_participants(call_id);
CREATE INDEX idx_call_participants_user ON call_participants(user_id);
```

### 6. Status System

#### statuses
```sql
CREATE TABLE statuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content_type VARCHAR(20) NOT NULL, -- text, image, video
    content_url TEXT,
    caption TEXT,
    thumbnail_url TEXT,
    background_color VARCHAR(20),
    duration INTEGER DEFAULT 24, -- hours
    view_count INTEGER DEFAULT 0,
    reaction_count INTEGER DEFAULT 0,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_statuses_user ON statuses(user_id, created_at DESC);
CREATE INDEX idx_statuses_expires ON statuses(expires_at);
```

#### status_views
```sql
CREATE TABLE status_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status_id UUID NOT NULL REFERENCES statuses(id) ON DELETE CASCADE,
    viewer_id UUID NOT NULL REFERENCES users(id),
    viewed_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(status_id, viewer_id)
);

CREATE INDEX idx_status_views_status ON status_views(status_id);
CREATE INDEX idx_status_views_viewer ON status_views(viewer_id);
```

#### status_reactions
```sql
CREATE TABLE status_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status_id UUID NOT NULL REFERENCES statuses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    reaction VARCHAR(10) NOT NULL, -- emoji
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(status_id, user_id)
);

CREATE INDEX idx_status_reactions_status ON status_reactions(status_id);
CREATE INDEX idx_status_reactions_user ON status_reactions(user_id);
```

### 7. Points & Rewards System

#### point_accounts
```sql
CREATE TABLE point_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    couple_id UUID UNIQUE REFERENCES couples(id) ON DELETE CASCADE,
    account_type VARCHAR(20) NOT NULL, -- personal, couple
    balance INTEGER DEFAULT 0 CHECK (balance >= 0),
    lifetime_earned INTEGER DEFAULT 0,
    lifetime_spent INTEGER DEFAULT 0,
    daily_earned_today INTEGER DEFAULT 0,
    daily_limit INTEGER DEFAULT 500,
    last_daily_reset DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CHECK (
        (user_id IS NOT NULL AND couple_id IS NULL AND account_type = 'personal') OR
        (user_id IS NULL AND couple_id IS NOT NULL AND account_type = 'couple')
    )
);

CREATE INDEX idx_point_accounts_user ON point_accounts(user_id);
CREATE INDEX idx_point_accounts_couple ON point_accounts(couple_id);
```

#### point_transactions (Immutable ledger)
```sql
CREATE TABLE point_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES point_accounts(id),
    user_id UUID REFERENCES users(id), -- Who earned/spent
    couple_id UUID REFERENCES couples(id),
    amount INTEGER NOT NULL, -- Positive for earning, negative for spending
    transaction_type VARCHAR(50) NOT NULL, -- chat, call, status, redemption, adjustment
    event_id UUID UNIQUE, -- Idempotency key
    event_type VARCHAR(50),
    description TEXT,
    metadata JSONB,
    balance_after INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_point_transactions_account ON point_transactions(account_id, created_at DESC);
CREATE INDEX idx_point_transactions_user ON point_transactions(user_id, created_at DESC);
CREATE INDEX idx_point_transactions_event ON point_transactions(event_id) WHERE event_id IS NOT NULL;
CREATE INDEX idx_point_transactions_type ON point_transactions(transaction_type);
```

#### rewards
```sql
CREATE TABLE rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(50), -- voucher, experience, merchandise
    reward_type VARCHAR(20) NOT NULL, -- personal, couple
    points_required INTEGER NOT NULL CHECK (points_required > 0),
    image_url TEXT,
    partner_name VARCHAR(100),
    terms_and_conditions TEXT,
    total_quantity INTEGER,
    remaining_quantity INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_rewards_type ON rewards(reward_type, is_active);
CREATE INDEX idx_rewards_points ON rewards(points_required);
CREATE INDEX idx_rewards_category ON rewards(category);
```

#### redemptions
```sql
CREATE TABLE redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reward_id UUID NOT NULL REFERENCES rewards(id),
    user_id UUID REFERENCES users(id),
    couple_id UUID REFERENCES couples(id),
    points_spent INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- pending, confirmed, fulfilled, cancelled
    transaction_id UUID REFERENCES point_transactions(id),
    redemption_code VARCHAR(50) UNIQUE,
    expires_at TIMESTAMP,
    fulfilled_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_redemptions_user ON redemptions(user_id, created_at DESC);
CREATE INDEX idx_redemptions_couple ON redemptions(couple_id, created_at DESC);
CREATE INDEX idx_redemptions_reward ON redemptions(reward_id);
CREATE INDEX idx_redemptions_status ON redemptions(status);
CREATE INDEX idx_redemptions_code ON redemptions(redemption_code);
```

#### vouchers
```sql
CREATE TABLE vouchers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    redemption_id UUID UNIQUE NOT NULL REFERENCES redemptions(id),
    voucher_code VARCHAR(100) UNIQUE NOT NULL,
    voucher_type VARCHAR(50), -- discount_code, gift_card, booking_reference
    voucher_value DECIMAL(10,2),
    partner_name VARCHAR(100),
    instructions TEXT,
    terms TEXT,
    is_used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_vouchers_redemption ON vouchers(redemption_id);
CREATE INDEX idx_vouchers_code ON vouchers(voucher_code);
```

### 8. Engagement & Fraud Detection

#### engagement_events
```sql
CREATE TABLE engagement_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    conversation_id UUID REFERENCES conversations(id),
    event_type VARCHAR(50) NOT NULL, -- message_sent, call_completed, status_posted
    engagement_score DECIMAL(3,2), -- 0.00 to 1.00
    signals JSONB, -- Store all engagement signals
    points_awarded INTEGER DEFAULT 0,
    is_spam BOOLEAN DEFAULT FALSE,
    is_duplicate BOOLEAN DEFAULT FALSE,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_engagement_user ON engagement_events(user_id, created_at DESC);
CREATE INDEX idx_engagement_conversation ON engagement_events(conversation_id);
CREATE INDEX idx_engagement_type ON engagement_events(event_type);
CREATE INDEX idx_engagement_spam ON engagement_events(is_spam) WHERE is_spam = TRUE;
```

#### fraud_events
```sql
CREATE TABLE fraud_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    event_type VARCHAR(50) NOT NULL, -- suspicious_login, rate_limit_exceeded, bot_behavior
    severity VARCHAR(20) DEFAULT 'medium', -- low, medium, high, critical
    description TEXT,
    metadata JSONB,
    ip_address INET,
    device_id UUID REFERENCES devices(id),
    action_taken VARCHAR(50), -- none, warning, suspension, ban
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_fraud_user ON fraud_events(user_id, created_at DESC);
CREATE INDEX idx_fraud_type ON fraud_events(event_type);
CREATE INDEX idx_fraud_severity ON fraud_events(severity);
CREATE INDEX idx_fraud_ip ON fraud_events(ip_address);
```

#### rate_limits
```sql
CREATE TABLE rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    limit_type VARCHAR(50) NOT NULL, -- messages, calls, points
    period VARCHAR(20) NOT NULL, -- minute, hour, day
    count INTEGER DEFAULT 0,
    reset_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, limit_type, period)
);

CREATE INDEX idx_rate_limits_user ON rate_limits(user_id);
CREATE INDEX idx_rate_limits_reset ON rate_limits(reset_at);
```

### 9. Social Features

#### blocks
```sql
CREATE TABLE blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(blocker_id, blocked_id),
    CHECK (blocker_id != blocked_id)
);

CREATE INDEX idx_blocks_blocker ON blocks(blocker_id);
CREATE INDEX idx_blocks_blocked ON blocks(blocked_id);
```

#### reports
```sql
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES users(id),
    reported_user_id UUID REFERENCES users(id),
    reported_message_id UUID,
    reported_group_id UUID REFERENCES groups(id),
    report_type VARCHAR(50) NOT NULL, -- spam, harassment, inappropriate_content, fraud
    reason TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- pending, investigating, resolved, dismissed
    resolved_by UUID REFERENCES users(id), -- Admin who resolved
    resolution_notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    resolved_at TIMESTAMP
);

CREATE INDEX idx_reports_reporter ON reports(reporter_id);
CREATE INDEX idx_reports_reported_user ON reports(reported_user_id);
CREATE INDEX idx_reports_status ON reports(status);
```

#### contacts
```sql
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contact_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contact_name VARCHAR(100), -- Custom name
    is_favorite BOOLEAN DEFAULT FALSE,
    added_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, contact_user_id),
    CHECK (user_id != contact_user_id)
);

CREATE INDEX idx_contacts_user ON contacts(user_id);
CREATE INDEX idx_contacts_contact ON contacts(contact_user_id);
CREATE INDEX idx_contacts_favorites ON contacts(user_id, is_favorite) WHERE is_favorite = TRUE;
```

### 10. Notifications

#### notifications
```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL,
    title VARCHAR(200),
    body TEXT,
    data JSONB, -- Additional payload
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_type ON notifications(notification_type);
```

### 11. Analytics & Audit

#### user_analytics
```sql
CREATE TABLE user_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    date DATE NOT NULL,
    messages_sent INTEGER DEFAULT 0,
    messages_received INTEGER DEFAULT 0,
    calls_made INTEGER DEFAULT 0,
    calls_received INTEGER DEFAULT 0,
    points_earned INTEGER DEFAULT 0,
    session_count INTEGER DEFAULT 0,
    total_active_time INTEGER DEFAULT 0, -- seconds
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, date)
);

CREATE INDEX idx_user_analytics_user ON user_analytics(user_id, date DESC);
CREATE INDEX idx_user_analytics_date ON user_analytics(date);
```

#### audit_logs
```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
```

## Views

### Active Users View
```sql
CREATE VIEW active_users AS
SELECT 
    u.id,
    u.username,
    u.is_online,
    u.last_seen_at,
    pa.balance as points_balance,
    COUNT(DISTINCT cm.conversation_id) as active_conversations
FROM users u
LEFT JOIN point_accounts pa ON pa.user_id = u.id
LEFT JOIN conversation_members cm ON cm.user_id = u.id AND cm.left_at IS NULL
WHERE u.account_status = 'active'
GROUP BY u.id, u.username, u.is_online, u.last_seen_at, pa.balance;
```

### Couple Dashboard View
```sql
CREATE VIEW couple_dashboard AS
SELECT 
    c.id as couple_id,
    c.user_a_id,
    c.user_b_id,
    ua.username as user_a_username,
    ub.username as user_b_username,
    c.current_streak,
    c.longest_streak,
    pa.balance as couple_points,
    COUNT(ca.id) as total_activities,
    c.last_interaction_at
FROM couples c
JOIN users ua ON ua.id = c.user_a_id
JOIN users ub ON ub.id = c.user_b_id
LEFT JOIN point_accounts pa ON pa.couple_id = c.id
LEFT JOIN couple_activity ca ON ca.couple_id = c.id
WHERE c.status = 'active'
GROUP BY c.id, c.user_a_id, c.user_b_id, ua.username, ub.username, 
         c.current_streak, c.longest_streak, pa.balance, c.last_interaction_at;
```

## Database Functions

### Update Last Seen Trigger
```sql
CREATE OR REPLACE FUNCTION update_last_seen()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE users 
    SET last_seen_at = NOW(), 
        updated_at = NOW()
    WHERE id = NEW.user_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_last_seen
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION update_last_seen();
```

### Daily Rate Limit Reset
```sql
CREATE OR REPLACE FUNCTION reset_daily_limits()
RETURNS void AS $$
BEGIN
    UPDATE point_accounts
    SET daily_earned_today = 0,
        last_daily_reset = CURRENT_DATE
    WHERE last_daily_reset < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Schedule this to run daily via cron or application scheduler
```

### Calculate Couple Streak
```sql
CREATE OR REPLACE FUNCTION update_couple_streak(p_couple_id UUID)
RETURNS void AS $$
DECLARE
    last_interaction TIMESTAMP;
    hours_since INTEGER;
BEGIN
    SELECT last_interaction_at INTO last_interaction
    FROM couples WHERE id = p_couple_id;
    
    hours_since := EXTRACT(EPOCH FROM (NOW() - last_interaction)) / 3600;
    
    IF hours_since > 24 THEN
        -- Streak broken
        UPDATE couples 
        SET current_streak = 0,
            updated_at = NOW()
        WHERE id = p_couple_id;
    ELSIF hours_since < 24 AND DATE(last_interaction) < CURRENT_DATE THEN
        -- New day, increment streak
        UPDATE couples 
        SET current_streak = current_streak + 1,
            longest_streak = GREATEST(longest_streak, current_streak + 1),
            updated_at = NOW()
        WHERE id = p_couple_id;
    END IF;
END;
$$ LANGUAGE plpgsql;
```

## Partitioning Strategy

### Messages Table
- Partition by month based on `created_at`
- Automatic partition creation via cron job or application logic
- Retention: Keep last 12 months in hot storage, archive older

### Point Transactions Table
- Consider partitioning by year if volume is very high
- Never delete (immutable audit trail)

## Backup & Retention

```yaml
Database Backups:
  - Automated daily snapshots (RDS)
  - Point-in-time recovery enabled
  - Cross-region replication for disaster recovery
  - Retention: 30 days for daily, 12 months for monthly

Table-Specific:
  - messages: Archive after 12 months to S3
  - statuses: Auto-delete after expiry (24 hours)
  - sessions: Delete expired sessions daily
  - auth_tokens: Delete revoked tokens after 30 days
  - verification_codes: Delete after 1 hour of expiry
```

## Performance Considerations

### Connection Pooling
```
Max connections: 100 (per service)
Min connections: 10
Idle timeout: 10 minutes
```

### Query Optimization
- Use prepared statements
- Avoid N+1 queries (use JOINs or batching)
- Pagination for large result sets
- Denormalization where appropriate (e.g., view counts)

### Caching Strategy
- User profiles: Cache in Redis (5 min TTL)
- Online status: Real-time in Redis
- Conversation metadata: Cache (10 min TTL)
- Point balances: Cache (1 min TTL)

---

This schema is production-ready and designed to scale to millions of users.
