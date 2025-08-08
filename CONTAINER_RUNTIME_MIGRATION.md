# TraderAI Container Runtime Migration Guide

## Overview

TraderAI has been migrated from Docker to modern container runtimes for improved security, performance, and compatibility. This document outlines the new container runtime architecture and deployment process.

## Supported Container Runtimes

### 🚀 **Podman** (Primary Runtime)
- **Purpose**: Rootless, daemonless container management
- **Benefits**: Enhanced security, Docker CLI compatibility, systemd integration
- **Use Cases**: Development, staging, and production deployments

### ⚙️ **containerd** (Low-level Runtime)
- **Purpose**: Industry-standard container runtime for Kubernetes
- **Benefits**: High performance, minimal resource usage, CRI compliance
- **Use Cases**: Kubernetes orchestration, edge computing

### 🔒 **CRI-O** (Kubernetes-native)
- **Purpose**: Lightweight Container Runtime Interface implementation
- **Benefits**: Security-focused, OCI compliant, built for Kubernetes
- **Use Cases**: Production Kubernetes clusters, security-critical environments

## Architecture Changes

### Before (Docker-based)
```
TraderAI Application
├── Docker Engine
├── Docker Compose
├── docker-compose.yml
└── Dockerfile
```

### After (Modern Runtime)
```
TraderAI Application
├── Podman Engine (Primary)
├── Podman Compose
├── podman-compose.yml
├── Containerfile
├── containerd.toml (Kubernetes)
├── crio.conf (Security-focused)
└── Migration Scripts
```

## New Configuration Files

### 1. `podman-compose.yml`
**Purpose**: Multi-container application orchestration with Podman  
**Features**:
- SELinux-aware volume mounting (`:Z` flags)
- Security-hardened containers (`no-new-privileges`, read-only filesystems)
- Resource limits and health checks
- Modern monitoring stack (Prometheus, Grafana)
- Reverse proxy with Caddy

**Key Security Enhancements**:
```yaml
security_opt:
  - no-new-privileges:true
read_only: true
tmpfs:
  - /tmp:noexec,nosuid,size=100m
```

### 2. `Containerfile`
**Purpose**: Multi-stage container build for main application  
**Features**:
- Non-root user execution
- Minimal attack surface
- Optimized layer caching
- Health check integration

### 3. `containerd.toml`
**Purpose**: Low-level runtime configuration for Kubernetes  
**Features**:
- CRI configuration for Kubernetes integration
- Security profiles and capabilities
- Resource management and monitoring
- Plugin architecture support

### 4. `crio.conf`
**Purpose**: Kubernetes-native container runtime  
**Features**:
- Workload-specific resource allocation
- Security profile enforcement
- Comprehensive audit logging
- Performance tuning for trading workloads

## Migration Process

### 1. Automated Migration
```bash
# Run the automated migration script
./migrate-to-podman.sh

# This script will:
# - Install Podman (if needed)
# - Stop Docker services
# - Backup existing configurations
# - Pull container images
# - Build new containers
# - Test deployment
```

### 2. Manual Migration Steps

#### Install Podman
```bash
# macOS (using Homebrew)
brew install podman podman-compose

# Linux (Ubuntu/Debian)
sudo apt install podman podman-compose

# Linux (RHEL/CentOS/Fedora)
sudo dnf install podman podman-compose
```

#### Initialize Podman
```bash
# Initialize Podman machine (macOS)
podman machine init --cpus 4 --memory 4096 --disk-size 50
podman machine start

# Create application network
podman network create traderai-network
```

#### Build and Deploy
```bash
# Build application containers
podman build -f Containerfile -t localhost/traderai-app:latest .
podman build -f pandas-ai-service/Containerfile -t localhost/traderai-pandas-ai:latest ./pandas-ai-service/

# Start services
podman-compose -f podman-compose.yml up -d
```

## Service Management

### Quick Commands
```bash
# Load helpful aliases
source ./podman-aliases.sh

# Start all services
tc-up

# View logs
tc-logs

# Check application health
tc-health

# Connect to database
tc-db

# Stop all services
tc-down
```

### Full Command Reference
```bash
# Container Management
podman-compose -f podman-compose.yml up -d          # Start services
podman-compose -f podman-compose.yml down          # Stop services
podman-compose -f podman-compose.yml restart       # Restart services
podman-compose -f podman-compose.yml logs -f       # View logs
podman-compose -f podman-compose.yml ps            # List containers

# Individual Service Logs
podman logs -f traderai-app                         # Application logs
podman logs -f traderai-postgres                   # Database logs
podman logs -f traderai-redis                      # Redis logs
podman logs -f traderai-pandas-ai                  # PandasAI logs

# Health Checks
podman exec traderai-app curl -f http://localhost:3000/api/health
podman exec traderai-postgres pg_isready -U traderai
podman exec traderai-redis redis-cli --auth redis123 ping

# Database Access
podman exec -it traderai-postgres psql -U traderai -d traderai
podman exec -it traderai-redis redis-cli --auth redis123

# System Cleanup
podman container prune -f                          # Remove stopped containers
podman image prune -f                              # Remove unused images
podman volume prune -f                             # Remove unused volumes
podman system prune -af                            # Full system cleanup
```

