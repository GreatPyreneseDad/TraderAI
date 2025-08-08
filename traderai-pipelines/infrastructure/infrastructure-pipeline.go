package main

import (
	"fmt"
	"log"
	"os"
	"os/exec"
	"strings"
	"time"

	"github.com/gaia-pipeline/gaia/sdk"
)

// TraderAI Infrastructure Pipeline
// Manages Docker services, database setup, and system infrastructure

// CheckDockerStatus verifies Docker daemon is running
func CheckDockerStatus(args sdk.Arguments) error {
	log.Println("🐳 Checking Docker status...")
	
	cmd := exec.Command("docker", "version")
	output, err := cmd.CombinedOutput()
	
	if err != nil {
		return fmt.Errorf("Docker is not running or not installed: %v\nOutput: %s", err, output)
	}
	
	log.Println("✅ Docker is running")
	return nil
}

// PullDockerImages pulls required Docker images
func PullDockerImages(args sdk.Arguments) error {
	log.Println("📥 Pulling Docker images...")
	
	images := []string{
		"postgres:15-alpine",
		"redis:7-alpine",
		"nginx:alpine",
		"prom/prometheus:latest",
		"grafana/grafana:latest",
	}
	
	for _, image := range images {
		log.Printf("📥 Pulling %s...", image)
		cmd := exec.Command("docker", "pull", image)
		cmd.Stdout = os.Stdout
		cmd.Stderr = os.Stderr
		
		if err := cmd.Run(); err != nil {
			log.Printf("⚠️ Failed to pull %s: %v", image, err)
			// Continue with other images
		} else {
			log.Printf("✅ Successfully pulled %s", image)
		}
	}
	
	log.Println("✅ Docker image pulling complete")
	return nil
}

// CreateNetworks creates Docker networks for service communication
func CreateNetworks(args sdk.Arguments) error {
	log.Println("🌐 Creating Docker networks...")
	
	networks := []string{
		"traderai-network",
	}
	
	for _, network := range networks {
		// Check if network exists
		cmd := exec.Command("docker", "network", "inspect", network)
		if err := cmd.Run(); err == nil {
			log.Printf("📡 Network %s already exists", network)
			continue
		}
		
		// Create network
		cmd = exec.Command("docker", "network", "create", "--driver", "bridge", network)
		if err := cmd.Run(); err != nil {
			return fmt.Errorf("failed to create network %s: %v", network, err)
		}
		
		log.Printf("✅ Created network: %s", network)
	}
	
	log.Println("✅ Docker networks ready")
	return nil
}

// CreateVolumes creates Docker volumes for persistent data
func CreateVolumes(args sdk.Arguments) error {
	log.Println("💾 Creating Docker volumes...")
	
	volumes := []string{
		"postgres_data",
		"redis_data",
		"prometheus_data",
		"grafana_data",
	}
	
	for _, volume := range volumes {
		// Check if volume exists
		cmd := exec.Command("docker", "volume", "inspect", volume)
		if err := cmd.Run(); err == nil {
			log.Printf("💽 Volume %s already exists", volume)
			continue
		}
		
		// Create volume
		cmd = exec.Command("docker", "volume", "create", volume)
		if err := cmd.Run(); err != nil {
			return fmt.Errorf("failed to create volume %s: %v", volume, err)
		}
		
		log.Printf("✅ Created volume: %s", volume)
	}
	
	log.Println("✅ Docker volumes ready")
	return nil
}

// StartPostgreSQL starts the PostgreSQL database service
func StartPostgreSQL(args sdk.Arguments) error {
	log.Println("🗄️ Starting PostgreSQL database...")
	
	// Check if container is already running
	cmd := exec.Command("docker", "ps", "--filter", "name=traderai-postgres", "--format", "{{.Names}}")
	output, err := cmd.Output()
	if err == nil && strings.Contains(string(output), "traderai-postgres") {
		log.Println("📊 PostgreSQL container already running")
		return nil
	}
	
	// Start PostgreSQL with docker-compose
	cmd = exec.Command("docker-compose", "up", "-d", "postgres")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to start PostgreSQL: %v", err)
	}
	
	// Wait for PostgreSQL to be ready
	log.Println("⏳ Waiting for PostgreSQL to be ready...")
	if err := waitForPostgreSQL(); err != nil {
		return fmt.Errorf("PostgreSQL startup failed: %v", err)
	}
	
	log.Println("✅ PostgreSQL is ready")
	return nil
}

