# API Specifications

## Overview

This document defines the complete REST API and WebSocket API for the Talk to Earn platform.

## General API Conventions

### Base URL
```
Development: http://localhost:8000/api/v1
Production: https://api.talktoearn.com/api/v1
```

### Authentication
All authenticated endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

### Request Headers
```
Content-Type: application/json
Accept: application/json
X-Request-ID: <uuid> (optional, for request tracing)
X-Device-ID: <uuid> (optional, for device tracking)
```

### Response Format
```json
{
  "success": true,
  "data": {},
  "message": "Success message",
  "meta": {
    "request_id": "uuid",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {},
    "field_errors": {
      "email": ["Email is required", "Invalid email format"]
    }
  },
  "meta": {
    "request_id": "uuid",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### HTTP Status Codes
```
200 OK - Successful request
201 Created - Resource created successfully
204 No Content - Successful request with no response body
400 Bad Request - Invalid request parameters
401 Unauthorized - Authentication required or failed
403 Forbidden - Insufficient permissions
404 Not Found - Resource not found
409 Conflict - Resource conflict (duplicate)
422 Unprocessable Entity - Validation errors
429 Too Many Requests - Rate limit exceeded
500 Internal Server Error - Server error
503 Service Unavailable - Service temporarily unavailable
```

### Pagination
```
Query Parameters:
  page: integer (default: 1)
  limit: integer (default: 20, max: 100)

Response:
{
  "data": [...],
  "pagination": {
    "current_page": 1,
    "per_page": 20,
    "total": 150,
    "total_pages": 8,
    "has_next": true,
    "has_prev": false
  }
}
```

### Rate Limiting
```
Response Headers:
  X-RateLimit-Limit: 100
  X-RateLimit-Remaining: 95
  X-RateLimit-Reset: 1642251000

Rate Limit Exceeded Response (429):
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "retry_after": 60
  }
}
```

## 1. Authentication API

### 1.1 Register User
```
POST /auth/register

Request:
{
  "phone_number": "+1234567890",
  "email": "user@example.com",
  "password": "SecurePass123!",
  "username": "johndoe",
  "display_name": "John Doe"
}

Response (201):
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "username": "johndoe",
      "display_name": "John Doe",
      "phone_number": "+1234567890",
      "email": "user@example.com",
      "phone_verified": false,
      "email_verified": false,
      "created_at": "2024-01-15T10:30:00Z"
    },
    "verification_required": true
  },
  "message": "Registration successful. Please verify your phone number."
}

Errors:
  400: Invalid input
  409: Username/email/phone already exists
  422: Validation errors
```

### 1.2 Login
```
POST /auth/login

Request:
{
  "identifier": "johndoe", // username, email, or phone
  "password": "SecurePass123!",
  "device_info": {
    "device_name": "iPhone 13",
    "device_type": "ios",
    "device_token": "fcm_token"
  }
}

Response (200):
{
  "success": true,
  "data": {
    "access_token": "jwt_token",
    "refresh_token": "refresh_token",
    "expires_in": 900, // seconds
    "token_type": "Bearer",
    "user": {
      "id": "uuid",
      "username": "johndoe",
      "display_name": "John Doe",
      "profile_photo_url": "https://...",
      "is_online": true
    }
  }
}

Errors:
  400: Invalid credentials
  401: Account locked (too many failed attempts)
  403: Account suspended/banned
```

### 1.3 Refresh Token
```
POST /auth/refresh

Request:
{
  "refresh_token": "refresh_token"
}

Response (200):
{
  "success": true,
  "data": {
    "access_token": "new_jwt_token",
    "refresh_token": "new_refresh_token",
    "expires_in": 900
  }
}
```

### 1.4 Logout
```
POST /auth/logout
Headers: Authorization: Bearer <token>

Request:
{
  "all_devices": false // If true, logout from all devices
}

Response (204): No content
```

### 1.5 Verify Phone
```
POST /auth/verify-phone

Request:
{
  "phone_number": "+1234567890",
  "code": "123456"
}

Response (200):
{
  "success": true,
  "data": {
    "verified": true,
    "phone_number": "+1234567890"
  }
}
```

### 1.6 Send Verification Code
```
POST /auth/send-verification

