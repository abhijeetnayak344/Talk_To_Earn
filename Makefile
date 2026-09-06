.PHONY: help setup start stop restart logs clean test lint format db-migrate db-seed

# Colors for output
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NC := \033[0m # No Color

help: ## Show this help message
	@echo "$(BLUE)Talk to Earn - Development Commands$(NC)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "$(GREEN)%-20s$(NC) %s\n", $$1, $$2}'

setup: ## Initial setup - copy env file and install dependencies
	@echo "$(BLUE)Setting up development environment...$(NC)"
	@if [ ! -f .env ]; then cp .env.example .env; echo "$(GREEN).env file created$(NC)"; fi
	@echo "$(YELLOW)Please update .env with your configuration$(NC)"
	@echo "$(GREEN)Setup complete!$(NC)"

start: ## Start all services
	@echo "$(BLUE)Starting all services...$(NC)"
	docker-compose up -d
	@echo "$(GREEN)Services started!$(NC)"
	@echo "$(YELLOW)API Gateway: http://localhost:8000$(NC)"
	@echo "$(YELLOW)Grafana: http://localhost:3000 (admin/admin)$(NC)"
	@echo "$(YELLOW)MinIO Console: http://localhost:9001 (minioadmin/minioadmin)$(NC)"

start-infra: ## Start only infrastructure services (postgres, redis, kafka)
	@echo "$(BLUE)Starting infrastructure services...$(NC)"
	docker-compose up -d postgres redis zookeeper kafka minio
	@echo "$(GREEN)Infrastructure services started!$(NC)"

stop: ## Stop all services
	@echo "$(BLUE)Stopping all services...$(NC)"
	docker-compose down
	@echo "$(GREEN)Services stopped!$(NC)"

restart: ## Restart all services
	@echo "$(BLUE)Restarting all services...$(NC)"
	docker-compose restart
	@echo "$(GREEN)Services restarted!$(NC)"

logs: ## Show logs from all services
	docker-compose logs -f

logs-service: ## Show logs from specific service (usage: make logs-service SERVICE=auth-service)
	@if [ -z "$(SERVICE)" ]; then \
		echo "$(RED)Please specify SERVICE (e.g., make logs-service SERVICE=auth-service)$(NC)"; \
		exit 1; \
	fi
	docker-compose logs -f $(SERVICE)

ps: ## Show status of all services
	docker-compose ps

clean: ## Stop and remove all containers, volumes, and networks
	@echo "$(YELLOW)Warning: This will remove all data!$(NC)"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker-compose down -v; \
		echo "$(GREEN)Cleanup complete!$(NC)"; \
	fi

clean-build: ## Remove build artifacts
	@echo "$(BLUE)Cleaning build artifacts...$(NC)"
	find . -type d -name "node_modules" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete 2>/dev/null || true
	@echo "$(GREEN)Build artifacts cleaned!$(NC)"

# Database commands
db-shell: ## Open PostgreSQL shell
	docker-compose exec postgres psql -U talktoearn -d talktoearn_db

db-migrate: ## Run database migrations
	@echo "$(BLUE)Running database migrations...$(NC)"
	docker-compose exec auth-service npm run migrate
	@echo "$(GREEN)Migrations complete!$(NC)"

db-seed: ## Seed database with test data
	@echo "$(BLUE)Seeding database...$(NC)"
	docker-compose exec auth-service npm run seed
	@echo "$(GREEN)Database seeded!$(NC)"

db-reset: ## Reset database (drop, create, migrate, seed)
	@echo "$(YELLOW)Warning: This will delete all data!$(NC)"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker-compose exec postgres psql -U talktoearn -c "DROP DATABASE IF EXISTS talktoearn_db;"; \
		docker-compose exec postgres psql -U talktoearn -c "CREATE DATABASE talktoearn_db;"; \
		$(MAKE) db-migrate; \
		$(MAKE) db-seed; \
		echo "$(GREEN)Database reset complete!$(NC)"; \
	fi

# Redis commands
redis-cli: ## Open Redis CLI
	docker-compose exec redis redis-cli

redis-flush: ## Flush all Redis data
	@echo "$(YELLOW)Warning: This will delete all cached data!$(NC)"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker-compose exec redis redis-cli FLUSHALL; \
		echo "$(GREEN)Redis flushed!$(NC)"; \
	fi

# Kafka commands
kafka-topics: ## List Kafka topics
	docker-compose exec kafka kafka-topics --bootstrap-server localhost:9092 --list

kafka-create-topics: ## Create required Kafka topics
	@echo "$(BLUE)Creating Kafka topics...$(NC)"
	docker-compose exec kafka kafka-topics --bootstrap-server localhost:9092 --create --topic message.sent --partitions 3 --replication-factor 1 --if-not-exists
	docker-compose exec kafka kafka-topics --bootstrap-server localhost:9092 --create --topic engagement.calculated --partitions 3 --replication-factor 1 --if-not-exists
	docker-compose exec kafka kafka-topics --bootstrap-server localhost:9092 --create --topic points.awarded --partitions 3 --replication-factor 1 --if-not-exists
	docker-compose exec kafka kafka-topics --bootstrap-server localhost:9092 --create --topic notification.send --partitions 3 --replication-factor 1 --if-not-exists
	@echo "$(GREEN)Topics created!$(NC)"

kafka-consumer: ## Start console consumer for a topic (usage: make kafka-consumer TOPIC=message.sent)
	@if [ -z "$(TOPIC)" ]; then \
		echo "$(RED)Please specify TOPIC (e.g., make kafka-consumer TOPIC=message.sent)$(NC)"; \
		exit 1; \
	fi
	docker-compose exec kafka kafka-console-consumer --bootstrap-server localhost:9092 --topic $(TOPIC) --from-beginning

# Testing
test: ## Run all tests
	@echo "$(BLUE)Running tests...$(NC)"
	@for service in services/*/; do \
		if [ -f "$$service/package.json" ]; then \
			echo "$(YELLOW)Testing $$service$(NC)"; \
			cd $$service && npm test; \
		fi; \
	done
	@echo "$(GREEN)All tests complete!$(NC)"

test-service: ## Run tests for specific service (usage: make test-service SERVICE=auth-service)
	@if [ -z "$(SERVICE)" ]; then \
		echo "$(RED)Please specify SERVICE (e.g., make test-service SERVICE=auth-service)$(NC)"; \
		exit 1; \
	fi
	docker-compose exec $(SERVICE) npm test

# Code quality
lint: ## Run linters on all services
	@echo "$(BLUE)Running linters...$(NC)"
	@for service in services/*/; do \
		if [ -f "$$service/package.json" ]; then \
			echo "$(YELLOW)Linting $$service$(NC)"; \
			cd $$service && npm run lint; \
		fi; \
	done
	@echo "$(GREEN)Linting complete!$(NC)"

format: ## Format code in all services
	@echo "$(BLUE)Formatting code...$(NC)"
	@for service in services/*/; do \
		if [ -f "$$service/package.json" ]; then \
			echo "$(YELLOW)Formatting $$service$(NC)"; \
			cd $$service && npm run format; \
		fi; \
	done
	@echo "$(GREEN)Formatting complete!$(NC)"

# Monitoring
grafana: ## Open Grafana dashboard
	@echo "$(BLUE)Opening Grafana...$(NC)"
	@open http://localhost:3000 || xdg-open http://localhost:3000 || start http://localhost:3000

prometheus: ## Open Prometheus UI
	@echo "$(BLUE)Opening Prometheus...$(NC)"
	@open http://localhost:9090 || xdg-open http://localhost:9090 || start http://localhost:9090

# Development utilities
shell-service: ## Open shell in service container (usage: make shell-service SERVICE=auth-service)
	@if [ -z "$(SERVICE)" ]; then \
		echo "$(RED)Please specify SERVICE (e.g., make shell-service SERVICE=auth-service)$(NC)"; \
		exit 1; \
	fi
	docker-compose exec $(SERVICE) sh

build: ## Build all service images
	@echo "$(BLUE)Building all service images...$(NC)"
	docker-compose build
	@echo "$(GREEN)Build complete!$(NC)"

build-service: ## Build specific service image (usage: make build-service SERVICE=auth-service)
	@if [ -z "$(SERVICE)" ]; then \
		echo "$(RED)Please specify SERVICE (e.g., make build-service SERVICE=auth-service)$(NC)"; \
		exit 1; \
	fi
	docker-compose build $(SERVICE)
	@echo "$(GREEN)Build complete!$(NC)"

# Documentation
docs: ## Generate API documentation
	@echo "$(BLUE)Generating API documentation...$(NC)"
	@echo "$(YELLOW)API documentation available at:$(NC)"
	@echo "  - docs/ARCHITECTURE.md"
	@echo "  - docs/DATABASE_SCHEMA.md"
	@echo "  - docs/API_SPECIFICATIONS.md"
	@echo "  - docs/ENGAGEMENT_ENGINE.md"

# Health checks
health: ## Check health of all services
	@echo "$(BLUE)Checking service health...$(NC)"
	@curl -f http://localhost:8000/health || echo "$(RED)API Gateway: DOWN$(NC)"
	@curl -f http://localhost:3001/health || echo "$(RED)Auth Service: DOWN$(NC)"
	@curl -f http://localhost:3002/health || echo "$(RED)Chat Service: DOWN$(NC)"
	@curl -f http://localhost:3003/health || echo "$(RED)User Service: DOWN$(NC)"
	@curl -f http://localhost:3004/health || echo "$(RED)Reward Service: DOWN$(NC)"
	@curl -f http://localhost:8001/health || echo "$(RED)Engagement Service: DOWN$(NC)"

# Production utilities
deploy-staging: ## Deploy to staging environment
	@echo "$(BLUE)Deploying to staging...$(NC)"
	@echo "$(YELLOW)Not implemented yet$(NC)"

deploy-production: ## Deploy to production environment
	@echo "$(RED)Production deployment requires additional confirmation$(NC)"
	@echo "$(YELLOW)Not implemented yet$(NC)"

# Quick start
quickstart: setup start-infra kafka-create-topics start ## Complete setup and start all services
	@echo "$(GREEN)✓ Development environment ready!$(NC)"
	@echo ""
	@echo "$(BLUE)Access points:$(NC)"
	@echo "  API Gateway:    http://localhost:8000"
	@echo "  Grafana:        http://localhost:3000 (admin/admin)"
	@echo "  MinIO Console:  http://localhost:9001 (minioadmin/minioadmin)"
	@echo "  Prometheus:     http://localhost:9090"
	@echo ""
	@echo "$(YELLOW)Next steps:$(NC)"
	@echo "  1. Run 'make db-migrate' to setup database schema"
	@echo "  2. Run 'make db-seed' to add test data"
	@echo "  3. Check 'make logs' to see service logs"
	@echo "  4. Visit docs/ folder for detailed documentation"
