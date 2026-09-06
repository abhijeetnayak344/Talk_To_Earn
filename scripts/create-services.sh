#!/bin/bash

# Script to create service directory structure
# This creates the basic folder structure for each microservice

set -e

SERVICES=(
  "api-gateway"
  "auth-service"
  "chat-service"
  "user-service"
  "engagement-service"
  "reward-service"
  "notification-service"
)

echo "Creating service directory structures..."

for service in "${SERVICES[@]}"; do
  echo "Creating $service..."
  
  # Skip engagement-service as it uses Python
  if [ "$service" == "engagement-service" ]; then
    mkdir -p "services/$service/src"
    mkdir -p "services/$service/tests"
    continue
  fi
  
  # Create directory structure for Node.js services
  mkdir -p "services/$service/src/routes"
  mkdir -p "services/$service/src/controllers"
  mkdir -p "services/$service/src/services"
  mkdir -p "services/$service/src/models"
  mkdir -p "services/$service/src/middleware"
  mkdir -p "services/$service/src/utils"
  mkdir -p "services/$service/src/validators"
  mkdir -p "services/$service/src/database"
  mkdir -p "services/$service/src/cache"
  mkdir -p "services/$service/tests"
  mkdir -p "services/$service/config"
  
  echo "✓ $service structure created"
done

# Create shared directory
echo "Creating shared libraries directory..."
mkdir -p "shared/types"
mkdir -p "shared/utils"
mkdir -p "shared/proto"

# Create client directories
echo "Creating client directories..."
mkdir -p "clients/web/src"
mkdir -p "clients/mobile/src"

# Create infrastructure directories
echo "Creating infrastructure directories..."
mkdir -p "infrastructure/docker"
mkdir -p "infrastructure/kubernetes"
mkdir -p "infrastructure/terraform"
mkdir -p "infrastructure/grafana/dashboards"

# Create scripts directory
mkdir -p "scripts/deployment"
mkdir -p "scripts/database"
mkdir -p "scripts/testing"

echo ""
echo "✅ All service directories created successfully!"
echo ""
echo "Next steps:"
echo "  1. Copy Dockerfile and package.json to each service"
echo "  2. Install dependencies: cd services/<service> && npm install"
echo "  3. Implement service logic"