Request:
{
  "type": "phone", // phone or email
  "phone_number": "+1234567890"
}

Response (200):
{
  "success": true,
  "message": "Verification code sent",
  "data": {
    "expires_in": 300 // seconds
  }
}

Rate Limit: 3 requests per 15 minutes
```

### 1.7 Forgot Password
```
POST /auth/forgot-password

Request:
{
  "identifier": "user@example.com" // email or phone
}

Response (200):
{
  "success": true,
  "message": "Password reset code sent"
}
```

### 1.8 Reset Password
```
POST /auth/reset-password

Request:
{
  "identifier": "user@example.com",
  "code": "123456",
  "new_password": "NewSecurePass123!"
}

Response (200):
{
  "success": true,
  "message": "Password reset successful"
}
```

### 1.9 Get Sessions
```
GET /auth/sessions
Headers: Authorization: Bearer <token>

Response (200):
{
  "success": true,
  "data": {
    "sessions": [
      {
        "id": "uuid",
        "device_name": "iPhone 13",
        "device_type": "ios",
        "ip_address": "192.168.1.1",
        "location": "New York, US",
        "is_current": true,
        "last_activity": "2024-01-15T10:30:00Z",
        "created_at": "2024-01-10T08:00:00Z"
      }
    ]
  }
}
```

### 1.10 Delete Session
```
DELETE /auth/sessions/:sessionId
Headers: Authorization: Bearer <token>

Response (204): No content
```

## 2. User API

### 2.1 Get User Profile
```
GET /users/:userId
Headers: Authorization: Bearer <token>

Response (200):
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "username": "johndoe",
      "display_name": "John Doe",
      "bio": "Software developer",
      "profile_photo_url": "https://...",
      "status_message": "Busy coding",
      "is_online": true,
      "last_seen_at": "2024-01-15T10:30:00Z",
      "account_status": "active",
      "created_at": "2024-01-01T00:00:00Z"
    },
    "stats": {
      "points_balance": 1500,
      "messages_sent": 1234,
      "calls_made": 45
    }
  }
}
```

### 2.2 Update User Profile
```
PUT /users/:userId
Headers: Authorization: Bearer <token>

Request:
{
  "display_name": "John Smith",
  "bio": "Love coding",
  "status_message": "Available",
  "profile_photo_url": "https://..."
}

Response (200):
{
  "success": true,
  "data": {
    "user": { /* updated user object */ }
  }
}
```

### 2.3 Search Users
```
GET /users/search?q=john&limit=20
Headers: Authorization: Bearer <token>

Response (200):
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "uuid",
        "username": "johndoe",
        "display_name": "John Doe",
        "profile_photo_url": "https://...",
        "is_online": false
      }
    ]
  }
}
```

### 2.4 Block User
```
POST /users/:userId/block
Headers: Authorization: Bearer <token>

Request:
{
  "reason": "Spam messages"
}

Response (201):
{
  "success": true,
  "message": "User blocked successfully"
}
```

### 2.5 Unblock User
```
DELETE /users/:userId/block
Headers: Authorization: Bearer <token>

Response (204): No content
```

### 2.6 Report User
```
POST /users/:userId/report
Headers: Authorization: Bearer <token>

Request:
{
  "report_type": "spam", // spam, harassment, inappropriate_content, fraud
  "reason": "Sending spam messages repeatedly"
}

Response (201):
{
  "success": true,
  "data": {
    "report_id": "uuid",
    "status": "pending"
  },
  "message": "Report submitted successfully"
}
```

### 2.7 Get User Settings
```
GET /users/:userId/settings
Headers: Authorization: Bearer <token>

Response (200):
{
  "success": true,
  "data": {
    "privacy": {
      "profile_photo": "everyone", // everyone, contacts, nobody
      "last_seen": "contacts",
      "status": "everyone",
      "online_status": "everyone",
      "read_receipts": true
    },
    "notifications": {
      "push_notifications": true,
      "message_notifications": true,
      "call_notifications": true,
      "email_notifications": false
    }
  }
}
```

### 2.8 Update User Settings
```
PUT /users/:userId/settings
Headers: Authorization: Bearer <token>

