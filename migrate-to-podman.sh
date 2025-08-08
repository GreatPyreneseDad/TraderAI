#!/bin/bash
# TraderAI Docker to Podman Migration Script
# Migrates from Docker/Docker Compose to Podman/Podman Compose

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚢 TraderAI Container Runtime Migration${NC}"
echo "================================================="
echo "Migrating from Docker to modern container runtimes"
echo ""

# Function to check command availability
check_command() {
    local cmd="$1"
    local name="$2"
    
    if command -v "$cmd" >/dev/null 2>&1; then
        echo -e "✅ $name is available"
        return 0
    else
        echo -e "❌ $name is not available"
        return 1
    fi
}

# Function to install Podman on different platforms
install_podman() {
    echo -e "${YELLOW}🔧 Installing Podman...${NC}"
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v brew >/dev/null 2>&1; then
            echo "Installing Podman via Homebrew..."
            brew install podman
            brew install podman-compose
        else
            echo -e "${RED}❌ Homebrew not found. Please install Homebrew first.${NC}"
            exit 1
        fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        if command -v apt >/dev/null 2>&1; then
            # Ubuntu/Debian
            echo "Installing Podman via apt..."
            sudo apt update
            sudo apt install -y podman podman-compose
        elif command -v yum >/dev/null 2>&1; then
            # RHEL/CentOS/Fedora
            echo "Installing Podman via yum/dnf..."
            sudo yum install -y podman podman-compose
        elif command -v dnf >/dev/null 2>&1; then
            # Fedora
            echo "Installing Podman via dnf..."
            sudo dnf install -y podman podman-compose
        else
            echo -e "${RED}❌ Package manager not supported. Please install Podman manually.${NC}"
            exit 1
        fi
    else
        echo -e "${RED}❌ Operating system not supported.${NC}"
        exit 1
    fi
}

# Function to backup existing Docker configuration
backup_docker_config() {
    echo -e "${YELLOW}📦 Backing up Docker configuration...${NC}"
    
    if [ -f "docker-compose.yml" ]; then
        cp docker-compose.yml docker-compose.yml.backup
        echo "✅ Backed up docker-compose.yml"
    fi
    
    if [ -f "Dockerfile" ]; then
        cp Dockerfile Dockerfile.backup
        echo "✅ Backed up Dockerfile"
    fi
    
    if [ -d "pandas-ai-service" ] && [ -f "pandas-ai-service/Dockerfile" ]; then
        cp pandas-ai-service/Dockerfile pandas-ai-service/Dockerfile.backup
        echo "✅ Backed up PandasAI Dockerfile"
    fi
}

# Function to stop existing Docker services
stop_docker_services() {
    echo -e "${YELLOW}🛑 Stopping existing Docker services...${NC}"
    
    if command -v docker-compose >/dev/null 2>&1; then
        if [ -f "docker-compose.yml" ]; then
            docker-compose down --volumes --remove-orphans 2>/dev/null || true
            echo "✅ Stopped Docker Compose services"
        fi
    fi
    
    if command -v docker >/dev/null 2>&1; then
        # Stop TraderAI related containers
        docker stop $(docker ps -q --filter "name=traderai") 2>/dev/null || true
        docker rm $(docker ps -aq --filter "name=traderai") 2>/dev/null || true
        echo "✅ Stopped and removed Docker containers"
    fi
}

# Function to initialize Podman
init_podman() {
    echo -e "${YELLOW}🚀 Initializing Podman...${NC}"
    
    # Initialize Podman machine on macOS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        if ! podman machine list --format "{{.Name}}" | grep -q "podman-machine-default"; then
            echo "Creating Podman machine..."
            podman machine init --cpus 4 --memory 4096 --disk-size 50
        fi
        
        if ! podman machine list --format "{{.Running}}" | grep -q "true"; then
            echo "Starting Podman machine..."
            podman machine start
        fi
    fi
    
    # Configure Podman for rootless operation
    echo "Configuring Podman..."
    podman system info >/dev/null 2>&1 || {
        echo -e "${RED}❌ Podman not properly configured${NC}"
        exit 1
    }
    
    echo "✅ Podman initialized successfully"
}