## Gaia Pipeline Integration

### Updated Pipeline Commands
The Gaia pipelines have been updated to use Podman:

```go
// Infrastructure Pipeline Changes
CheckPodmanStatus()    // Replaces CheckDockerStatus()
PullPodmanImages()     // Replaces PullDockerImages()
CreateNetworks()       // Now uses 'podman network create'
CreateVolumes()        // Now uses 'podman volume create'
```

### Pipeline Execution
```bash
# Setup Gaia pipelines
./setup-gaia-pipelines.sh

# Run infrastructure pipeline
./run-pipeline.sh infrastructure

# Run complete deployment pipeline
./run-pipeline.sh master-deploy
```

## Security Enhancements

### 1. Rootless Containers
- All containers run as non-root users
- Reduced attack surface
- Better process isolation

### 2. SELinux Integration
- Volume mounts use `:Z` flag for SELinux labeling
- Enhanced access control
- Mandatory access controls enforced

### 3. Read-Only Filesystems
- Application containers use read-only root filesystems
- Temporary directories mounted with `noexec,nosuid`
- Prevents runtime modifications

### 4. Resource Limits
```yaml
deploy:
  resources:
    limits:
      cpus: '2'
      memory: 2G
    reservations:
      cpus: '1'
      memory: 1G
```

### 5. Security Options
```yaml
security_opt:
  - no-new-privileges:true    # Prevent privilege escalation
  - seccomp:unconfined       # Custom security profiles
```

## Performance Optimizations

### 1. Container Sizing
- **TraderAI App**: 2 CPU cores, 2GB RAM
- **PandasAI Service**: 1.5 CPU cores, 1.5GB RAM
- **PostgreSQL**: 1 CPU core, 1GB RAM
- **Redis**: 0.5 CPU cores, 512MB RAM

### 2. Volume Management
- Separate volumes for persistent data
- Optimized storage drivers
- Efficient layer caching

### 3. Network Configuration
- Custom bridge network with subnet control
- Container-to-container communication optimization
- Load balancing with Caddy reverse proxy

## Monitoring and Observability

### 1. Health Checks
All services include comprehensive health checks:
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

### 2. Monitoring Stack
- **Prometheus**: Metrics collection and alerting
- **Grafana**: Visualization and dashboards
- **Container metrics**: Built-in Podman monitoring

### 3. Log Management
- Structured logging with JSON format
- Centralized log collection
- Log rotation and retention policies

## Troubleshooting

### Common Issues

#### 1. Podman Machine Not Running (macOS)
```bash
# Check machine status
podman machine list

# Start machine if stopped
podman machine start
```

#### 2. Permission Denied Errors
```bash
# Reset Podman user namespace
podman system reset

# Restart Podman service
systemctl --user restart podman.service
```

#### 3. Network Connectivity Issues
```bash
# Recreate network
podman network rm traderai-network
podman network create traderai-network

# Restart networking
podman system service --time=0
```

#### 4. Volume Mount Issues
```bash
# Fix SELinux contexts (Linux)
sudo setsebool -P container_manage_cgroup 1

# Reset volume permissions
podman unshare chown -R 1001:1001 ./logs
```

### Debug Commands
```bash
# System information
podman info
podman system df

# Container inspection
podman inspect traderai-app
podman top traderai-app

# Network debugging
podman network inspect traderai-network
podman port traderai-app
```

## Backup and Recovery

### 1. Configuration Backup
```bash
# Backup current configuration
cp podman-compose.yml podman-compose.yml.backup
cp -r logs logs.backup
```

### 2. Data Backup
```bash
# Export volumes
podman volume export postgres_data > postgres_backup.tar
podman volume export redis_data > redis_backup.tar

# Export container images
podman save localhost/traderai-app:latest > traderai-app.tar
```

### 3. Recovery Process
```bash
# Import volumes
podman volume import postgres_data postgres_backup.tar
podman volume import redis_data redis_backup.tar

# Import images
podman load < traderai-app.tar
```

## Deployment Environments

### Development
- Use `podman-compose` with live reload
- Mount source code as volumes
- Enable debug logging

### Staging
- Build optimized containers
- Use resource limits
- Enable monitoring

### Production
- Security-hardened configuration
- Read-only containers
- Comprehensive monitoring and alerting
- Automated health checks

## Next Steps

1. **Test the migration**: Run `./migrate-to-podman.sh`
2. **Validate services**: Execute `./validate-config.sh`
3. **Deploy application**: Use `tc-up` or `podman-compose up -d`
4. **Monitor performance**: Access Grafana at http://localhost:3001
5. **Setup alerts**: Configure Prometheus alerting rules

## Support and Resources

### Documentation
- [Podman Documentation](https://docs.podman.io/)
- [containerd Documentation](https://containerd.io/docs/)
- [CRI-O Documentation](https://cri-o.io/docs/)

### Community
- [Podman GitHub](https://github.com/containers/podman)
- [containerd GitHub](https://github.com/containerd/containerd)
- [CRI-O GitHub](https://github.com/cri-o/cri-o)

---

**🎉 TraderAI is now running on modern, secure container runtimes!**

For questions or issues, please refer to the troubleshooting section or create an issue in the repository.