Request:
{
  "privacy": {
    "last_seen": "contacts",
    "read_receipts": false
  },
  "notifications": {
    "email_notifications": true
  }
}

Response (200):
{
  "success": true,
  "data": {
    "settings": { /* updated settings */ }
  }
}
```

## 3. Messaging API

### 3.1 Get Conversations
```
GET /conversations?page=1&limit=20
Headers: Authorization: Bearer <token>

Response (200):
{
  "success": true,
  "data": {
    "conversations": [
      {
        "id": "uuid",
        "type": "direct", // direct, group
        "name": "John Doe", // For groups or custom name
        "photo_url": "https://...",
        "last_message": {
          "id": "uuid",
          "content": "Hey, how are you?",
          "sender_id": "uuid",
          "sender_name": "John",
          "created_at": "2024-01-15T10:30:00Z"
        },
        "unread_count": 3,
        "is_muted": false,
        "participant_count": 2,
        "last_message_at": "2024-01-15T10:30:00Z"
      }
    ]
  },
  "pagination": { /* pagination info */ }
}
```

### 3.2 Get Conversation by ID
```
GET /conversations/:conversationId
Headers: Authorization: Bearer <token>

Response (200):
{
  "success": true,
  "data": {
    "conversation": {
      "id": "uuid",
      "type": "direct",
      "participants": [
        {
          "user_id": "uuid",
          "username": "johndoe",
          "display_name": "John Doe",
          "profile_photo_url": "https://...",
          "is_online": true
        }
      ],
      "created_at": "2024-01-10T08:00:00Z"
    }
  }
}
```

### 3.3 Create Conversation (Direct)
```
POST /conversations
Headers: Authorization: Bearer <token>

Request:
{
  "type": "direct",
  "participant_ids": ["user_uuid"]
}

Response (201):
{
  "success": true,
  "data": {
    "conversation": {
      "id": "uuid",
      "type": "direct",
      "created_at": "2024-01-15T10:30:00Z"
    }
  }
}
```

### 3.4 Get Messages
```
GET /conversations/:conversationId/messages?page=1&limit=50&before=<message_id>
Headers: Authorization: Bearer <token>

Response (200):
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "uuid",
        "conversation_id": "uuid",
        "sender_id": "uuid",
        "sender": {
          "username": "johndoe",
          "display_name": "John Doe",
          "profile_photo_url": "https://..."
        },
        "message_type": "text",
        "content": "Hello!",
        "reply_to": {
          "message_id": "uuid",
          "content": "Hi there"
        },
        "reactions": [
          {
            "user_id": "uuid",
            "reaction": "👍",
            "created_at": "2024-01-15T10:31:00Z"
          }
        ],
        "attachments": [],
        "is_edited": false,
        "is_deleted": false,
        "created_at": "2024-01-15T10:30:00Z",
        "delivery_status": {
          "delivered": true,
          "read": false
        }
      }
    ]
  },
  "pagination": { /* pagination info */ }
}
```

### 3.5 Send Message (via REST - backup, prefer WebSocket)
```
POST /conversations/:conversationId/messages
Headers: Authorization: Bearer <token>

Request:
{
  "message_type": "text",
  "content": "Hello, how are you?",
  "reply_to_message_id": "uuid" // optional
}

Response (201):
{
  "success": true,
  "data": {
    "message": {
      "id": "uuid",
      "conversation_id": "uuid",
      "sender_id": "uuid",
      "content": "Hello, how are you?",
      "created_at": "2024-01-15T10:30:00Z"
    }
  }
}

Rate Limit: 30 messages per minute
```

### 3.6 Edit Message
```
PUT /messages/:messageId
Headers: Authorization: Bearer <token>

Request:
{
  "content": "Updated message content"
}

Response (200):
{
  "success": true,
  "data": {
    "message": {
      "id": "uuid",
      "content": "Updated message content",
      "is_edited": true,
      "edited_at": "2024-01-15T10:32:00Z"
    }
  }
}

Note: Can only edit own messages within 15 minutes
```

### 3.7 Delete Message
```
DELETE /messages/:messageId
Headers: Authorization: Bearer <token>

Query Parameters:
  for_everyone: boolean (default: false)

Response (204): No content

