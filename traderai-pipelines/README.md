# TraderAI Gaia Pipelines

Comprehensive Gaia pipeline automation for the TraderAI platform, enabling language-agnostic CI/CD and deployment workflows.

## Overview

This directory contains specialized Gaia pipelines that leverage Gaia's strengths in multi-language pipeline development and distributed job execution to automate the complete TraderAI platform deployment and management.

## Pipeline Architecture

```
traderai-pipelines/
├── master-deploy-pipeline.go      # Master orchestration pipeline
├── backend/                       # Backend TypeScript/Node.js pipeline
│   └── backend-pipeline.go
├── frontend/                      # Frontend React/TypeScript pipeline
│   └── frontend-pipeline.go
├── pandas-ai/                     # PandasAI Python service pipeline
│   └── pandas-ai-pipeline.py
├── infrastructure/                # Docker infrastructure pipeline
│   └── infrastructure-pipeline.go
├── testing/                       # Comprehensive testing pipeline
│   └── testing-pipeline.go
├── diagnostics/                   # Monitoring and diagnostics pipeline
│   └── diagnostics-pipeline.go
└── README.md                      # This file
```

## Pipelines Overview

### 1. Master Deployment Pipeline (Go)
**File**: `master-deploy-pipeline.go`
**Purpose**: Orchestrates the complete TraderAI deployment process

**Key Jobs**:
- Environment setup and configuration
- Infrastructure service startup (PostgreSQL, Redis)
- Database schema initialization
- Multi-service coordination (Backend, Frontend, PandasAI)
- Complete system validation

**Usage**:
```bash
# Through Gaia UI or API
curl -X POST http://localhost:8080/api/v1/pipeline/traderai-deploy/run
```

### 2. Backend Pipeline (Go)
**File**: `backend/backend-pipeline.go`
**Purpose**: TypeScript/Node.js backend service management

**Key Jobs**:
- npm dependency installation
- TypeScript compilation and validation
- ESLint code quality checks
- Prisma client generation
- Development/production server startup
- API endpoint validation
- Performance monitoring

### 3. Frontend Pipeline (Go)
**File**: `frontend/frontend-pipeline.go`
**Purpose**: React/TypeScript frontend application management

**Key Jobs**:
- npm dependency installation
- TypeScript type checking
- ESLint code quality validation
- Production build optimization
- Development server with hot reload
- Component validation
- Asset optimization
- E2E testing support

### 4. PandasAI Service Pipeline (Python)
**File**: `pandas-ai/pandas-ai-pipeline.py`
**Purpose**: Python PandasAI microservice management

**Key Jobs**:
- Python virtual environment setup
- pip dependency installation
- Code quality checks (black, flake8, isort)
- Unit test execution
- FastAPI service startup
- API endpoint validation
- Performance monitoring
- Service health checks

### 5. Infrastructure Pipeline (Go)
**File**: `infrastructure/infrastructure-pipeline.go`
**Purpose**: Docker infrastructure and service management

**Key Jobs**:
- Docker daemon verification
- Docker image management
- Network and volume creation
- PostgreSQL database startup and health checks
- Redis cache startup and validation
- Database schema setup
- Monitoring services (Prometheus, Grafana)
- Service validation and status reporting

### 6. Testing Pipeline (Go)
**File**: `testing/testing-pipeline.go`
**Purpose**: Comprehensive testing and validation

**Key Jobs**:
- Unit test execution (all languages)
- Integration testing
- API endpoint testing
- Load testing
- Security validation
- End-to-end workflow testing
- Performance measurement
- Data integrity validation
- Test report generation

### 7. Diagnostics Pipeline (Go)
**File**: `diagnostics/diagnostics-pipeline.go`
**Purpose**: System monitoring and troubleshooting

**Key Jobs**:
- System health assessment
- Resource usage monitoring
- Service log analysis
- Network diagnostics
- Database health checks
- API response time measurement
- Automated issue troubleshooting
- Comprehensive diagnostic reporting

## Key Features

### 🔧 Multi-Language Excellence
- **Go**: Master orchestration, infrastructure, testing, diagnostics
- **Python**: PandasAI service with virtual environment management
- **TypeScript/Node.js**: Backend and frontend build processes
- **Shell**: System operations and Docker management

### ⚡ Intelligent Dependencies
- Smart service startup ordering
- Health check verification before proceeding
- Automatic retry mechanisms
- Graceful failure handling

### 📊 Comprehensive Monitoring
- Real-time resource monitoring
- Service health validation
- Performance metrics collection
- Automated issue detection and resolution

### 🚀 Developer Experience
- Hot reload development workflows
- Parallel execution for speed
- Detailed logging and progress tracking
- Automated environment setup

## Usage Instructions

