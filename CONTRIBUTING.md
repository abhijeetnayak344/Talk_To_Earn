# Contributing to Talk to Earn

Thank you for your interest in contributing to Talk to Earn! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow
- Follow the project's coding standards

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Python 3.11+
- Docker and Docker Compose
- Git
- Make (optional but recommended)

### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/talk-to-earn.git
   cd talk-to-earn
   ```

2. **Set up environment**
   ```bash
   make setup
   # or manually:
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start infrastructure services**
   ```bash
   make start-infra
   ```

4. **Create Kafka topics**
   ```bash
   make kafka-create-topics
   ```

5. **Run database migrations**
   ```bash
   make db-migrate
   ```

6. **Start all services**
   ```bash
   make start
   ```

7. **Verify everything works**
   ```bash
   make health
   ```

## Project Structure

```
talk-to-earn/
├── docs/                    # Documentation
├── services/                # Microservices
│   ├── auth-service/
│   ├── chat-service/
│   ├── user-service/
│   ├── engagement-service/
│   ├── reward-service/
│   └── notification-service/
├── clients/                 # Frontend applications
│   ├── web/
│   └── mobile/
├── shared/                  # Shared libraries
├── infrastructure/          # Infrastructure configs
└── scripts/                 # Utility scripts
```

## Development Workflow

### Branch Naming

- `feature/` - New features (e.g., `feature/couple-system`)
- `fix/` - Bug fixes (e.g., `fix/duplicate-detection`)
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test additions or modifications

### Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or modifying tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(engagement): add semantic duplicate detection

Implemented sentence embeddings using SentenceTransformer
to detect semantically similar messages beyond exact matches.

Closes #123
```

```
fix(auth): prevent token refresh race condition

Added Redis lock to prevent multiple simultaneous token
refreshes from creating inconsistent state.
```

### Pull Request Process

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write clean, readable code
   - Follow existing code style
   - Add tests for new functionality
   - Update documentation

3. **Test your changes**
   ```bash
   make test
   make lint
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat(scope): description"
   ```

5. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create a Pull Request**
   - Provide a clear description
   - Link related issues
   - Add screenshots if UI changes
   - Request reviews from maintainers

### Pull Request Checklist

- [ ] Code follows project style guidelines
- [ ] Tests added/updated and passing
- [ ] Documentation updated
- [ ] No breaking changes (or clearly documented)
- [ ] Commit messages follow convention
- [ ] Branch is up to date with main

## Coding Standards

### JavaScript/Node.js

- Use ES6+ features
- Follow Airbnb style guide
- Use async/await over callbacks
- Add JSDoc comments for public functions
- Keep functions small and focused

**Example:**
```javascript
/**
 * Calculate engagement score for a message
 * @param {Object} message - Message object
 * @param {Object} context - Conversation context
 * @returns {Promise<Object>} Engagement score result
 */
async function calculateEngagementScore(message, context) {
  // Implementation
}
```

### Python

- Follow PEP 8 style guide
- Use type hints
- Add docstrings for functions/classes
- Use async/await for I/O operations

**Example:**
```python
async def calculate_engagement_score(
    message: Message,
    context: ConversationContext
) -> EngagementResult:
    """
    Calculate engagement score for a message.
    
    Args:
        message: Message object to analyze
        context: Conversation context
    
    Returns:
        Engagement score result with signals
    """
    # Implementation
```

### Database

- Use migrations for schema changes
- Add indexes for frequently queried columns
- Use transactions for multi-step operations
- Document complex queries

### API Design

- Follow RESTful principles
- Use proper HTTP methods and status codes
- Version APIs (e.g., `/api/v1/`)
- Document all endpoints

## Testing

### Unit Tests

Test individual functions and methods in isolation.

```javascript
// auth-service/tests/unit/jwt.test.js
describe('JWT Utils', () => {
  test('should generate valid JWT token', () => {
    const token = generateToken({ userId: '123' });
    expect(token).toBeDefined();
  });
});
```

### Integration Tests

Test interactions between components.

```javascript
// auth-service/tests/integration/auth.test.js
describe('POST /api/auth/login', () => {
  test('should return tokens for valid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ username: 'test', password: 'test123' });
    
    expect(response.status).toBe(200);
    expect(response.body.data.access_token).toBeDefined();
  });
});
```

### Running Tests

```bash
# All tests
make test

# Specific service
make test-service SERVICE=auth-service

# With coverage
npm test -- --coverage
```

## Documentation

### Code Documentation

- Add JSDoc/docstrings for public APIs
- Comment complex logic
- Keep README files up to date

### API Documentation

- Document all endpoints in `docs/API_SPECIFICATIONS.md`
- Include request/response examples
- Document error codes

### Architecture Documentation

- Update architecture docs for major changes
- Document design decisions (ADRs)
- Maintain database schema documentation

## Performance Guidelines

- Cache frequently accessed data
- Use database indexes appropriately
- Implement pagination for large datasets
- Profile code for bottlenecks
- Monitor service metrics

## Security Guidelines

- Never commit secrets or credentials
- Use environment variables for config
- Validate all user input
- Use parameterized queries (prevent SQL injection)
- Implement rate limiting
- Keep dependencies updated

## Questions or Issues?

- Check existing documentation in `docs/`
- Search existing issues on GitHub
- Ask in project discussions
- Reach out to maintainers

## License

By contributing, you agree that your contributions will be licensed under the project's license.

---

Thank you for contributing to Talk to Earn! 🎉