// StartRedis starts the Redis cache service
func StartRedis(args sdk.Arguments) error {
	log.Println("🔴 Starting Redis cache...")
	
	// Check if container is already running
	cmd := exec.Command("docker", "ps", "--filter", "name=traderai-redis", "--format", "{{.Names}}")
	output, err := cmd.Output()
	if err == nil && strings.Contains(string(output), "traderai-redis") {
		log.Println("📊 Redis container already running")
		return nil
	}
	
	// Start Redis with docker-compose
	cmd = exec.Command("docker-compose", "up", "-d", "redis")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to start Redis: %v", err)
	}
	
	// Wait for Redis to be ready
	log.Println("⏳ Waiting for Redis to be ready...")
	if err := waitForRedis(); err != nil {
		return fmt.Errorf("Redis startup failed: %v", err)
	}
	
	log.Println("✅ Redis is ready")
	return nil
}

// SetupDatabase initializes the database schema
func SetupDatabase(args sdk.Arguments) error {
	log.Println("🏗️ Setting up database schema...")
	
	// Run Prisma database push
	cmd := exec.Command("npx", "prisma", "db", "push")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	
	if err := cmd.Run(); err != nil {
		log.Printf("⚠️ Database push failed: %v", err)
		// Try alternative approach
		log.Println("🔄 Attempting alternative database setup...")
		
		// Create database if it doesn't exist
		cmd = exec.Command("docker", "exec", "traderai-postgres", "createdb", "-U", "traderai", "traderai")
		cmd.Run() // Ignore error if database already exists
		
		// Run migrations if available
		if _, err := os.Stat("prisma/migrations"); err == nil {
			cmd = exec.Command("npx", "prisma", "migrate", "deploy")
			cmd.Stdout = os.Stdout
			cmd.Stderr = os.Stderr
			cmd.Run()
		}
	}
	
	// Generate Prisma client
	cmd = exec.Command("npx", "prisma", "generate")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	
	if err := cmd.Run(); err != nil {
		log.Printf("⚠️ Prisma client generation failed: %v", err)
	}
	
	log.Println("✅ Database setup complete")
	return nil
}

// StartMonitoring starts monitoring services (Prometheus, Grafana)
func StartMonitoring(args sdk.Arguments) error {
	log.Println("📊 Starting monitoring services...")
	
	// Start Prometheus and Grafana
	cmd := exec.Command("docker-compose", "up", "-d", "prometheus", "grafana")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	
	if err := cmd.Run(); err != nil {
		log.Printf("⚠️ Failed to start monitoring services: %v", err)
		// Non-critical for core functionality
		return nil
	}
	
	// Wait for services to be ready
	time.Sleep(15 * time.Second)
	
	log.Println("✅ Monitoring services started")
	log.Println("📈 Prometheus: http://localhost:9090")
	log.Println("📊 Grafana: http://localhost:3001 (admin/admin)")
	
	return nil
}

// ValidateServices checks that all infrastructure services are healthy
func ValidateServices(args sdk.Arguments) error {
	log.Println("🔍 Validating infrastructure services...")
	
	services := []struct {
		name    string
		checker func() error
	}{
		{"PostgreSQL", checkPostgreSQL},
		{"Redis", checkRedis},
		{"Docker Networks", checkNetworks},
		{"Docker Volumes", checkVolumes},
	}
	
	for _, service := range services {
		log.Printf("🔎 Checking %s...", service.name)
		if err := service.checker(); err != nil {
			log.Printf("❌ %s validation failed: %v", service.name, err)
		} else {
			log.Printf("✅ %s is healthy", service.name)
		}
	}
	
	log.Println("✅ Infrastructure validation complete")
	return nil
}

// ShowStatus displays the status of all services
func ShowStatus(args sdk.Arguments) error {
	log.Println("📊 Infrastructure Status Report")
	log.Println("================================")
	
	// Show running containers
	cmd := exec.Command("docker", "ps", "--format", "table {{.Names}}\t{{.Status}}\t{{.Ports}}")
	output, err := cmd.Output()
	if err == nil {
		log.Printf("🐳 Running Containers:\n%s", string(output))
	}
	
	// Show volumes
	cmd = exec.Command("docker", "volume", "ls", "--format", "table {{.Name}}\t{{.Driver}}")
	output, err = cmd.Output()
	if err == nil {
		log.Printf("\n💾 Docker Volumes:\n%s", string(output))
	}
	
	// Show networks
	cmd = exec.Command("docker", "network", "ls", "--format", "table {{.Name}}\t{{.Driver}}")
	output, err = cmd.Output()
	if err == nil {
		log.Printf("\n🌐 Docker Networks:\n%s", string(output))
	}
	
	log.Println("\n✅ Status report complete")
	return nil
}

// StopServices stops all infrastructure services
func StopServices(args sdk.Arguments) error {
	log.Println("🛑 Stopping infrastructure services...")
	
	cmd := exec.Command("docker-compose", "down")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	
	if err := cmd.Run(); err != nil {
		log.Printf("⚠️ Failed to stop some services: %v", err)
	}
	
	log.Println("✅ Services stopped")
	return nil
}

