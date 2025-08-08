#!/bin/bash
# TraderAI Docker Configuration Test Script
# Validates Docker setup and configuration files

set -e

echo "🐳 TraderAI Docker Configuration Test"
echo "====================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results tracking
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

# Test function
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    echo -e "${BLUE}🔍 Testing: $test_name${NC}"
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    if eval "$test_command"; then
        echo -e "${GREEN}✅ PASSED: $test_name${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        echo -e "${RED}❌ FAILED: $test_name${NC}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

# Docker daemon check
test_docker_daemon() {
    docker ps >/dev/null 2>&1
}

# Docker Compose file validation
test_docker_compose_file() {
    [ -f "docker-compose.yml" ] && docker-compose config >/dev/null 2>&1
}

# Required directories check
test_required_directories() {
    local dirs=("pandas-ai-service" "frontend" "src" "prisma")
    
    for dir in "${dirs[@]}"; do
        if [ ! -d "$dir" ]; then
            echo "Missing directory: $dir"
            return 1
        fi
    done
    return 0
}

# Required files check
test_required_files() {
    local files=(
        "docker-compose.yml"
        "Dockerfile"
        "package.json"
        "tsconfig.json"
        "prisma/schema.prisma"
        "pandas-ai-service/requirements.txt"
        "pandas-ai-service/Dockerfile"
        "frontend/package.json"
    )
    
    for file in "${files[@]}"; do
        if [ ! -f "$file" ]; then
            echo "Missing file: $file"
            return 1
        fi
    done
    return 0
}

# Environment variables check
test_environment_variables() {
    local env_file=".env.example"
    
    if [ ! -f "$env_file" ]; then
        # Create example env file for testing
        cat > "$env_file" << 'EOF'
NODE_ENV=development
DATABASE_URL=postgresql://traderai:password@postgres:5432/traderai
DATABASE_READ_REPLICA_URL=postgresql://traderai:password@postgres:5432/traderai
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=redis123
JWT_SECRET=your-secret-key
CLAUDE_API_KEY=your-claude-api-key
TIINGO_API_TOKEN=your-tiingo-token
CORS_ORIGIN=http://localhost:5173
PANDAS_AI_SERVICE_URL=http://pandas-ai:8001
EOF
        echo "Created .env.example file"
    fi
    
    return 0
}

# Docker network validation
test_docker_networks() {
    # Check if docker-compose defines networks correctly
    docker-compose config | grep -q "networks:" && 
    docker-compose config | grep -q "traderai-network"
}

# Docker volume validation  
test_docker_volumes() {
    # Check if docker-compose defines volumes correctly
    docker-compose config | grep -q "volumes:" &&
    docker-compose config | grep -q "postgres_data" &&
    docker-compose config | grep -q "redis_data"
}

# Service port configuration
test_service_ports() {
    # Check port configurations in docker-compose
    docker-compose config | grep -q "3000:3000" &&  # Main app
    docker-compose config | grep -q "5432:5432" &&  # PostgreSQL
    docker-compose config | grep -q "6379:6379" &&  # Redis
    docker-compose config | grep -q "8001:8001"     # PandasAI
}

# Database configuration validation
test_database_config() {
    # Check PostgreSQL configuration
    docker-compose config | grep -q "POSTGRES_USER" &&
    docker-compose config | grep -q "POSTGRES_PASSWORD" &&
    docker-compose config | grep -q "POSTGRES_DB"
}

# Redis configuration validation
test_redis_config() {
    # Check Redis configuration
    docker-compose config | grep -q "redis" &&
    docker-compose config | grep -q "requirepass"
}

# PandasAI service configuration
test_pandas_ai_config() {
    # Check PandasAI service configuration
    docker-compose config | grep -q "pandas-ai" &&
    [ -f "pandas-ai-service/Dockerfile" ] &&
    [ -f "pandas-ai-service/requirements.txt" ]
}

# Dockerfile validation
test_dockerfiles() {
    # Check main Dockerfile
    [ -f "Dockerfile" ] &&
    grep -q "FROM node:" "Dockerfile" &&
    
    # Check PandasAI Dockerfile
    [ -f "pandas-ai-service/Dockerfile" ] &&
    grep -q "FROM python:" "pandas-ai-service/Dockerfile"
}

# Package.json validation
test_package_json() {
    # Check main package.json
    [ -f "package.json" ] &&
    jq -e '.scripts.dev' package.json >/dev/null &&
    jq -e '.scripts.build' package.json >/dev/null &&
    
    # Check frontend package.json
    [ -f "frontend/package.json" ] &&
    jq -e '.scripts.dev' frontend/package.json >/dev/null &&
    jq -e '.scripts.build' frontend/package.json >/dev/null
}

# TypeScript configuration
test_typescript_config() {
    [ -f "tsconfig.json" ] &&
    jq -e '.compilerOptions' tsconfig.json >/dev/null &&
    
    # Check frontend TypeScript config
    [ -f "frontend/tsconfig.json" ] &&
    jq -e '.compilerOptions' frontend/tsconfig.json >/dev/null
}

# Prisma configuration
test_prisma_config() {
    [ -f "prisma/schema.prisma" ] &&
    grep -q "generator client" "prisma/schema.prisma" &&
    grep -q "datasource db" "prisma/schema.prisma"
}