Note: Can delete for everyone only within 1 hour
```

### 3.8 Add Reaction
```
POST /messages/:messageId/reactions
Headers: Authorization: Bearer <token>

Request:
{
  "reaction": "👍"
}

Response (201):
{
  "success": true,
  "data": {
    "reaction": {
      "id": "uuid",
      "message_id": "uuid",
      "user_id": "uuid",
      "reaction": "👍",
      "created_at": "2024-01-15T10:30:00Z"
    }
  }
}
```

### 3.9 Remove Reaction
```
DELETE /messages/:messageId/reactions/:reaction
Headers: Authorization: Bearer <token>

Response (204): No content
```

### 3.10 Mark as Read
```
POST /conversations/:conversationId/read
Headers: Authorization: Bearer <token>

Request:
{
  "last_read_message_id": "uuid"
}

Response (204): No content
```

### 3.11 Upload Attachment
```
POST /attachments
Headers: 
  Authorization: Bearer <token>
  Content-Type: multipart/form-data

Request:
  file: <binary>
  type: "image" // image, video, audio, document

Response (201):
{
  "success": true,
  "data": {
    "attachment": {
      "id": "uuid",
      "file_type": "image/jpeg",
      "file_url": "https://s3.../file.jpg",
      "thumbnail_url": "https://s3.../thumb.jpg",
      "file_size": 1024000,
      "width": 1920,
      "height": 1080
    }
  }
}

Max file sizes:
  - Images: 10MB
  - Videos: 100MB
  - Audio: 50MB
  - Documents: 20MB
```

## 4. Group API

### 4.1 Create Group
```
POST /groups
Headers: Authorization: Bearer <token>

Request:
{
  "name": "Family Group",
  "description": "Our family chat",
  "photo_url": "https://...",
  "member_ids": ["uuid1", "uuid2"],
  "settings": {
    "anyone_can_send": true,
    "only_admins_can_change_settings": true
  }
}

Response (201):
{
  "success": true,
  "data": {
    "group": {
      "id": "uuid",
      "conversation_id": "uuid",
      "name": "Family Group",
      "description": "Our family chat",
      "photo_url": "https://...",
      "member_count": 3,
      "created_by": "uuid",
      "created_at": "2024-01-15T10:30:00Z"
    }
  }
}
```

### 4.2 Get Group Info
```
GET /groups/:groupId
Headers: Authorization: Bearer <token>

Response (200):
{
  "success": true,
  "data": {
    "group": {
      "id": "uuid",
      "name": "Family Group",
      "description": "Our family chat",
      "photo_url": "https://...",
      "member_count": 15,
      "created_by": "uuid",
      "settings": { /* settings */ },
      "my_role": "admin", // admin, moderator, member
      "created_at": "2024-01-10T08:00:00Z"
    }
  }
}
```

### 4.3 Update Group
```
PUT /groups/:groupId
Headers: Authorization: Bearer <token>

Request:
{
  "name": "Updated Group Name",
  "description": "Updated description",
  "settings": {
    "anyone_can_send": false
  }
}

Response (200):
{
  "success": true,
  "data": {
    "group": { /* updated group */ }
  }
}

Permission: Admin only
```

### 4.4 Get Group Members
```
GET /groups/:groupId/members?page=1&limit=50
Headers: Authorization: Bearer <token>

Response (200):
{
  "success": true,
  "data": {
    "members": [
      {
        "user_id": "uuid",
        "username": "johndoe",
        "display_name": "John Doe",
        "profile_photo_url": "https://...",
        "role": "admin",
        "joined_at": "2024-01-10T08:00:00Z"
      }
    ]
  },
  "pagination": { /* pagination */ }
}
```

### 4.5 Add Members
```
POST /groups/:groupId/members
Headers: Authorization: Bearer <token>

Request:
{
  "user_ids": ["uuid1", "uuid2"]
}

Response (201):
{
  "success": true,
  "message": "Members added successfully"
}

Permission: Admin or Moderator
```

### 4.6 Remove Member
```
DELETE /groups/:groupId/members/:userId
Headers: Authorization: Bearer <token>

Response (204): No content