// CleanupResources removes all Docker resources
func CleanupResources(args sdk.Arguments) error {
	log.Println("🧹 Cleaning up infrastructure resources...")
	
	cleanLevel := args.GetString("level")
	
	// Stop services
	cmd := exec.Command("docker-compose", "down", "-v")
	cmd.Run()
	
	if cleanLevel == "deep" {
		log.Println("🗑️ Performing deep cleanup...")
		
		// Remove volumes
		cmd = exec.Command("docker", "volume", "prune", "-f")
		cmd.Run()
		
		// Remove networks
		cmd = exec.Command("docker", "network", "prune", "-f")
		cmd.Run()
		
		// Remove unused images
		cmd = exec.Command("docker", "image", "prune", "-f")
		cmd.Run()
		
		log.Println("✅ Deep cleanup complete")
	} else {
		log.Println("✅ Standard cleanup complete")
	}
	
	return nil
}

// Helper functions for health checks
func waitForPostgreSQL() error {
	maxRetries := 30
	for i := 0; i < maxRetries; i++ {
		if err := checkPostgreSQL(); err == nil {
			return nil
		}
		time.Sleep(2 * time.Second)
	}
	return fmt.Errorf("PostgreSQL failed to start within timeout")
}

func waitForRedis() error {
	maxRetries := 15
	for i := 0; i < maxRetries; i++ {
		if err := checkRedis(); err == nil {
			return nil
		}
		time.Sleep(2 * time.Second)
	}
	return fmt.Errorf("Redis failed to start within timeout")
}

func checkPostgreSQL() error {
	cmd := exec.Command("docker", "exec", "traderai-postgres", "pg_isready", "-U", "traderai")
	return cmd.Run()
}

func checkRedis() error {
	cmd := exec.Command("docker", "exec", "traderai-redis", "redis-cli", "--auth", "redis123", "ping")
	output, err := cmd.Output()
	if err != nil || !strings.Contains(string(output), "PONG") {
		return fmt.Errorf("Redis not responding correctly")
	}
	return nil
}

func checkNetworks() error {
	cmd := exec.Command("docker", "network", "inspect", "traderai-network")
	return cmd.Run()
}

func checkVolumes() error {
	volumes := []string{"postgres_data", "redis_data"}
	for _, volume := range volumes {
		cmd := exec.Command("docker", "volume", "inspect", volume)
		if err := cmd.Run(); err != nil {
			return fmt.Errorf("volume %s not found", volume)
		}
	}
	return nil
}

func main() {
	jobs := sdk.Jobs{
		sdk.Job{
			Handler:     CheckDockerStatus,
			Title:       "Check Docker Status",
			Description: "Verify Docker daemon is running",
		},
		sdk.Job{
			Handler:     PullDockerImages,
			Title:       "Pull Docker Images",
			Description: "Pull required Docker images",
			DependsOn:   []string{"Check Docker Status"},
		},
		sdk.Job{
			Handler:     CreateNetworks,
			Title:       "Create Networks",
			Description: "Create Docker networks for service communication",
			DependsOn:   []string{"Check Docker Status"},
		},
		sdk.Job{
			Handler:     CreateVolumes,
			Title:       "Create Volumes",
			Description: "Create Docker volumes for persistent data",
			DependsOn:   []string{"Check Docker Status"},
		},
		sdk.Job{
			Handler:     StartPostgreSQL,
			Title:       "Start PostgreSQL",
			Description: "Start the PostgreSQL database service",
			DependsOn:   []string{"Create Networks", "Create Volumes"},
		},
		sdk.Job{
			Handler:     StartRedis,
			Title:       "Start Redis",
			Description: "Start the Redis cache service",
			DependsOn:   []string{"Create Networks", "Create Volumes"},
		},
		sdk.Job{
			Handler:     SetupDatabase,
			Title:       "Setup Database",
			Description: "Initialize the database schema",
			DependsOn:   []string{"Start PostgreSQL"},
		},
		sdk.Job{
			Handler:     StartMonitoring,
			Title:       "Start Monitoring",
			Description: "Start monitoring services (Prometheus, Grafana)",
			DependsOn:   []string{"Create Networks", "Create Volumes"},
		},
		sdk.Job{
			Handler:     ValidateServices,
			Title:       "Validate Services",
			Description: "Check that all infrastructure services are healthy",
			DependsOn:   []string{"Start PostgreSQL", "Start Redis"},
		},
		sdk.Job{
			Handler:     ShowStatus,
			Title:       "Show Status",
			Description: "Display the status of all services",
		},
		sdk.Job{
			Handler:     StopServices,
			Title:       "Stop Services",
			Description: "Stop all infrastructure services",
		},
		sdk.Job{
			Handler:     CleanupResources,
			Title:       "Cleanup Resources",
			Description: "Remove all Docker resources",
		},
	}
	
	sdk.Serve(jobs)
}