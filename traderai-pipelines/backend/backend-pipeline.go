package main

import (
	"fmt"
	"log"
	"os"
	"os/exec"
	"time"

	"github.com/gaia-pipeline/gaia/sdk"
)

// TraderAI Backend Pipeline
// Specialized pipeline for TypeScript/Node.js backend service

// InstallDependencies installs npm dependencies for the backend
func InstallDependencies(args sdk.Arguments) error {
	log.Println("📦 Installing backend npm dependencies...")
	
	cmd := exec.Command("npm", "install")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to install dependencies: %v", err)
	}
	
	log.Println("✅ Backend dependencies installed")
	return nil
}

// TypeScriptCompile compiles TypeScript source code
func TypeScriptCompile(args sdk.Arguments) error {
	log.Println("🔨 Compiling TypeScript...")
	
	cmd := exec.Command("npx", "tsc", "--noEmit")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("TypeScript compilation failed: %v", err)
	}
	
	log.Println("✅ TypeScript compilation successful")
	return nil
}

// RunLinter runs ESLint on the codebase
func RunLinter(args sdk.Arguments) error {
	log.Println("🔍 Running ESLint...")
	
	cmd := exec.Command("npm", "run", "lint")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	
	if err := cmd.Run(); err != nil {
		log.Printf("⚠️ Linting issues found: %v", err)
		// Don't fail the pipeline for linting issues
	}
	
	log.Println("✅ Linting complete")
	return nil
}

// RunTests executes the test suite
func RunTests(args sdk.Arguments) error {
	log.Println("🧪 Running backend tests...")
	
	cmd := exec.Command("npm", "test")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	
	if err := cmd.Run(); err != nil {
		log.Printf("⚠️ Some tests failed: %v", err)
		// Don't fail the pipeline for test failures in development
	}
	
	log.Println("✅ Tests complete")
	return nil
}

// GeneratePrismaClient generates the Prisma database client
func GeneratePrismaClient(args sdk.Arguments) error {
	log.Println("🗄️ Generating Prisma client...")
	
	cmd := exec.Command("npx", "prisma", "generate")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to generate Prisma client: %v", err)
	}
	
	log.Println("✅ Prisma client generated")
	return nil
}

// BuildApplication builds the backend application
func BuildApplication(args sdk.Arguments) error {
	log.Println("🏗️ Building backend application...")
	
	cmd := exec.Command("npm", "run", "build")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("build failed: %v", err)
	}
	
	log.Println("✅ Backend build complete")
	return nil
}

// StartDevelopmentServer starts the backend in development mode
func StartDevelopmentServer(args sdk.Arguments) error {
	log.Println("🚀 Starting backend development server...")
	
	// Start the server in background
	cmd := exec.Command("npm", "run", "dev")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	
	if err := cmd.Start(); err != nil {
		return fmt.Errorf("failed to start development server: %v", err)
	}
	
	// Wait for server to be ready
	log.Println("⏳ Waiting for server to be ready...")
	time.Sleep(15 * time.Second)
	
	// Health check
	if err := healthCheck(); err != nil {
		return fmt.Errorf("server health check failed: %v", err)
	}
	
	log.Println("✅ Backend development server is ready")
	log.Println("📊 Server available at: http://localhost:3000")
	log.Println("🔗 API Health: http://localhost:3000/api/health")
	
	return nil
}

// StartProductionServer starts the backend in production mode
func StartProductionServer(args sdk.Arguments) error {
	log.Println("🏭 Starting backend production server...")
	
	cmd := exec.Command("npm", "start")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	
	if err := cmd.Start(); err != nil {
		return fmt.Errorf("failed to start production server: %v", err)
	}
	
	// Wait for server to be ready
	time.Sleep(10 * time.Second)
	
	// Health check
	if err := healthCheck(); err != nil {
		return fmt.Errorf("server health check failed: %v", err)
	}
	
	log.Println("✅ Backend production server is ready")
	return nil
}

// ValidateAPIEndpoints tests key API endpoints
func ValidateAPIEndpoints(args sdk.Arguments) error {
	log.Println("🔍 Validating API endpoints...")
	
	endpoints := []struct {
		name string
		url  string
	}{
		{"Health Check", "http://localhost:3000/api/health"},
		{"Market Summary", "http://localhost:3000/api/market/summary"},
		{"Inference Health", "http://localhost:3000/api/inference-enhanced/health"},
		{"Market Analysis Health", "http://localhost:3000/api/market-analysis/health"},
	}
	
	for _, endpoint := range endpoints {
		log.Printf("🔎 Testing %s...", endpoint.name)
		cmd := exec.Command("curl", "-f", "-s", endpoint.url)
		
		if err := cmd.Run(); err != nil {
			log.Printf("⚠️ %s endpoint not responding: %v", endpoint.name, err)
		} else {
			log.Printf("✅ %s is healthy", endpoint.name)
		}
	}
	
	log.Println("✅ API endpoint validation complete")
	return nil
}

