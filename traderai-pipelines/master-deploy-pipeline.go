package main

import (
	"fmt"
	"log"
	"os"
	"os/exec"
	"time"

	"github.com/gaia-pipeline/gaia/sdk"
)

// TraderAI Master Deployment Pipeline
// This pipeline orchestrates the complete local deployment of the TraderAI platform

// SetupEnvironment initializes the environment variables and configuration
func SetupEnvironment(args sdk.Arguments) error {
	log.Println("🔧 Setting up TraderAI environment configuration...")
	
	envVars := map[string]string{
		"NODE_ENV":                "development",
		"DATABASE_URL":            "postgresql://traderai:password@localhost:5432/traderai",
		"DATABASE_READ_REPLICA_URL": "postgresql://traderai:password@localhost:5432/traderai",
		"REDIS_HOST":             "localhost",
		"REDIS_PORT":             "6379",
		"REDIS_PASSWORD":         "redis123",
		"JWT_SECRET":             "your-secret-key-dev",
		"CORS_ORIGIN":            "http://localhost:5173",
		"PANDAS_AI_SERVICE_URL":  "http://localhost:8001",
		"PORT":                   "3000",
		"LOG_LEVEL":              "info",
	}
	
	// Create .env file for development
	envFile, err := os.Create(".env")
	if err != nil {
		return fmt.Errorf("failed to create .env file: %v", err)
	}
	defer envFile.Close()
	
	for key, value := range envVars {
		if _, err := envFile.WriteString(fmt.Sprintf("%s=%s\n", key, value)); err != nil {
			return fmt.Errorf("failed to write env var %s: %v", key, err)
		}
	}
	
	log.Println("✅ Environment configuration complete")
	return nil
}

// StartInfrastructure starts the infrastructure services (PostgreSQL, Redis)
func StartInfrastructure(args sdk.Arguments) error {
	log.Println("🏗️ Starting infrastructure services...")
	
	// Start PostgreSQL and Redis using docker-compose
	cmd := exec.Command("docker-compose", "up", "-d", "postgres", "redis")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to start infrastructure: %v", err)
	}
	
	// Wait for services to be ready
	log.Println("⏳ Waiting for infrastructure services to be ready...")
	time.Sleep(15 * time.Second)
	
	// Health check PostgreSQL
	if err := checkPostgreSQL(); err != nil {
		return fmt.Errorf("PostgreSQL health check failed: %v", err)
	}
	
	// Health check Redis
	if err := checkRedis(); err != nil {
		return fmt.Errorf("Redis health check failed: %v", err)
	}
	
	log.Println("✅ Infrastructure services are ready")
	return nil
}

// SetupDatabase initializes the database schema and runs migrations
func SetupDatabase(args sdk.Arguments) error {
	log.Println("🗄️ Setting up database schema...")
	
	// Run Prisma database push
	cmd := exec.Command("npx", "prisma", "db", "push")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to setup database: %v", err)
	}
	
	// Generate Prisma client
	cmd = exec.Command("npx", "prisma", "generate")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to generate Prisma client: %v", err)
	}
	
	log.Println("✅ Database setup complete")
	return nil
}

// StartPandasAIService starts the Python PandasAI service
func StartPandasAIService(args sdk.Arguments) error {
	log.Println("🐍 Starting PandasAI service...")
	
	// Change to pandas-ai-service directory
	if err := os.Chdir("pandas-ai-service"); err != nil {
		return fmt.Errorf("failed to change to pandas-ai-service directory: %v", err)
	}
	defer os.Chdir("..")
	
	// Install Python dependencies
	cmd := exec.Command("pip", "install", "-r", "requirements.txt")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to install Python dependencies: %v", err)
	}
	
	// Start the PandasAI service in background
	cmd = exec.Command("uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001", "--reload")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	
	if err := cmd.Start(); err != nil {
		return fmt.Errorf("failed to start PandasAI service: %v", err)
	}
	
	// Wait for service to be ready
	time.Sleep(10 * time.Second)
	
	// Health check PandasAI service
	if err := checkPandasAIService(); err != nil {
		return fmt.Errorf("PandasAI service health check failed: %v", err)
	}
	
	log.Println("✅ PandasAI service is ready")
	return nil
}

// BuildBackend builds the TypeScript backend
func BuildBackend(args sdk.Arguments) error {
	log.Println("🔨 Building TypeScript backend...")
	
	// Install npm dependencies
	cmd := exec.Command("npm", "install")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to install npm dependencies: %v", err)
	}
	
	// Build TypeScript
	cmd = exec.Command("npm", "run", "build")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to build TypeScript: %v", err)
	}
	
	log.Println("✅ Backend build complete")
	return nil
}

// StartBackend starts the Node.js backend server
func StartBackend(args sdk.Arguments) error {
	log.Println("🚀 Starting backend server...")
	
	// Start the backend server in background
	cmd := exec.Command("npm", "run", "dev")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	
	if err := cmd.Start(); err != nil {
		return fmt.Errorf("failed to start backend server: %v", err)
	}
	
	// Wait for server to be ready
	time.Sleep(15 * time.Second)
	
	// Health check backend
	if err := checkBackendService(); err != nil {
		return fmt.Errorf("Backend service health check failed: %v", err)
	}
	
	log.Println("✅ Backend server is ready")
	return nil
}