Permission: Admin or Moderator (cannot remove admins)
```

### 4.7 Update Member Role
```
PUT /groups/:groupId/members/:userId/role
Headers: Authorization: Bearer <token>

Request:
{
  "role": "moderator" // admin, moderator, member
}

Response (200):
{
  "success": true,
  "message": "Role updated successfully"
}

Permission: Admin only
```

### 4.8 Leave Group
```
POST /groups/:groupId/leave
Headers: Authorization: Bearer <token>

Response (204): No content
```

### 4.9 Create Invite Link
```
POST /groups/:groupId/invite-link
Headers: Authorization: Bearer <token>

Request:
{
  "max_uses": 100, // optional
  "expires_in": 86400 // seconds, optional
}

Response (201):
{
  "success": true,
  "data": {
    "invite_link": "https://talktoearn.com/invite/abc123",
    "invite_code": "abc123",
    "expires_at": "2024-01-16T10:30:00Z"
  }
}

Permission: Admin or Moderator
```

### 4.10 Join via Invite Link
```
POST /groups/join/:inviteCode
Headers: Authorization: Bearer <token>

Response (200):
{
  "success": true,
  "data": {
    "group": { /* group info */ }
  }
}
```

## 5. Couple API

### 5.1 Send Couple Invite
```
POST /couples/invite
Headers: Authorization: Bearer <token>

Request:
{
  "to_user_id": "uuid",
  "message": "Let's be a couple on Talk to Earn!"
}

Response (201):
{
  "success": true,
  "data": {
    "invite": {
      "id": "uuid",
      "from_user_id": "uuid",
      "to_user_id": "uuid",
      "status": "pending",
      "created_at": "2024-01-15T10:30:00Z"
    }
  }
}

Error:
  409: Already in a couple or pending invite exists
```

### 5.2 Get Couple Invites
```
GET /couples/invites
Headers: Authorization: Bearer <token>

Response (200):
{
  "success": true,
  "data": {
    "received": [
      {
        "id": "uuid",
        "from_user": {
          "id": "uuid",
          "username": "johndoe",
          "display_name": "John Doe",
          "profile_photo_url": "https://..."
        },
        "message": "Let's be a couple!",
        "status": "pending",
        "created_at": "2024-01-15T10:30:00Z"
      }
    ],
    "sent": []
  }
}
```

### 5.3 Respond to Invite
```
POST /couples/invites/:inviteId/respond
Headers: Authorization: Bearer <token>

Request:
{
  "action": "accept" // accept or reject
}

Response (200):
{
  "success": true,
  "data": {
    "couple": {
      "id": "uuid",
      "user_a": { /* user info */ },
      "user_b": { /* user info */ },
      "status": "active",
      "created_at": "2024-01-15T10:30:00Z"
    }
  }
}
```

### 5.4 Get Couple Info
```
GET /couples/me
Headers: Authorization: Bearer <token>

Response (200):
{
  "success": true,
  "data": {
    "couple": {
      "id": "uuid",
      "partner": {
        "id": "uuid",
        "username": "janedoe",
        "display_name": "Jane Doe",
        "profile_photo_url": "https://..."
      },
      "current_streak": 15,
      "longest_streak": 30,
      "couple_points": 5000,
      "total_activities": 250,
      "last_interaction_at": "2024-01-15T10:30:00Z",
      "created_at": "2024-01-01T00:00:00Z"
    }
  }
}

Error:
  404: Not in a couple
```

### 5.5 Get Couple Activity
```
GET /couples/me/activity?page=1&limit=20
Headers: Authorization: Bearer <token>

Response (200):
{
  "success": true,
  "data": {
    "activities": [
      {
        "id": "uuid",
        "activity_type": "message",
        "points_awarded": 2,
        "created_at": "2024-01-15T10:30:00Z"
      }
    ]
  },
  "pagination": { /* pagination */ }
}
```

### 5.6 Disconnect Couple
```
POST /couples/me/disconnect
Headers: Authorization: Bearer <token>

Response (200):
{
  "success": true,
  "message": "Couple disconnected successfully"
}
```

## 6. Call API

### 6.1 Initiate Call
```
POST /calls
Headers: Authorization: Bearer <token>

Request:
{
  "conversation_id": "uuid",
  "call_type": "audio", // audio or video
  "participant_ids": ["uuid1"]
}