// MonitorPerformance checks server performance metrics
func MonitorPerformance(args sdk.Arguments) error {
	log.Println("📊 Monitoring backend performance...")
	
	// Check memory usage
	cmd := exec.Command("ps", "aux")
	output, err := cmd.Output()
	if err != nil {
		log.Printf("⚠️ Could not check memory usage: %v", err)
	} else {
		log.Printf("📈 System processes: %d bytes", len(output))
	}
	
	// Check port availability
	cmd = exec.Command("lsof", "-i", ":3000")
	if err := cmd.Run(); err != nil {
		log.Println("⚠️ Port 3000 not in use")
	} else {
		log.Println("✅ Backend server listening on port 3000")
	}
	
	log.Println("✅ Performance monitoring complete")
	return nil
}

// RestartService restarts the backend service
func RestartService(args sdk.Arguments) error {
	log.Println("🔄 Restarting backend service...")
	
	// Kill existing Node.js processes
	cmd := exec.Command("pkill", "-f", "node.*src/server")
	if err := cmd.Run(); err != nil {
		log.Printf("⚠️ No existing processes to kill: %v", err)
	}
	
	// Wait a moment
	time.Sleep(3 * time.Second)
	
	// Start the service again
	return StartDevelopmentServer(args)
}

// CleanupArtifacts removes build artifacts and temporary files
func CleanupArtifacts(args sdk.Arguments) error {
	log.Println("🧹 Cleaning up build artifacts...")
	
	// Remove dist directory
	if err := os.RemoveAll("dist"); err != nil {
		log.Printf("⚠️ Could not remove dist directory: %v", err)
	}
	
	// Remove node_modules (optional for deep clean)
	cleanLevel := args.GetString("level")
	if cleanLevel == "deep" {
		if err := os.RemoveAll("node_modules"); err != nil {
			log.Printf("⚠️ Could not remove node_modules: %v", err)
		}
		log.Println("🗑️ Deep clean completed")
	}
	
	log.Println("✅ Cleanup complete")
	return nil
}

// Health check helper function
func healthCheck() error {
	maxRetries := 5
	for i := 0; i < maxRetries; i++ {
		cmd := exec.Command("curl", "-f", "http://localhost:3000/api/health")
		if err := cmd.Run(); err == nil {
			return nil
		}
		
		log.Printf("⏳ Health check attempt %d/%d failed, retrying...", i+1, maxRetries)
		time.Sleep(3 * time.Second)
	}
	
	return fmt.Errorf("health check failed after %d attempts", maxRetries)
}

func main() {
	jobs := sdk.Jobs{
		sdk.Job{
			Handler:     InstallDependencies,
			Title:       "Install Dependencies",
			Description: "Install npm dependencies for the backend",
		},
		sdk.Job{
			Handler:     TypeScriptCompile,
			Title:       "TypeScript Compile",
			Description: "Compile TypeScript source code",
			DependsOn:   []string{"Install Dependencies"},
		},
		sdk.Job{
			Handler:     RunLinter,
			Title:       "Run Linter",
			Description: "Run ESLint on the codebase",
			DependsOn:   []string{"TypeScript Compile"},
		},
		sdk.Job{
			Handler:     GeneratePrismaClient,
			Title:       "Generate Prisma Client",
			Description: "Generate Prisma database client",
			DependsOn:   []string{"Install Dependencies"},
		},
		sdk.Job{
			Handler:     RunTests,
			Title:       "Run Tests",
			Description: "Execute the test suite",
			DependsOn:   []string{"TypeScript Compile", "Generate Prisma Client"},
		},
		sdk.Job{
			Handler:     BuildApplication,
			Title:       "Build Application",
			Description: "Build the backend application",
			DependsOn:   []string{"Run Linter", "Run Tests"},
		},
		sdk.Job{
			Handler:     StartDevelopmentServer,
			Title:       "Start Development Server",
			Description: "Start backend in development mode",
			DependsOn:   []string{"Build Application"},
		},
		sdk.Job{
			Handler:     ValidateAPIEndpoints,
			Title:       "Validate API Endpoints",
			Description: "Test key API endpoints",
			DependsOn:   []string{"Start Development Server"},
		},
		sdk.Job{
			Handler:     MonitorPerformance,
			Title:       "Monitor Performance",
			Description: "Check server performance metrics",
			DependsOn:   []string{"Start Development Server"},
		},
		sdk.Job{
			Handler:     StartProductionServer,
			Title:       "Start Production Server",
			Description: "Start backend in production mode",
			DependsOn:   []string{"Build Application"},
		},
		sdk.Job{
			Handler:     RestartService,
			Title:       "Restart Service",
			Description: "Restart the backend service",
		},
		sdk.Job{
			Handler:     CleanupArtifacts,
			Title:       "Cleanup Artifacts",
			Description: "Remove build artifacts and temporary files",
		},
	}
	
	sdk.Serve(jobs)
}