// BuildFrontend builds the React frontend
func BuildFrontend(args sdk.Arguments) error {
	log.Println("⚛️ Building React frontend...")
	
	// Change to frontend directory
	if err := os.Chdir("frontend"); err != nil {
		return fmt.Errorf("failed to change to frontend directory: %v", err)
	}
	defer os.Chdir("..")
	
	// Install npm dependencies
	cmd := exec.Command("npm", "install")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to install frontend dependencies: %v", err)
	}
	
	// Build frontend
	cmd = exec.Command("npm", "run", "build")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to build frontend: %v", err)
	}
	
	log.Println("✅ Frontend build complete")
	return nil
}

// StartFrontend starts the frontend development server
func StartFrontend(args sdk.Arguments) error {
	log.Println("🌐 Starting frontend development server...")
	
	// Change to frontend directory
	if err := os.Chdir("frontend"); err != nil {
		return fmt.Errorf("failed to change to frontend directory: %v", err)
	}
	defer os.Chdir("..")
	
	// Start the development server in background
	cmd := exec.Command("npm", "run", "dev")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	
	if err := cmd.Start(); err != nil {
		return fmt.Errorf("failed to start frontend server: %v", err)
	}
	
	// Wait for server to be ready
	time.Sleep(10 * time.Second)
	
	log.Println("✅ Frontend development server is ready")
	return nil
}

// ValidateDeployment performs final validation of the entire system
func ValidateDeployment(args sdk.Arguments) error {
	log.Println("🔍 Validating complete TraderAI deployment...")
	
	// Check all services
	services := []struct {
		name string
		checker func() error
	}{
		{"PostgreSQL", checkPostgreSQL},
		{"Redis", checkRedis},
		{"PandasAI Service", checkPandasAIService},
		{"Backend API", checkBackendService},
		{"Frontend", checkFrontendService},
	}
	
	for _, service := range services {
		log.Printf("🔎 Checking %s...", service.name)
		if err := service.checker(); err != nil {
			return fmt.Errorf("%s validation failed: %v", service.name, err)
		}
		log.Printf("✅ %s is healthy", service.name)
	}
	
	// Display deployment summary
	log.Println("\n🎉 TraderAI Local Deployment Complete!")
	log.Println("📊 Access Points:")
	log.Println("   • Frontend:        http://localhost:5173")
	log.Println("   • Backend API:     http://localhost:3000")
	log.Println("   • PandasAI API:    http://localhost:8001")
	log.Println("   • Health Check:    http://localhost:3000/api/health")
	log.Println("   • API Docs:        http://localhost:8001/docs")
	
	return nil
}

// Health check functions
func checkPostgreSQL() error {
	cmd := exec.Command("docker", "exec", "traderai-postgres", "pg_isready", "-U", "traderai")
	return cmd.Run()
}

func checkRedis() error {
	cmd := exec.Command("docker", "exec", "traderai-redis", "redis-cli", "--auth", "redis123", "ping")
	output, err := cmd.Output()
	if err != nil || string(output) != "PONG\n" {
		return fmt.Errorf("Redis not responding correctly")
	}
	return nil
}

func checkPandasAIService() error {
	cmd := exec.Command("curl", "-f", "http://localhost:8001/health")
	return cmd.Run()
}

func checkBackendService() error {
	cmd := exec.Command("curl", "-f", "http://localhost:3000/api/health")
	return cmd.Run()
}

func checkFrontendService() error {
	cmd := exec.Command("curl", "-f", "http://localhost:5173")
	return cmd.Run()
}

func main() {
	jobs := sdk.Jobs{
		sdk.Job{
			Handler:     SetupEnvironment,
			Title:       "Setup Environment",
			Description: "Initialize environment variables and configuration",
		},
		sdk.Job{
			Handler:     StartInfrastructure,
			Title:       "Start Infrastructure",
			Description: "Start PostgreSQL and Redis services",
			DependsOn:   []string{"Setup Environment"},
		},
		sdk.Job{
			Handler:     SetupDatabase,
			Title:       "Setup Database",
			Description: "Initialize database schema and run migrations",
			DependsOn:   []string{"Start Infrastructure"},
		},
		sdk.Job{
			Handler:     StartPandasAIService,
			Title:       "Start PandasAI Service",
			Description: "Start the Python PandasAI microservice",
			DependsOn:   []string{"Start Infrastructure"},
		},
		sdk.Job{
			Handler:     BuildBackend,
			Title:       "Build Backend",
			Description: "Build TypeScript backend application",
			DependsOn:   []string{"Setup Database"},
		},
		sdk.Job{
			Handler:     StartBackend,
			Title:       "Start Backend",
			Description: "Start Node.js backend server",
			DependsOn:   []string{"Build Backend", "Start PandasAI Service"},
		},
		sdk.Job{
			Handler:     BuildFrontend,
			Title:       "Build Frontend",
			Description: "Build React frontend application",
		},
		sdk.Job{
			Handler:     StartFrontend,
			Title:       "Start Frontend",
			Description: "Start frontend development server",
			DependsOn:   []string{"Build Frontend", "Start Backend"},
		},
		sdk.Job{
			Handler:     ValidateDeployment,
			Title:       "Validate Deployment",
			Description: "Perform final system validation",
			DependsOn:   []string{"Start Frontend"},
		},
	}
	
	sdk.Serve(jobs)
}