Response (201):
{
  "success": true,
  "data": {
    "call": {
      "id": "uuid",
      "conversation_id": "uuid",
      "call_type": "audio",
      "status": "initiated",
      "signaling_server": "wss://signal.talktoearn.com",
      "ice_servers": [
        {
          "urls": "stun:stun.talktoearn.com:3478"
        },
        {
          "urls": "turn:turn.talktoearn.com:3478",
          "username": "user",
          "credential": "pass"
        }
      ],
      "created_at": "2024-01-15T10:30:00Z"
    }
  }
}
```

### 6.2 End Call
```
POST /calls/:callId/end
Headers: Authorization: Bearer <token>

Request:
{
  "quality_rating": 5 // 1-5, optional
}

Response (200):
{
  "success": true,
  "data": {
    "call": {
      "id": "uuid",
      "status": "ended",
      "duration": 300, // seconds
      "ended_at": "2024-01-15T10:35:00Z"
    }
  }
}
```

### 6.3 Get Call History
```
GET /calls/history?page=1&limit=20
Headers: Authorization: Bearer <token>

Response (200):
{
  "success": true,
  "data": {
    "calls": [
      {
        "id": "uuid",
        "call_type": "video",
        "participants": [
          {
            "user_id": "uuid",
            "display_name": "John Doe",
            "status": "joined"
          }
        ],
        "status": "ended",
        "duration": 300,
        "initiated_by": "uuid",
        "created_at": "2024-01-15T10:00:00Z"
      }
    ]
  },
  "pagination": { /* pagination */ }
}
```

## 7. Status API

### 7.1 Create Status
```
POST /statuses
Headers: Authorization: Bearer <token>

Request:
{
  "content_type": "image", // text, image, video
  "content_url": "https://s3.../image.jpg",
  "caption": "Beautiful sunset!",
  "background_color": "#FF5733", // for text statuses
  "duration": 24 // hours
}

Response (201):
{
  "success": true,
  "data": {
    "status": {
      "id": "uuid",
      "user_id": "uuid",
      "content_type": "image",
      "content_url": "https://...",
      "caption": "Beautiful sunset!",
      "expires_at": "2024-01-16T10:30:00Z",
      "created_at": "2024-01-15T10:30:00Z"
    }
  }
}
```

### 7.2 Get My Statuses
```
GET /statuses/me
Headers: Authorization: Bearer <token>

Response (200):
{
  "success": true,
  "data": {
    "statuses": [
      {
        "id": "uuid",
        "content_type": "image",
        "content_url": "https://...",
        "view_count": 25,
        "reaction_count": 5,
        "viewers": [
          {
            "user_id": "uuid",
            "display_name": "John Doe",
            "viewed_at": "2024-01-15T10:35:00Z"
          }
        ],
        "created_at": "2024-01-15T10:30:00Z",
        "expires_at": "2024-01-16T10:30:00Z"
      }
    ]
  }
}
```

### 7.3 Get Contacts' Statuses
```
GET /statuses
Headers: Authorization: Bearer <token>

Response (200):
{
  "success": true,
  "data": {
    "statuses": [
      {
        "user": {
          "id": "uuid",
          "username": "johndoe",
          "display_name": "John Doe",
          "profile_photo_url": "https://..."
        },
        "status_count": 3,
        "last_status_at": "2024-01-15T10:30:00Z",
        "has_unseen": true
      }
    ]
  }
}
```

### 7.4 View Status
```
POST /statuses/:statusId/view
Headers: Authorization: Bearer <token>

Response (204): No content
```

### 7.5 React to Status
```
POST /statuses/:statusId/reactions
Headers: Authorization: Bearer <token>

Request:
{
  "reaction": "❤️"
}

Response (201):
{
  "success": true,
  "data": {
    "reaction": {
      "id": "uuid",
      "status_id": "uuid",
      "reaction": "❤️",
      "created_at": "2024-01-15T10:30:00Z"
    }
  }
}
```

### 7.6 Delete Status
```
DELETE /statuses/:statusId
Headers: Authorization: Bearer <token>