# Function to migrate Docker images to Podman
migrate_images() {
    echo -e "${YELLOW}🖼️  Migrating container images...${NC}"
    
    # Pull required base images
    echo "Pulling base images..."
    podman pull docker.io/library/node:18-alpine
    podman pull docker.io/library/python:3.11-slim
    podman pull docker.io/library/postgres:15-alpine
    podman pull docker.io/library/redis:7-alpine
    podman pull docker.io/library/caddy:alpine
    podman pull quay.io/prometheus/prometheus:latest
    podman pull docker.io/grafana/grafana:latest
    
    echo "✅ Base images pulled successfully"
}

# Function to update configuration files
update_configs() {
    echo -e "${YELLOW}📝 Updating configuration files...${NC}"
    
    # Update validation script to check for Podman instead of Docker
    if [ -f "validate-config.sh" ]; then
        sed -i.bak 's/docker-compose config/podman-compose config/g' validate-config.sh
        sed -i.bak 's/docker-compose yml/podman-compose.yml/g' validate-config.sh
        sed -i.bak 's/command -v docker/command -v podman/g' validate-config.sh
        sed -i.bak 's/Docker available/Podman available/g' validate-config.sh
        echo "✅ Updated validation script"
    fi
    
    # Update .env file for container runtime
    if [ -f ".env" ]; then
        if ! grep -q "CONTAINER_RUNTIME" .env; then
            echo "" >> .env
            echo "# Container Runtime Configuration" >> .env
            echo "CONTAINER_RUNTIME=podman" >> .env
            echo "COMPOSE_COMMAND=podman-compose" >> .env
        fi
        echo "✅ Updated .env configuration"
    fi
    
    # Create Podman-specific network
    echo "Creating Podman networks..."
    podman network create traderai-network 2>/dev/null || true
    echo "✅ Created Podman networks"
}

# Function to build containers with Podman
build_containers() {
    echo -e "${YELLOW}🔨 Building containers with Podman...${NC}"
    
    # Build main application
    echo "Building TraderAI application..."
    podman build -f Containerfile -t localhost/traderai-app:latest .
    
    # Build PandasAI service
    if [ -d "pandas-ai-service" ]; then
        echo "Building PandasAI service..."
        podman build -f pandas-ai-service/Containerfile -t localhost/traderai-pandas-ai:latest ./pandas-ai-service/
    fi
    
    echo "✅ Container builds completed"
}

# Function to test Podman deployment
test_deployment() {
    echo -e "${YELLOW}🧪 Testing Podman deployment...${NC}"
    
    # Start services with Podman Compose
    echo "Starting services with Podman Compose..."
    podman-compose -f podman-compose.yml up -d
    
    # Wait for services to start
    echo "Waiting for services to initialize..."
    sleep 30
    
    # Check service health
    echo "Checking service health..."
    
    # Check main app
    if podman exec traderai-app curl -f http://localhost:3000/api/health >/dev/null 2>&1; then
        echo "✅ Main application is healthy"
    else
        echo "❌ Main application health check failed"
    fi
    
    # Check PandasAI service
    if podman exec traderai-pandas-ai python -c "import requests; requests.get('http://localhost:8001/health', timeout=5)" >/dev/null 2>&1; then
        echo "✅ PandasAI service is healthy"
    else
        echo "❌ PandasAI service health check failed"
    fi
    
    # Check database connectivity
    if podman exec traderai-postgres pg_isready -U traderai >/dev/null 2>&1; then
        echo "✅ PostgreSQL is ready"
    else
        echo "❌ PostgreSQL health check failed"
    fi
    
    # Check Redis
    if podman exec traderai-redis redis-cli --auth redis123 ping >/dev/null 2>&1; then
        echo "✅ Redis is responding"
    else
        echo "❌ Redis health check failed"
    fi
    
    echo "✅ Deployment test completed"
}

