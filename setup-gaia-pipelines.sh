#!/bin/bash
# TraderAI Gaia Pipeline Setup Script
# Automates the registration and deployment of Gaia pipelines

set -e

echo "🚀 TraderAI Gaia Pipeline Setup"
echo "================================"

# Configuration
GAIA_URL="http://localhost:8080"
PIPELINE_DIR="traderai-pipelines"
LOG_FILE="gaia-setup.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
    echo -e "$1"
}

# Error handling
error_exit() {
    log "${RED}❌ Error: $1${NC}"
    exit 1
}

# Success message
success() {
    log "${GREEN}✅ $1${NC}"
}

# Warning message
warning() {
    log "${YELLOW}⚠️  $1${NC}"
}

# Info message
info() {
    log "${BLUE}ℹ️  $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    log "${BLUE}🔍 Checking prerequisites...${NC}"
    
    # Check if Docker is running
    if ! docker ps >/dev/null 2>&1; then
        error_exit "Docker is not running. Please start Docker Desktop."
    fi
    success "Docker is running"
    
    # Check if Gaia is running
    if ! curl -s "$GAIA_URL/api/v1/health" >/dev/null 2>&1; then
        error_exit "Gaia server is not running at $GAIA_URL. Please start Gaia first."
    fi
    success "Gaia server is accessible"
    
    # Check if Go is available
    if ! command -v go >/dev/null 2>&1; then
        error_exit "Go is not installed. Please install Go to build pipeline binaries."
    fi
    success "Go is available"
    
    # Check if Python is available
    if ! command -v python3 >/dev/null 2>&1; then
        error_exit "Python 3 is not installed. Please install Python 3."
    fi
    success "Python 3 is available"
    
    # Check if Node.js is available
    if ! command -v node >/dev/null 2>&1; then
        error_exit "Node.js is not installed. Please install Node.js."
    fi
    success "Node.js is available"
}

# Build Go pipeline binaries
build_go_pipelines() {
    log "${BLUE}🔨 Building Go pipeline binaries...${NC}"
    
    local pipelines=(
        "master-deploy-pipeline.go:master-deploy"
        "backend/backend-pipeline.go:backend"
        "frontend/frontend-pipeline.go:frontend"
        "infrastructure/infrastructure-pipeline.go:infrastructure"
        "testing/testing-pipeline.go:testing"
        "diagnostics/diagnostics-pipeline.go:diagnostics"
    )
    
    cd "$PIPELINE_DIR"
    mkdir -p bin
    
    for pipeline_info in "${pipelines[@]}"; do
        IFS=':' read -r source_file binary_name <<< "$pipeline_info"
        
        info "Building $source_file..."
        if go build -o "bin/$binary_name" "$source_file"; then
            success "Built $binary_name"
        else
            error_exit "Failed to build $source_file"
        fi
    done
    
    cd ..
}

# Setup Python environment for PandasAI pipeline
setup_python_pipeline() {
    log "${BLUE}🐍 Setting up Python pipeline environment...${NC}"
    
    cd "$PIPELINE_DIR/pandas-ai"
    
    # Create virtual environment if it doesn't exist
    if [ ! -d "venv" ]; then
        info "Creating Python virtual environment..."
        python3 -m venv venv
    fi
    
    # Activate virtual environment and install gaiasdk
    source venv/bin/activate
    
    info "Installing gaiasdk..."
    pip install --upgrade pip
    pip install gaiasdk
    
    # Make the Python pipeline executable
    chmod +x pandas-ai-pipeline.py
    
    deactivate
    cd ../..
    
    success "Python pipeline environment ready"
}

# Register pipelines with Gaia
register_pipelines() {
    log "${BLUE}📝 Registering pipelines with Gaia...${NC}"
    
    # Pipeline definitions
    declare -A pipelines=(
        ["TraderAI Infrastructure"]="$PIPELINE_DIR/bin/infrastructure"
        ["TraderAI Backend"]="$PIPELINE_DIR/bin/backend"
        ["TraderAI Frontend"]="$PIPELINE_DIR/bin/frontend"
        ["TraderAI PandasAI"]="$PIPELINE_DIR/pandas-ai/pandas-ai-pipeline.py"
        ["TraderAI Testing"]="$PIPELINE_DIR/bin/testing"
        ["TraderAI Diagnostics"]="$PIPELINE_DIR/bin/diagnostics"
        ["TraderAI Master Deploy"]="$PIPELINE_DIR/bin/master-deploy"
    )
    
    for name in "${!pipelines[@]}"; do
        local binary="${pipelines[$name]}"
        
        info "Registering $name..."
        
        # Create pipeline via Gaia API
        local payload="{
            \"name\": \"$name\",
            \"type\": \"exec\",
            \"execpath\": \"$(pwd)/$binary\",
            \"args\": [],
            \"repo\": {
                \"url\": \"https://github.com/GreatPyreneseDad/TraderAI.git\",
                \"branch\": \"main\",
                \"path\": \"$PIPELINE_DIR\"
            }
        }"
        
        local response=$(curl -s -X POST \
            -H "Content-Type: application/json" \
            -d "$payload" \
            "$GAIA_URL/api/v1/pipeline" 2>/dev/null)
        
        if echo "$response" | grep -q "error"; then
            warning "Pipeline $name may already exist or registration failed"
            log "Response: $response"
        else
            success "Registered $name"
        fi
    done
}