Response (204): No content
```

## 8. Points & Rewards API

### 8.1 Get Point Balance
```
GET /points/balance
Headers: Authorization: Bearer <token>

Response (200):
{
  "success": true,
  "data": {
    "personal": {
      "balance": 1500,
      "lifetime_earned": 5000,
      "lifetime_spent": 3500,
      "daily_earned_today": 50,
      "daily_limit": 500
    },
    "couple": {
      "balance": 2000,
      "lifetime_earned": 3000,
      "lifetime_spent": 1000
    }
  }
}
```

### 8.2 Get Transaction History
```
GET /points/transactions?page=1&limit=20&type=chat
Headers: Authorization: Bearer <token>

Response (200):
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "uuid",
        "amount": 2,
        "transaction_type": "chat",
        "description": "Genuine conversation",
        "balance_after": 1500,
        "created_at": "2024-01-15T10:30:00Z"
      }
    ]
  },
  "pagination": { /* pagination */ }
}
```

### 8.3 Get Available Rewards
```
GET /rewards?type=personal&category=voucher
Headers: Authorization: Bearer <token>

Response (200):
{
  "success": true,
  "data": {
    "rewards": [
      {
        "id": "uuid",
        "name": "₹50 Amazon Voucher",
        "description": "Get ₹50 off on Amazon",
        "category": "voucher",
        "reward_type": "personal",
        "points_required": 2000,
        "image_url": "https://...",
        "partner_name": "Amazon",
        "remaining_quantity": 50,
        "is_active": true
      }
    ]
  }
}
```

### 8.4 Redeem Reward
```
POST /rewards/:rewardId/redeem
Headers: Authorization: Bearer <token>

Request:
{
  "account_type": "personal", // personal or couple
  "idempotency_key": "uuid" // Client-generated for idempotency
}

Response (201):
{
  "success": true,
  "data": {
    "redemption": {
      "id": "uuid",
      "reward": {
        "name": "₹50 Amazon Voucher",
        "points_required": 2000
      },
      "points_spent": 2000,
      "status": "confirmed",
      "voucher": {
        "code": "AMZN-ABC123",
        "instructions": "Apply this code at checkout",
        "expires_at": "2024-12-31T23:59:59Z"
      },
      "created_at": "2024-01-15T10:30:00Z"
    }
  }
}

Errors:
  400: Insufficient points
  409: Reward out of stock or already redeemed (duplicate idempotency key)
  422: Daily redemption limit reached
```

### 8.5 Get Redemption History
```
GET /rewards/redemptions?page=1&limit=20
Headers: Authorization: Bearer <token>

Response (200):
{
  "success": true,
  "data": {
    "redemptions": [
      {
        "id": "uuid",
        "reward_name": "₹50 Amazon Voucher",
        "points_spent": 2000,
        "status": "fulfilled",
        "voucher_code": "AMZN-ABC123",
        "created_at": "2024-01-15T10:30:00Z"
      }
    ]
  },
  "pagination": { /* pagination */ }
}
```

## 9. Notification API

### 9.1 Get Notifications
```
GET /notifications?page=1&limit=20&unread_only=true
Headers: Authorization: Bearer <token>

Response (200):
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "uuid",
        "notification_type": "message",
        "title": "New message from John",
        "body": "Hey, how are you?",
        "data": {
          "conversation_id": "uuid",
          "message_id": "uuid"
        },
        "is_read": false,
        "created_at": "2024-01-15T10:30:00Z"
      }
    ],
    "unread_count": 5
  },
  "pagination": { /* pagination */ }
}
```

### 9.2 Mark Notification as Read
```
POST /notifications/:notificationId/read
Headers: Authorization: Bearer <token>

Response (204): No content
```

### 9.3 Mark All as Read
```
POST /notifications/read-all
Headers: Authorization: Bearer <token>

Response (204): No content
```

## 10. WebSocket API

### Connection
```
WebSocket URL: wss://api.talktoearn.com/ws

Connection:
wss://api.talktoearn.com/ws?token=<jwt_token>