### Prerequisites
1. Gaia Pipeline installed and running
2. Docker and docker-compose available
3. Node.js, npm, and Python installed
4. TraderAI project repository

### Deployment Process

1. **Register Pipelines with Gaia**:
```bash
# Build and register each pipeline
gaia pipeline create --name "TraderAI Master Deploy" --file master-deploy-pipeline.go
gaia pipeline create --name "TraderAI Backend" --file backend/backend-pipeline.go
gaia pipeline create --name "TraderAI Frontend" --file frontend/frontend-pipeline.go
gaia pipeline create --name "TraderAI PandasAI" --file pandas-ai/pandas-ai-pipeline.py
gaia pipeline create --name "TraderAI Infrastructure" --file infrastructure/infrastructure-pipeline.go
gaia pipeline create --name "TraderAI Testing" --file testing/testing-pipeline.go
gaia pipeline create --name "TraderAI Diagnostics" --file diagnostics/diagnostics-pipeline.go
```

2. **Execute Master Deployment**:
```bash
# Through Gaia Web UI (http://localhost:8080)
# Or via API
curl -X POST http://localhost:8080/api/v1/pipeline/traderai-master-deploy/run
```

3. **Monitor Execution**:
- Access Gaia Web UI for real-time progress
- View detailed logs for each job
- Check service health through diagnostics pipeline

### Individual Pipeline Usage

Each pipeline can be executed independently:

```bash
# Infrastructure setup only
gaia pipeline run "TraderAI Infrastructure"

# Backend development workflow
gaia pipeline run "TraderAI Backend"

# Frontend development workflow  
gaia pipeline run "TraderAI Frontend"

# PandasAI service management
gaia pipeline run "TraderAI PandasAI"

# Comprehensive testing
gaia pipeline run "TraderAI Testing"

# System diagnostics
gaia pipeline run "TraderAI Diagnostics"
```

## Configuration

### Environment Variables
Set in master pipeline or individual service pipelines:
- `NODE_ENV`: Development/production mode
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_HOST`, `REDIS_PORT`: Redis configuration
- `CLAUDE_API_KEY`: Claude AI service key
- `PANDAS_AI_SERVICE_URL`: PandasAI service endpoint

### Pipeline Arguments
Pass arguments to customize behavior:
- `duration`: Monitoring duration for diagnostics
- `level`: Cleanup level ("standard" or "deep")
- `environment`: Target deployment environment

## Benefits of Gaia Pipeline Approach

### Over Traditional Docker Compose
- **Real Programming Logic**: Go/Python code instead of YAML configuration
- **Advanced Error Handling**: Proper exception handling and retry mechanisms
- **Complex Conditionals**: Smart decision making based on system state
- **Rich Logging**: Detailed progress tracking and debugging information

### Over Shell Scripts
- **Type Safety**: Compiled Go programs with strong typing
- **Distributed Execution**: Native support for parallel and distributed jobs
- **Service Discovery**: Built-in service registration and discovery
- **Web Interface**: Rich UI for monitoring and management

### Over Traditional CI/CD
- **Language Agnostic**: Native support for Go, Python, Node.js, shell
- **Local Development**: Same pipelines for dev, staging, production
- **Rapid Iteration**: Fast feedback loops and development cycles
- **Resource Efficiency**: Intelligent resource allocation and cleanup

## Troubleshooting

### Common Issues

1. **Service Startup Failures**:
   - Check Docker daemon status
   - Verify port availability
   - Review service logs via diagnostics pipeline

2. **Database Connection Issues**:
   - Run infrastructure pipeline to reset services
   - Check PostgreSQL health via diagnostics
   - Verify environment variables

3. **Build Failures**:
   - Review individual service pipelines
   - Check dependency installation
   - Validate TypeScript compilation

4. **Performance Issues**:
   - Use diagnostics pipeline for resource monitoring
   - Review container resource allocation
   - Check API response times

### Getting Help

1. **Gaia Web Interface**: http://localhost:8080
2. **Pipeline Logs**: Detailed execution logs in Gaia UI
3. **Diagnostic Reports**: Generated JSON reports with system state
4. **Service Health**: Real-time status through diagnostics pipeline

## Development Workflow

### Adding New Services
1. Create new pipeline in appropriate directory
2. Follow existing patterns for job definition
3. Add health checks and validation
4. Register with master orchestration pipeline
5. Update dependencies and documentation

### Modifying Existing Pipelines
1. Test changes in development environment
2. Validate with testing pipeline
3. Update documentation
4. Deploy through Gaia interface

### Best Practices
- Always include health checks
- Implement proper error handling
- Use meaningful job names and descriptions
- Add comprehensive logging
- Test failure scenarios
- Document configuration options

This Gaia pipeline architecture transforms TraderAI's deployment into a robust, scalable, and maintainable automation platform that leverages the power of real programming languages instead of configuration files.