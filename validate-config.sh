#!/bin/bash
# TraderAI Configuration Validation Script
# Validates configuration files without requiring Docker daemon

set -e

echo "📋 TraderAI Configuration Validation"
echo "===================================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

TESTS_PASSED=0
TESTS_FAILED=0

# Validation function
validate() {
    local test_name="$1"
    local condition="$2"
    
    echo -n "🔍 $test_name... "
    
    if eval "$condition"; then
        echo -e "${GREEN}✅ PASS${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        echo -e "${RED}❌ FAIL${NC}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

# File existence checks
echo -e "${BLUE}📁 File Structure Validation${NC}"
validate "docker-compose.yml exists" "[ -f 'docker-compose.yml' ]"
validate "Dockerfile exists" "[ -f 'Dockerfile' ]"
validate "package.json exists" "[ -f 'package.json' ]"
validate "tsconfig.json exists" "[ -f 'tsconfig.json' ]"
validate "Frontend package.json exists" "[ -f 'frontend/package.json' ]"
validate "Prisma schema exists" "[ -f 'prisma/schema.prisma' ]"
validate "PandasAI Dockerfile exists" "[ -f 'pandas-ai-service/Dockerfile' ]"
validate "PandasAI requirements exists" "[ -f 'pandas-ai-service/requirements.txt' ]"

echo ""

# Configuration validation
echo -e "${BLUE}⚙️ Configuration Validation${NC}"
validate "Docker Compose is valid YAML" "docker-compose config >/dev/null 2>&1 || python3 -c 'import yaml; yaml.safe_load(open(\"docker-compose.yml\"))' >/dev/null 2>&1"
validate "package.json is valid JSON" "jq . package.json >/dev/null 2>&1"
validate "Frontend package.json is valid JSON" "jq . frontend/package.json >/dev/null 2>&1"
validate "tsconfig.json is valid JSON" "jq . tsconfig.json >/dev/null 2>&1"

echo ""

# Service configuration checks
echo -e "${BLUE}🐳 Service Configuration${NC}"

# Check if required services are defined
if [ -f "docker-compose.yml" ]; then
    validate "App service defined" "grep -q 'app:' docker-compose.yml"
    validate "PostgreSQL service defined" "grep -q 'postgres:' docker-compose.yml"
    validate "Redis service defined" "grep -q 'redis:' docker-compose.yml"
    validate "PandasAI service defined" "grep -q 'pandas-ai:' docker-compose.yml"
    validate "Networks defined" "grep -q 'networks:' docker-compose.yml"
    validate "Volumes defined" "grep -q 'volumes:' docker-compose.yml"
fi

echo ""

# Environment configuration
echo -e "${BLUE}🔧 Environment Configuration${NC}"
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        echo -e "${YELLOW}ℹ️  Creating .env from .env.example${NC}"
        cp .env.example .env
    else
        echo -e "${YELLOW}ℹ️  Creating default .env file${NC}"
        cat > .env << 'EOF'
NODE_ENV=development
DATABASE_URL=postgresql://traderai:password@localhost:5432/traderai
DATABASE_READ_REPLICA_URL=postgresql://traderai:password@localhost:5432/traderai
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=redis123
JWT_SECRET=your-secret-key
CLAUDE_API_KEY=your-claude-api-key
TIINGO_API_TOKEN=your-tiingo-token
CORS_ORIGIN=http://localhost:5173
PANDAS_AI_SERVICE_URL=http://localhost:8001
PORT=3000
LOG_LEVEL=info
EOF
    fi
fi

validate ".env file exists" "[ -f '.env' ]"
validate "DATABASE_URL configured" "grep -q 'DATABASE_URL=' .env"
validate "REDIS configuration present" "grep -q 'REDIS_HOST=' .env"
validate "API keys section present" "grep -q 'CLAUDE_API_KEY=' .env"

echo ""

# Gaia pipeline validation
echo -e "${BLUE}🚀 Gaia Pipeline Configuration${NC}"
validate "Gaia pipelines directory exists" "[ -d 'traderai-pipelines' ]"
validate "Master pipeline exists" "[ -f 'traderai-pipelines/master-deploy-pipeline.go' ]"
validate "Backend pipeline exists" "[ -f 'traderai-pipelines/backend/backend-pipeline.go' ]"
validate "Frontend pipeline exists" "[ -f 'traderai-pipelines/frontend/frontend-pipeline.go' ]"
validate "PandasAI pipeline exists" "[ -f 'traderai-pipelines/pandas-ai/pandas-ai-pipeline.py' ]"
validate "Infrastructure pipeline exists" "[ -f 'traderai-pipelines/infrastructure/infrastructure-pipeline.go' ]"
validate "Testing pipeline exists" "[ -f 'traderai-pipelines/testing/testing-pipeline.go' ]"
validate "Diagnostics pipeline exists" "[ -f 'traderai-pipelines/diagnostics/diagnostics-pipeline.go' ]"
validate "Pipeline README exists" "[ -f 'traderai-pipelines/README.md' ]"

echo ""

# Dependency checks
echo -e "${BLUE}📦 Dependency Validation${NC}"

# Check for required tools
validate "Node.js available" "command -v node >/dev/null 2>&1"
validate "npm available" "command -v npm >/dev/null 2>&1"
validate "Python 3 available" "command -v python3 >/dev/null 2>&1"

# Check optional tools
if command -v go >/dev/null 2>&1; then
    echo -e "🔍 Go available... ${GREEN}✅ PASS${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "🔍 Go available... ${YELLOW}⚠️  OPTIONAL (needed for Gaia pipelines)${NC}"
fi

if command -v docker >/dev/null 2>&1; then
    echo -e "🔍 Docker available... ${GREEN}✅ PASS${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "🔍 Docker available... ${RED}❌ FAIL (required for deployment)${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

if command -v jq >/dev/null 2>&1; then
    echo -e "🔍 jq available... ${GREEN}✅ PASS${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "🔍 jq available... ${YELLOW}⚠️  RECOMMENDED${NC}"
fi

echo ""

# Summary
TOTAL_TESTS=$((TESTS_PASSED + TESTS_FAILED))
echo "=====================================  "
echo -e "${BLUE}📊 Validation Summary${NC}"
echo "====================================="
echo -e "Total Checks: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 Configuration validation successful!${NC}"
    echo ""
    echo -e "${BLUE}Next Steps:${NC}"
    echo "1. Start Docker Desktop"
    echo "2. Update .env with your API keys"
    echo "3. Choose deployment method:"
    echo "   • Gaia Pipelines: ./setup-gaia-pipelines.sh"
    echo "   • Docker Compose: docker-compose up -d"
    echo ""
    echo -e "${BLUE}Quick Commands:${NC}"
    echo "• Test configuration: ./validate-config.sh"
    echo "• Setup Gaia: ./setup-gaia-pipelines.sh"  
    echo "• Run pipeline: ./run-pipeline.sh master-deploy"
    echo "• View logs: docker-compose logs -f"
    exit 0
else
    echo ""
    echo -e "${RED}❌ Configuration issues found.${NC}"
    echo ""
    echo -e "${YELLOW}Common Solutions:${NC}"
    echo "• Install missing dependencies (Node.js, Python, Docker)"
    echo "• Fix JSON syntax errors in configuration files"
    echo "• Ensure all required files are present"
    echo "• Check file permissions"
    exit 1
fi