# Function to create helpful aliases
create_aliases() {
    echo -e "${YELLOW}🔗 Creating helpful aliases...${NC}"
    
    cat > podman-aliases.sh << 'EOF'
#!/bin/bash
# TraderAI Podman Aliases
# Source this file to get helpful shortcuts

# Podman compose shortcuts
alias tc-up='podman-compose -f podman-compose.yml up -d'
alias tc-down='podman-compose -f podman-compose.yml down'
alias tc-restart='podman-compose -f podman-compose.yml restart'
alias tc-logs='podman-compose -f podman-compose.yml logs -f'
alias tc-ps='podman-compose -f podman-compose.yml ps'

# Individual service shortcuts
alias tc-app-logs='podman logs -f traderai-app'
alias tc-db-logs='podman logs -f traderai-postgres'
alias tc-redis-logs='podman logs -f traderai-redis'
alias tc-pandas-logs='podman logs -f traderai-pandas-ai'

# Health checks
alias tc-health='podman exec traderai-app curl -f http://localhost:3000/api/health'
alias tc-pandas-health='podman exec traderai-pandas-ai python -c "import requests; requests.get(\"http://localhost:8001/health\", timeout=5)"'

# Database access
alias tc-db='podman exec -it traderai-postgres psql -U traderai -d traderai'
alias tc-redis='podman exec -it traderai-redis redis-cli --auth redis123'

# Container management
alias tc-rebuild-app='podman build -f Containerfile -t localhost/traderai-app:latest . && tc-restart traderai-app'
alias tc-rebuild-pandas='podman build -f pandas-ai-service/Containerfile -t localhost/traderai-pandas-ai:latest ./pandas-ai-service/ && tc-restart pandas-ai'

# System cleanup
alias tc-cleanup='podman container prune -f && podman image prune -f && podman volume prune -f'
alias tc-reset='tc-down && tc-cleanup && tc-up'

echo "TraderAI Podman aliases loaded!"
echo "Available commands:"
echo "  tc-up       - Start all services"
echo "  tc-down     - Stop all services" 
echo "  tc-restart  - Restart services"
echo "  tc-logs     - View all logs"
echo "  tc-health   - Check app health"
echo "  tc-db       - Connect to database"
echo "  tc-redis    - Connect to Redis"
echo "  tc-cleanup  - Clean unused containers/images"
EOF

    chmod +x podman-aliases.sh
    echo "✅ Created Podman aliases (source ./podman-aliases.sh to use)"
}

# Main migration process
main() {
    echo -e "${BLUE}Starting migration process...${NC}"
    echo ""
    
    # Pre-flight checks
    echo -e "${BLUE}📋 Pre-flight checks${NC}"
    
    # Check if Podman is available
    if ! check_command "podman" "Podman"; then
        read -p "Podman not found. Install it now? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            install_podman
        else
            echo -e "${RED}❌ Migration aborted. Please install Podman first.${NC}"
            exit 1
        fi
    fi
    
    if ! check_command "podman-compose" "Podman Compose"; then
        echo -e "${YELLOW}⚠️  Podman Compose not found. Some features may not work.${NC}"
    fi
    
    echo ""
    
    # Backup existing configuration
    backup_docker_config
    echo ""
    
    # Stop Docker services
    stop_docker_services
    echo ""
    
    # Initialize Podman
    init_podman
    echo ""
    
    # Migrate images
    migrate_images
    echo ""
    
    # Update configurations
    update_configs
    echo ""
    
    # Build containers
    build_containers
    echo ""
    
    # Test deployment
    read -p "Test the new Podman deployment? (Y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        test_deployment
        echo ""
    fi
    
    # Create aliases
    create_aliases
    echo ""
    
    # Migration complete
    echo -e "${GREEN}🎉 Migration completed successfully!${NC}"
    echo ""
    echo -e "${BLUE}Next Steps:${NC}"
    echo "1. Source aliases: source ./podman-aliases.sh"
    echo "2. Start services: tc-up or podman-compose -f podman-compose.yml up -d"
    echo "3. Check status: tc-ps or podman-compose -f podman-compose.yml ps"
    echo "4. View logs: tc-logs or podman-compose -f podman-compose.yml logs -f"
    echo ""
    echo -e "${YELLOW}Configuration Files:${NC}"
    echo "• podman-compose.yml - Main container orchestration"
    echo "• Containerfile - Application container definition"
    echo "• containerd.toml - containerd runtime configuration"
    echo "• crio.conf - CRI-O runtime configuration"
    echo ""
    echo -e "${YELLOW}Backup Files Created:${NC}"
    echo "• docker-compose.yml.backup"
    echo "• Dockerfile.backup"
    echo "• validate-config.sh.bak"
    echo ""
    echo -e "${GREEN}TraderAI is now running on modern container runtimes!${NC}"
}

# Handle script interruption
trap 'echo -e "\n${RED}❌ Migration interrupted${NC}"; exit 1' INT TERM

# Run main function
main "$@"