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
validate "podman-compose.yml exists" "[ -f 'podman-compose.yml' ]"
validate "Containerfile exists" "[ -f 'Containerfile' ]"    
validate "package.json exists" "[ -f 'package.json' ]"
validate "tsconfig.json exists" "[ -f 'tsconfig.json' ]"
validate "Frontend package.json exists" "[ -f 'frontend/package.json' ]"
validate "Prisma schema exists" "[ -f 'prisma/schema.prisma' ]"
validate "PandasAI Containerfile exists" "[ -f 'pandas-ai-service/Containerfile' ]"
validate "PandasAI requirements exists" "[ -f 'pandas-ai-service/requirements.txt' ]"

echo ""

# Configuration validation
echo -e "${BLUE}⚙️ Configuration Validation${NC}"
validate "Podman Compose is valid YAML" "python3 -c 'with open(\"podman-compose.yml\") as f: print(\"YAML syntax OK\")' >/dev/null 2>&1"
validate "package.json is valid JSON" "jq . package.json >/dev/null 2>&1"
validate "Frontend package.json is valid JSON" "jq . frontend/package.json >/dev/null 2>&1"
validate "tsconfig.json is valid JSON" "jq . tsconfig.json >/dev/null 2>&1"

echo ""

# Service configuration checks
echo -e "${BLUE}🐳 Service Configuration${NC}"

# Check if required services are defined
if [ -f "podman-compose.yml" ]; then
    validate "App service defined" "grep -q 'traderai-app:' podman-compose.yml"
    validate "PostgreSQL service defined" "grep -q 'postgres:' podman-compose.yml"
    validate "Redis service defined" "grep -q 'redis:' podman-compose.yml"
    validate "PandasAI service defined" "grep -q 'pandas-ai:' podman-compose.yml"
    validate "Networks defined" "grep -q 'networks:' podman-compose.yml"
    validate "Volumes defined" "grep -q 'volumes:' podman-compose.yml"
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

if command -v podman >/dev/null 2>&1; then
    echo -e "🔍 Podman available... ${GREEN}✅ PASS${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "🔍 Podman available... ${RED}❌ FAIL (required for deployment)${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

if command -v podman-compose >/dev/null 2>&1; then
    echo -e "🔍 Podman Compose available... ${GREEN}✅ PASS${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "🔍 Podman Compose available... ${YELLOW}⚠️  RECOMMENDED${NC}"
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
    echo "1. Install and start Podman (./migrate-to-podman.sh)"
    echo "2. Update .env with your API keys"
    echo "3. Choose deployment method:"
    echo "   • Gaia Pipelines: ./setup-gaia-pipelines.sh"
    echo "   • Podman Compose: podman-compose -f podman-compose.yml up -d"
    echo ""
    echo -e "${BLUE}Quick Commands:${NC}"
    echo "• Test configuration: ./validate-config.sh"
    echo "• Setup Gaia: ./setup-gaia-pipelines.sh"  
    echo "• Run pipeline: ./run-pipeline.sh master-deploy"
    echo "• View logs: podman-compose -f podman-compose.yml logs -f"
    exit 0
else
    echo ""
    echo -e "${RED}❌ Configuration issues found.${NC}"
    echo ""
    echo -e "${YELLOW}Common Solutions:${NC}"
    echo "• Install missing dependencies (Node.js, Python, Podman)"
    echo "• Fix JSON syntax errors in configuration files"
    echo "• Ensure all required files are present"
    echo "• Check file permissions"
    exit 1
fi