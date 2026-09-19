# 🧪 Complete Testing Guide - Talk to Earn

## Prerequisites
- All services running via `.\deploy.ps1`
- Database migrations completed
- Test data seeded

---

## Test Scenario 1: User Registration & Login

### 1.1 Open Frontend
```
http://localhost:3006
```

### 1.2 Register New User
1. Click "Get Started" or "Sign Up"
2. Fill in the form:
   - Username: `testuser`
   - Display Name: `Test User`
   - Email: `test@example.com`
   - Phone: `+1234567890`
   - Password: `Test123!`
   - Confirm Password: `Test123!`
3. Click "Create Account"
4. Should redirect to chat page automatically

### 1.3 Logout and Login
1. Click "Logout" button in top-right
2. Go to http://localhost:3006/login
3. Login with test account:
   - Username: `alice`
   - Password: `Test123!`
4. Should see chat interface

**✅ Expected Result**: Successful registration, auto-login, and manual login works

---

## Test Scenario 2: Real-Time Chat

### 2.1 Send Messages
1. Login as `alice`
2. Select a conversation (or create one)
3. Type a message: "Hello, this is a test message!"
4. Click "Send"
5. Message should appear immediately in chat

### 2.2 Two-Way Chat (Open 2 Windows)
1. **Window 1**: Login as `alice`
2. **Window 2**: Login as `bob`
3. **Alice**: Send "Hi Bob!"
4. **Bob**: Should see message instantly
5. **Bob**: Reply "Hi Alice!"
6. **Alice**: Should see reply instantly

**✅ Expected Result**: Real-time message delivery in both directions

---

## Test Scenario 3: Points & Rewards

### 3.1 Earn Points
1. Login as `alice`
2. Send several quality messages:
   - "How are you today?"
   - "I'm working on an interesting project."
   - "Would you like to hear about it?"
3. Watch for point notifications (toast messages)
4. Points should appear after each message

### 3.2 View Rewards Dashboard
1. Click "Rewards" button in top bar
2. Should see:
   - Current point balance
   - Total earned stats
   - Recent transactions list
   - Transaction details with timestamps

### 3.3 Check Point Updates
1. Note current balance
2. Go back to chat
3. Send more quality messages
4. Return to rewards
5. Balance should have increased

**✅ Expected Result**: Points earned based on message quality, visible in dashboard

---

## Test Scenario 4: Engagement Scoring

### 4.1 Test Quality Messages (Should earn 2-3 points)
```
"Hey! How's your day going?"
"I've been thinking about our conversation yesterday."
"That's a really interesting perspective on the topic."
```

### 4.2 Test Low-Quality Messages (Should earn 0-1 points)
```
"hi"
"ok"
"lol"
"k"
```

### 4.3 Test Duplicate Detection (Should earn 0 points)
```
Send same message twice:
"This is a test message"
"This is a test message"
```

**✅ Expected Result**: Higher quality messages earn more points, duplicates/spam earn nothing

---

## Test Scenario 5: API Testing

### 5.1 Health Check
```powershell
curl http://localhost:8000/health
```
**Expected**: `{"status":"ok"}`

### 5.2 Login API
```powershell
curl -X POST http://localhost:8000/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{
    "identifier": "alice",
    "password": "Test123!"
  }'
```
**Expected**: JSON with `access_token` and `user` object

### 5.3 Get Points Balance
```powershell
# Replace TOKEN and USER_ID with values from login
curl http://localhost:8000/api/points/balance `
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" `
  -H "X-User-ID: YOUR_USER_ID"
```
**Expected**: `{"balance": 1000, "user_id": "..."}`

---

## Test Scenario 6: WebSocket Connection

### 6.1 Test Direct WebSocket
1. Open browser console (F12)
2. Run this code:
```javascript
const socket = io('http://localhost:3002', {
  auth: {
    token: 'YOUR_JWT_TOKEN',
    userId: 'YOUR_USER_ID'
  }
});

socket.on('connect', () => {
  console.log('✅ Connected:', socket.id);
});

socket.on('message:new', (data) => {
  console.log('📨 New message:', data);
});