On Connection:
Server → Client:
{
  "type": "connected",
  "data": {
    "user_id": "uuid",
    "session_id": "uuid"
  }
}
```

### Events from Client to Server

#### 10.1 Send Message
```
Client → Server:
{
  "type": "message:send",
  "data": {
    "conversation_id": "uuid",
    "message_type": "text",
    "content": "Hello!",
    "reply_to_message_id": "uuid", // optional
    "client_message_id": "uuid" // For optimistic UI
  }
}

Server → Client (ACK):
{
  "type": "message:ack",
  "data": {
    "client_message_id": "uuid",
    "message_id": "uuid",
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

#### 10.2 Typing Indicator
```
Client → Server:
{
  "type": "typing:start",
  "data": {
    "conversation_id": "uuid"
  }
}

Server → Other Participants:
{
  "type": "typing:user",
  "data": {
    "conversation_id": "uuid",
    "user_id": "uuid",
    "username": "johndoe",
    "is_typing": true
  }
}
```

#### 10.3 Mark as Read
```
Client → Server:
{
  "type": "message:read",
  "data": {
    "conversation_id": "uuid",
    "message_id": "uuid"
  }
}
```

### Events from Server to Client

#### 10.4 New Message
```
Server → Client:
{
  "type": "message:new",
  "data": {
    "message": {
      "id": "uuid",
      "conversation_id": "uuid",
      "sender_id": "uuid",
      "sender": {
        "username": "johndoe",
        "display_name": "John Doe"
      },
      "content": "Hello!",
      "created_at": "2024-01-15T10:30:00Z"
    }
  }
}
```

#### 10.5 Message Edited
```
Server → Client:
{
  "type": "message:edited",
  "data": {
    "message_id": "uuid",
    "conversation_id": "uuid",
    "content": "Updated content",
    "edited_at": "2024-01-15T10:32:00Z"
  }
}
```

#### 10.6 Message Deleted
```
Server → Client:
{
  "type": "message:deleted",
  "data": {
    "message_id": "uuid",
    "conversation_id": "uuid"
  }
}
```

#### 10.7 User Online/Offline
```
Server → Client:
{
  "type": "user:online",
  "data": {
    "user_id": "uuid",
    "is_online": true,
    "last_seen_at": "2024-01-15T10:30:00Z"
  }
}
```

#### 10.8 Reaction Added
```
Server → Client:
{
  "type": "reaction:added",
  "data": {
    "message_id": "uuid",
    "user_id": "uuid",
    "reaction": "👍"
  }
}
```

#### 10.9 Call Incoming
```
Server → Client:
{
  "type": "call:incoming",
  "data": {
    "call_id": "uuid",
    "caller": {
      "user_id": "uuid",
      "display_name": "John Doe",
      "profile_photo_url": "https://..."
    },
    "call_type": "video"
  }
}
```

#### 10.10 Points Earned
```
Server → Client:
{
  "type": "points:earned",
  "data": {
    "amount": 2,
    "transaction_type": "chat",
    "balance": 1502,
    "description": "Genuine conversation"
  }
}
```

### Heartbeat
```
Server → Client (every 30 seconds):
{
  "type": "ping"
}

Client → Server:
{
  "type": "pong"
}
```

### Error Handling
```
Server → Client:
{
  "type": "error",
  "error": {
    "code": "INVALID_MESSAGE",
    "message": "Invalid message format",
    "request_id": "uuid"
  }
}
```

## Error Codes

### Authentication Errors
```
AUTH_001: Invalid credentials
AUTH_002: Account locked
AUTH_003: Account suspended
AUTH_004: Account banned
AUTH_005: Token expired
AUTH_006: Invalid token
AUTH_007: Phone not verified
AUTH_008: Email not verified
```

### Validation Errors
```
VAL_001: Missing required field
VAL_002: Invalid format
VAL_003: Value too short
VAL_004: Value too long
VAL_005: Invalid enum value
```

### Business Logic Errors
```
BUS_001: Insufficient points
BUS_002: Reward out of stock
BUS_003: Daily limit reached
BUS_004: Already in a couple
BUS_005: User blocked
BUS_006: Conversation not found
BUS_007: Permission denied
BUS_008: Duplicate request
```

### Rate Limiting Errors
```
RATE_001: Too many requests
RATE_002: Too many messages
RATE_003: Too many failed login attempts
```

---

This API specification is production-ready and follows RESTful best practices.