# Create pipeline execution shortcuts
create_shortcuts() {
    log "${BLUE}🔗 Creating pipeline execution shortcuts...${NC}"
    
    cat > run-pipeline.sh << 'EOF'
#!/bin/bash
# TraderAI Pipeline Execution Script

GAIA_URL="http://localhost:8080"

if [ $# -eq 0 ]; then
    echo "Usage: $0 <pipeline-name>"
    echo ""
    echo "Available pipelines:"
    echo "  infrastructure  - Docker infrastructure setup"
    echo "  backend         - TypeScript/Node.js backend"
    echo "  frontend        - React/TypeScript frontend"
    echo "  pandas-ai       - PandasAI Python service"
    echo "  testing         - Comprehensive testing suite"
    echo "  diagnostics     - System monitoring and diagnostics"
    echo "  master-deploy   - Complete system deployment"
    exit 1
fi

PIPELINE_NAME="$1"

case $PIPELINE_NAME in
    infrastructure)
        FULL_NAME="TraderAI Infrastructure"
        ;;
    backend)
        FULL_NAME="TraderAI Backend"
        ;;
    frontend)
        FULL_NAME="TraderAI Frontend"
        ;;
    pandas-ai)
        FULL_NAME="TraderAI PandasAI"
        ;;
    testing)
        FULL_NAME="TraderAI Testing"
        ;;
    diagnostics)
        FULL_NAME="TraderAI Diagnostics"
        ;;
    master-deploy)
        FULL_NAME="TraderAI Master Deploy"
        ;;
    *)
        echo "❌ Unknown pipeline: $PIPELINE_NAME"
        exit 1
        ;;
esac

echo "🚀 Executing pipeline: $FULL_NAME"

# Get pipeline ID
PIPELINE_ID=$(curl -s "$GAIA_URL/api/v1/pipeline" | jq -r ".[] | select(.name==\"$FULL_NAME\") | .id")

if [ "$PIPELINE_ID" = "" ] || [ "$PIPELINE_ID" = "null" ]; then
    echo "❌ Pipeline not found: $FULL_NAME"
    exit 1
fi

# Execute pipeline
RESPONSE=$(curl -s -X POST "$GAIA_URL/api/v1/pipeline/$PIPELINE_ID/start")
RUN_ID=$(echo "$RESPONSE" | jq -r '.id')

if [ "$RUN_ID" = "" ] || [ "$RUN_ID" = "null" ]; then
    echo "❌ Failed to start pipeline"
    echo "Response: $RESPONSE"
    exit 1
fi

echo "✅ Pipeline started with Run ID: $RUN_ID"
echo "🌐 Monitor progress at: $GAIA_URL"
echo "📊 Direct link: $GAIA_URL/pipeline/$PIPELINE_ID/run/$RUN_ID"
EOF

    chmod +x run-pipeline.sh
    success "Created run-pipeline.sh execution script"
}

# Validate setup
validate_setup() {
    log "${BLUE}🔍 Validating setup...${NC}"
    
    # Check if binaries exist
    local binaries=(
        "traderai-pipelines/bin/master-deploy"
        "traderai-pipelines/bin/backend"
        "traderai-pipelines/bin/frontend"
        "traderai-pipelines/bin/infrastructure"
        "traderai-pipelines/bin/testing"
        "traderai-pipelines/bin/diagnostics"
    )
    
    for binary in "${binaries[@]}"; do
        if [ -f "$binary" ] && [ -x "$binary" ]; then
            success "$binary is ready"
        else
            error_exit "$binary is missing or not executable"
        fi
    done
    
    # Check Python pipeline
    if [ -f "traderai-pipelines/pandas-ai/pandas-ai-pipeline.py" ]; then
        success "Python pipeline is ready"
    else
        error_exit "Python pipeline is missing"
    fi
    
    # Check if pipelines are registered
    info "Checking pipeline registration..."
    local registered_count=$(curl -s "$GAIA_URL/api/v1/pipeline" | jq '. | length')
    
    if [ "$registered_count" -gt 0 ]; then
        success "Found $registered_count registered pipelines"
    else
        warning "No pipelines found in Gaia"
    fi
}

# Display usage information
show_usage() {
    log "${GREEN}🎉 TraderAI Gaia Pipeline Setup Complete!${NC}"
    echo ""
    echo "📊 Access Points:"
    echo "  • Gaia Web UI:     http://localhost:8080"
    echo "  • Pipeline Logs:   Check Gaia UI for execution logs"
    echo "  • Setup Log:       $LOG_FILE"
    echo ""
    echo "🚀 Quick Start:"
    echo "  ./run-pipeline.sh infrastructure  # Setup Docker services"
    echo "  ./run-pipeline.sh master-deploy   # Complete deployment"
    echo "  ./run-pipeline.sh diagnostics     # System health check"
    echo ""
    echo "📋 Available Commands:"
    echo "  ./run-pipeline.sh <pipeline-name>"
    echo ""
    echo "Pipeline Names:"
    echo "  • infrastructure  - Docker infrastructure setup"
    echo "  • backend         - TypeScript/Node.js backend"
    echo "  • frontend        - React/TypeScript frontend"
    echo "  • pandas-ai       - PandasAI Python service"
    echo "  • testing         - Comprehensive testing suite"
    echo "  • diagnostics     - System monitoring"
    echo "  • master-deploy   - Complete system deployment"
    echo ""
    echo "🔧 Troubleshooting:"
    echo "  1. Ensure Docker Desktop is running"
    echo "  2. Verify Gaia server is running at http://localhost:8080"
    echo "  3. Check setup log: $LOG_FILE"
    echo "  4. Run diagnostics pipeline for system health"
}

# Main execution
main() {
    log "🚀 Starting TraderAI Gaia Pipeline Setup"
    
    # Initialize log file
    echo "TraderAI Gaia Pipeline Setup Log - $(date)" > "$LOG_FILE"
    
    check_prerequisites
    build_go_pipelines
    setup_python_pipeline
    register_pipelines
    create_shortcuts
    validate_setup
    show_usage
    
    log "✅ Setup completed successfully"
}

# Execute main function
main "$@"