socket.on('points:earned', (data) => {
  console.log('💰 Points earned:', data);
});
```

**✅ Expected Result**: Connection successful, events received

---

## Test Scenario 7: Database Verification

### 7.1 Connect to Database
```powershell
docker-compose exec postgres psql -U talktoearn -d talktoearn_db
```

### 7.2 Check Users
```sql
SELECT username, display_name, email FROM users;
```
**Expected**: See alice, bob, charlie, and any new users

### 7.3 Check Messages
```sql
SELECT u.username, m.content, m.created_at 
FROM messages m 
JOIN users u ON m.sender_id = u.id 
ORDER BY m.created_at DESC 
LIMIT 10;
```
**Expected**: See recent messages from your tests

### 7.4 Check Point Transactions
```sql
SELECT u.username, pt.amount, pt.description, pt.created_at 
FROM point_transactions pt 
JOIN users u ON pt.user_id = u.id 
ORDER BY pt.created_at DESC 
LIMIT 10;
```
**Expected**: See point awards from messages

### 7.5 Check Engagement Events
```sql
SELECT 
  u.username,
  ee.overall_score,
  ee.points_awarded,
  m.content 
FROM engagement_events ee 
JOIN messages m ON ee.message_id = m.id 
JOIN users u ON m.sender_id = u.id 
ORDER BY ee.created_at DESC 
LIMIT 10;
```
**Expected**: See engagement scores (0.0-1.0) and points (0-3)

---

## Test Scenario 8: Service Health

### 8.1 Check All Containers
```powershell
docker-compose ps
```
**Expected**: All services should be "Up" and healthy

### 8.2 Check Logs
```powershell
# Frontend
docker-compose logs frontend | Select-String -Pattern "Ready"

# API Gateway
docker-compose logs api-gateway | Select-String -Pattern "listening"

# Chat Service
docker-compose logs chat-service | Select-String -Pattern "WebSocket"

# Engagement Service
docker-compose logs engagement-service | Select-String -Pattern "Uvicorn"
```

### 8.3 Test Individual Services
```powershell
# Auth Service
curl http://localhost:3001/health

# Chat Service
curl http://localhost:3002/health

# Engagement Service
curl http://localhost:8001/health

# Reward Service
curl http://localhost:3004/health
```
**Expected**: All return health status

---

## Test Scenario 9: Kafka Events

### 9.1 List Kafka Topics
```powershell
docker-compose exec kafka kafka-topics --bootstrap-server localhost:9092 --list
```
**Expected**: See `message.sent`, `engagement.calculated`, `points.awarded`, `notification.send`

### 9.2 Monitor Kafka Messages
```powershell
# In one terminal, watch engagement events
docker-compose exec kafka kafka-console-consumer --bootstrap-server localhost:9092 --topic engagement.calculated --from-beginning

# In another terminal, send a message via chat
# You should see the engagement event appear
```

**✅ Expected Result**: Events flowing through Kafka

---

## Test Scenario 10: Performance & Load

### 10.1 Send Multiple Messages Rapidly
1. Login as alice
2. Send 20 messages quickly
3. All should be processed
4. Points should accumulate
5. No messages lost

### 10.2 Check Daily Limits
1. Check current points
2. Send many messages (100+)
3. Should hit daily earning limit
4. Further messages earn 0 points

**✅ Expected Result**: System handles load, enforces limits

---

## Common Issues & Solutions

### Issue: Services Won't Start
```powershell
docker-compose down
docker system prune -f
.\deploy.ps1
```

### Issue: Frontend Can't Connect
```powershell
# Check API Gateway
curl http://localhost:8000/health

# Restart frontend
docker-compose restart frontend
```

### Issue: No Points Awarded
```powershell
# Check engagement service logs
docker-compose logs engagement-service

# Check Kafka topics
docker-compose exec kafka kafka-topics --bootstrap-server localhost:9092 --list

# Restart engagement and reward services
docker-compose restart engagement-service reward-service
```

### Issue: WebSocket Disconnects
```powershell
# Check chat service
docker-compose logs chat-service

# Check Redis
docker-compose exec redis redis-cli ping

# Restart chat service
docker-compose restart chat-service
```

---

## Success Criteria

✅ All services running (13+ containers)  
✅ Frontend accessible at http://localhost:3006  
✅ Users can register and login  
✅ Real-time chat works bidirectionally  
✅ Points earned automatically  
✅ Engagement scoring differentiates quality  
✅ Rewards dashboard shows transactions  
✅ Database contains test data  
✅ Kafka events flowing  
✅ No errors in logs  

---

## Performance Benchmarks

**Expected Performance:**
- Message delivery: < 100ms
- Point calculation: < 500ms
- Page load: < 2 seconds
- API response: < 200ms
- WebSocket latency: < 50ms

---

## Next Steps After Testing

1. ✅ Verify all tests pass
2. 📝 Document any issues found
3. 🎨 Customize UI/branding
4. 🚀 Deploy to production
5. 📊 Set up monitoring alerts
6. 🔐 Update secrets for production
7. 📱 Build mobile app
8. 🌍 Add internationalization

---

**Testing complete! Your Talk to Earn platform is production-ready! 🎉**