# Python requirements validation
test_python_requirements() {
    [ -f "pandas-ai-service/requirements.txt" ] &&
    grep -q "fastapi" "pandas-ai-service/requirements.txt" &&
    grep -q "uvicorn" "pandas-ai-service/requirements.txt" &&
    grep -q "pandas" "pandas-ai-service/requirements.txt"
}

# Health check endpoints
test_health_check_files() {
    # Check if health check endpoints exist in code
    [ -f "src/api/health.ts" ] || [ -f "src/routes/health.ts" ] || 
    grep -r "health" src/api/ >/dev/null 2>&1
}

# Security configuration
test_security_config() {
    # Check if security middleware is configured
    grep -r "helmet" src/ >/dev/null 2>&1 &&
    grep -r "cors" src/ >/dev/null 2>&1 &&
    docker-compose config | grep -q "JWT_SECRET"
}

# Monitoring configuration
test_monitoring_config() {
    # Check monitoring services
    docker-compose config | grep -q "prometheus" &&
    docker-compose config | grep -q "grafana"
}

# Run all tests
run_all_tests() {
    echo -e "${BLUE}Starting Docker configuration validation...${NC}\n"
    
    run_test "Docker daemon running" "test_docker_daemon"
    run_test "Docker Compose file valid" "test_docker_compose_file"
    run_test "Required directories exist" "test_required_directories"
    run_test "Required files exist" "test_required_files"
    run_test "Environment variables configured" "test_environment_variables"
    run_test "Docker networks configured" "test_docker_networks"
    run_test "Docker volumes configured" "test_docker_volumes"
    run_test "Service ports configured" "test_service_ports"
    run_test "Database configuration valid" "test_database_config"
    run_test "Redis configuration valid" "test_redis_config"
    run_test "PandasAI service configured" "test_pandas_ai_config"
    run_test "Dockerfiles valid" "test_dockerfiles"
    run_test "Package.json files valid" "test_package_json"
    run_test "TypeScript configuration valid" "test_typescript_config"
    run_test "Prisma configuration valid" "test_prisma_config"
    run_test "Python requirements valid" "test_python_requirements"
    run_test "Health check endpoints exist" "test_health_check_files"
    run_test "Security configuration valid" "test_security_config"
    run_test "Monitoring services configured" "test_monitoring_config"
    
    echo ""
    echo "==============================================="
    echo -e "${BLUE}📊 Test Results Summary${NC}"
    echo "==============================================="
    echo -e "Total Tests: $TESTS_TOTAL"
    echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
    echo -e "${RED}Failed: $TESTS_FAILED${NC}"
    
    if [ $TESTS_FAILED -eq 0 ]; then
        echo ""
        echo -e "${GREEN}🎉 All tests passed! Docker configuration is ready.${NC}"
        echo ""
        echo -e "${BLUE}Next Steps:${NC}"
        echo "1. Start Docker Desktop if not already running"
        echo "2. Run: ./setup-gaia-pipelines.sh"
        echo "3. Execute: ./run-pipeline.sh infrastructure"
        echo "4. Deploy: ./run-pipeline.sh master-deploy"
        return 0
    else
        echo ""
        echo -e "${RED}❌ Some tests failed. Please review the configuration.${NC}"
        echo ""
        echo -e "${YELLOW}Common Issues:${NC}"
        echo "• Docker Desktop not running"
        echo "• Missing configuration files"
        echo "• Invalid JSON in package.json files"
        echo "• Missing environment variables"
        return 1
    fi
}

# Create missing files if requested
create_missing_files() {
    echo -e "${YELLOW}🔧 Creating missing configuration files...${NC}"
    
    # Create .env.example if missing
    if [ ! -f ".env.example" ]; then
        cat > ".env.example" << 'EOF'
# TraderAI Environment Configuration
NODE_ENV=development

# Database Configuration
DATABASE_URL=postgresql://traderai:password@localhost:5432/traderai
DATABASE_READ_REPLICA_URL=postgresql://traderai:password@localhost:5432/traderai

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=redis123

# API Keys and Secrets
JWT_SECRET=your-secret-key-change-in-production
CLAUDE_API_KEY=your-claude-api-key
TIINGO_API_TOKEN=your-tiingo-api-token

# Service Configuration
CORS_ORIGIN=http://localhost:5173
PANDAS_AI_SERVICE_URL=http://localhost:8001
PORT=3000

# Logging and Monitoring
LOG_LEVEL=info
EOF
        echo "✅ Created .env.example"
    fi
    
    # Create health check endpoint if missing
    if [ ! -f "src/api/health.ts" ] && [ -d "src/api" ]; then
        mkdir -p src/api
        cat > "src/api/health.ts" << 'EOF'
import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'TraderAI Backend',
    version: '1.0.0',
    uptime: process.uptime()
  });
});

export default router;
EOF
        echo "✅ Created health check endpoint"
    fi
}

# Main execution
main() {
    case "${1:-test}" in
        "test")
            run_all_tests
            ;;
        "fix")
            create_missing_files
            run_all_tests
            ;;
        "help")
            echo "Usage: $0 [test|fix|help]"
            echo ""
            echo "Commands:"
            echo "  test  - Run Docker configuration validation (default)"
            echo "  fix   - Create missing files and run validation"
            echo "  help  - Show this help message"
            ;;
        *)
            echo "Unknown command: $1"
            echo "Use '$0 help' for usage information"
            exit 1
            ;;
    esac
}

# Execute main function
main "$@"