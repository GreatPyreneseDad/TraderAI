package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/exec"
	"strconv"
	"strings"
	"time"

	"github.com/gaia-pipeline/gaia/sdk"
)

// TraderAI Diagnostics and Monitoring Pipeline
// Comprehensive system monitoring, diagnostics, and troubleshooting

// SystemHealthCheck performs overall system health assessment
func SystemHealthCheck(args sdk.Arguments) error {
	log.Println("🏥 Performing system health check...")
	
	healthReport := make(map[string]interface{})
	healthReport["timestamp"] = time.Now().Format(time.RFC3339)
	
	// Check system resources
	if sysInfo, err := getSystemInfo(); err == nil {
		healthReport["system"] = sysInfo
		log.Println("✅ System information collected")
	} else {
		log.Printf("⚠️ Failed to collect system info: %v", err)
	}
	
	// Check Docker status
	if dockerInfo, err := getDockerInfo(); err == nil {
		healthReport["docker"] = dockerInfo
		log.Println("✅ Docker information collected")
	} else {
		log.Printf("⚠️ Failed to collect Docker info: %v", err)
	}
	
	// Check service status
	if services, err := checkAllServices(); err == nil {
		healthReport["services"] = services
		log.Println("✅ Service status collected")
	} else {
		log.Printf("⚠️ Failed to check services: %v", err)
	}
	
	// Save health report
	reportData, _ := json.MarshalIndent(healthReport, "", "  ")
	os.WriteFile("system-health-report.json", reportData, 0644)
	
	log.Println("✅ System health check complete")
	return nil
}

// MonitorResourceUsage monitors CPU, memory, and disk usage
func MonitorResourceUsage(args sdk.Arguments) error {
	log.Println("📊 Monitoring resource usage...")
	
	// Monitor for specified duration (default 60 seconds)
	duration := 60
	if d := args.GetString("duration"); d != "" {
		if parsed, err := strconv.Atoi(d); err == nil {
			duration = parsed
		}
	}
	
	log.Printf("📈 Monitoring resources for %d seconds...", duration)
	
	endTime := time.Now().Add(time.Duration(duration) * time.Second)
	samples := []map[string]interface{}{}
	
	for time.Now().Before(endTime) {
		sample := make(map[string]interface{})
		sample["timestamp"] = time.Now().Format(time.RFC3339)
		
		// Get system metrics
		if metrics, err := getSystemMetrics(); err == nil {
			sample["system"] = metrics
		}
		
		// Get container metrics
		if containerMetrics, err := getContainerMetrics(); err == nil {
			sample["containers"] = containerMetrics
		}
		
		samples = append(samples, sample)
		
		log.Printf("📊 Sample %d collected", len(samples))
		time.Sleep(5 * time.Second)
	}
	
	// Analyze resource usage patterns
	if analysis := analyzeResourceUsage(samples); analysis != nil {
		log.Println("📈 Resource usage analysis:")
		for key, value := range analysis {
			log.Printf("  %s: %v", key, value)
		}
	}
	
	// Save monitoring data
	monitoringData, _ := json.MarshalIndent(samples, "", "  ")
	os.WriteFile("resource-monitoring.json", monitoringData, 0644)
	
	log.Println("✅ Resource monitoring complete")
	return nil
}

// CheckServiceLogs analyzes service logs for errors and issues
func CheckServiceLogs(args sdk.Arguments) error {
	log.Println("📋 Analyzing service logs...")
	
	services := []string{
		"traderai-app",
		"traderai-postgres",
		"traderai-redis",
		"traderai-pandas-ai",
	}
	
	logAnalysis := make(map[string]interface{})
	
	for _, service := range services {
		log.Printf("🔍 Analyzing logs for %s...", service)
		
		// Get recent logs (last 100 lines)
		cmd := exec.Command("docker", "logs", "--tail", "100", service)
		output, err := cmd.CombinedOutput()
		
		if err != nil {
			log.Printf("⚠️ Failed to get logs for %s: %v", service, err)
			continue
		}
		
		logs := string(output)
		analysis := analyzeLogs(logs)
		logAnalysis[service] = analysis
		
		// Report findings
		if analysis["error_count"].(int) > 0 {
			log.Printf("⚠️ %s: Found %d errors", service, analysis["error_count"])
		} else {
			log.Printf("✅ %s: No errors found", service)
		}
		
		if analysis["warning_count"].(int) > 0 {
			log.Printf("⚠️ %s: Found %d warnings", service, analysis["warning_count"])
		}
	}
	
	// Save log analysis
	logData, _ := json.MarshalIndent(logAnalysis, "", "  ")
	os.WriteFile("log-analysis.json", logData, 0644)
	
	log.Println("✅ Service log analysis complete")
	return nil
}

// NetworkDiagnostics checks network connectivity between services
func NetworkDiagnostics(args sdk.Arguments) error {
	log.Println("🌐 Running network diagnostics...")
	
	// Check external connectivity
	log.Println("🌍 Checking external connectivity...")
	if err := checkExternalConnectivity(); err != nil {
		log.Printf("⚠️ External connectivity issues: %v", err)
	} else {
		log.Println("✅ External connectivity is good")
	}
	
	// Check inter-service connectivity
	log.Println("🔗 Checking inter-service connectivity...")
	serviceTests := []struct {
		name   string
		source string
		target string
		port   string
	}{
		{"Backend to PostgreSQL", "traderai-app", "traderai-postgres", "5432"},
		{"Backend to Redis", "traderai-app", "traderai-redis", "6379"},
		{"Backend to PandasAI", "traderai-app", "traderai-pandas-ai", "8001"},
	}
	
	for _, test := range serviceTests {
		log.Printf("🔍 Testing %s...", test.name)
		
		cmd := exec.Command("docker", "exec", test.source, "nc", "-z", test.target, test.port)
		if err := cmd.Run(); err != nil {
			log.Printf("❌ %s: Connection failed", test.name)
		} else {
			log.Printf("✅ %s: Connection successful", test.name)
		}
	}
	
	// Check port availability
	log.Println("🚪 Checking port availability...")
	ports := []string{"3000", "5173", "8001", "5432", "6379"}
	
	for _, port := range ports {
		cmd := exec.Command("lsof", "-i", ":"+port)
		if err := cmd.Run(); err != nil {
			log.Printf("⚠️ Port %s: Not in use", port)
		} else {
			log.Printf("✅ Port %s: Active", port)
		}
	}
	
	log.Println("✅ Network diagnostics complete")
	return nil
}

// DatabaseDiagnostics checks database health and performance
func DatabaseDiagnostics(args sdk.Arguments) error {
	log.Println("🗄️ Running database diagnostics...")
	
	// Check PostgreSQL connectivity
	cmd := exec.Command("docker", "exec", "traderai-postgres", "pg_isready", "-U", "traderai")
	if err := cmd.Run(); err != nil {
		log.Printf("❌ PostgreSQL is not ready: %v", err)
		return err
	}
	log.Println("✅ PostgreSQL is ready")
	
	// Check database size
	cmd = exec.Command("docker", "exec", "traderai-postgres", "psql", "-U", "traderai", "-d", "traderai", 
		"-c", "SELECT pg_size_pretty(pg_database_size('traderai'));")
	if output, err := cmd.Output(); err == nil {
		log.Printf("💾 Database size: %s", strings.TrimSpace(string(output)))
	}
	
	// Check table counts
	cmd = exec.Command("docker", "exec", "traderai-postgres", "psql", "-U", "traderai", "-d", "traderai",
		"-c", "SELECT schemaname,tablename,n_tup_ins,n_tup_upd,n_tup_del FROM pg_stat_user_tables;")
	if output, err := cmd.Output(); err == nil {
		log.Printf("📊 Table statistics:\n%s", string(output))
	}
	
	// Check for long-running queries
	cmd = exec.Command("docker", "exec", "traderai-postgres", "psql", "-U", "traderai", "-d", "traderai",
		"-c", "SELECT pid, now() - pg_stat_activity.query_start AS duration, query FROM pg_stat_activity WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';")
	if output, err := cmd.Output(); err == nil && len(strings.TrimSpace(string(output))) > 0 {
		log.Printf("⚠️ Long-running queries detected:\n%s", string(output))
	} else {
		log.Println("✅ No long-running queries detected")
	}
	
	// Check Redis status
	log.Println("🔴 Checking Redis diagnostics...")
	cmd = exec.Command("docker", "exec", "traderai-redis", "redis-cli", "--auth", "redis123", "info", "memory")
	if output, err := cmd.Output(); err == nil {
		log.Printf("🧠 Redis memory info:\n%s", string(output))
	}
	
	cmd = exec.Command("docker", "exec", "traderai-redis", "redis-cli", "--auth", "redis123", "info", "stats")
	if output, err := cmd.Output(); err == nil {
		log.Printf("📊 Redis statistics:\n%s", string(output))
	}
	
	log.Println("✅ Database diagnostics complete")
	return nil
}

// APIResponseTimes measures API response times
func APIResponseTimes(args sdk.Arguments) error {
	log.Println("⏱️ Measuring API response times...")
	
	endpoints := []struct {
		name string
		url  string
	}{
		{"Backend Health", "http://localhost:3000/api/health"},
		{"Market Summary", "http://localhost:3000/api/market/summary"},
		{"PandasAI Health", "http://localhost:8001/health"},
		{"PandasAI Docs", "http://localhost:8001/docs"},
		{"Frontend", "http://localhost:5173"},
	}
	
	client := &http.Client{Timeout: 30 * time.Second}
	measurements := make(map[string][]time.Duration)
	
	// Take multiple measurements
	iterations := 10
	for i := 0; i < iterations; i++ {
		log.Printf("📊 Measurement round %d/%d", i+1, iterations)
		
		for _, endpoint := range endpoints {
			start := time.Now()
			resp, err := client.Get(endpoint.url)
			duration := time.Since(start)
			
			if err != nil {
				log.Printf("❌ %s: Request failed - %v", endpoint.name, err)
				continue
			}
			defer resp.Body.Close()
			
			measurements[endpoint.name] = append(measurements[endpoint.name], duration)
		}
		
		time.Sleep(2 * time.Second) // Brief pause between rounds
	}
	
	// Calculate statistics
	log.Println("📈 Response time statistics:")
	for name, times := range measurements {
		if len(times) == 0 {
			continue
		}
		
		var total time.Duration
		min := times[0]
		max := times[0]
		
		for _, t := range times {
			total += t
			if t < min {
				min = t
			}
			if t > max {
				max = t
			}
		}
		
		avg := total / time.Duration(len(times))
		log.Printf("  %s: avg=%v, min=%v, max=%v", name, avg, min, max)
		
		// Flag concerning response times
		if avg > 5*time.Second {
			log.Printf("  ⚠️ %s has slow average response time", name)
		}
		if max > 10*time.Second {
			log.Printf("  ⚠️ %s has very slow maximum response time", name)
		}
	}
	
	log.Println("✅ API response time measurement complete")
	return nil
}

// TroubleshootIssues attempts to identify and resolve common issues
func TroubleshootIssues(args sdk.Arguments) error {
	log.Println("🔧 Running automated troubleshooting...")
	
	issues := []struct {
		name   string
		check  func() (bool, string)
		fix    func() error
	}{
		{
			"Docker containers down",
			func() (bool, string) {
				cmd := exec.Command("docker", "ps", "--filter", "name=traderai", "--format", "{{.Names}}")
				output, err := cmd.Output()
				if err != nil {
					return true, "Failed to check Docker containers"
				}
				containers := strings.Split(strings.TrimSpace(string(output)), "\n")
				if len(containers) < 3 {
					return true, fmt.Sprintf("Only %d containers running", len(containers))
				}
				return false, ""
			},
			func() error {
				log.Println("🔄 Attempting to start missing containers...")
				cmd := exec.Command("docker-compose", "up", "-d")
				return cmd.Run()
			},
		},
		{
			"High memory usage",
			func() (bool, string) {
				cmd := exec.Command("docker", "stats", "--no-stream", "--format", "{{.MemPerc}}")
				output, err := cmd.Output()
				if err != nil {
					return false, ""
				}
				
				lines := strings.Split(strings.TrimSpace(string(output)), "\n")
				for _, line := range lines {
					if strings.Contains(line, "%") {
						memStr := strings.TrimSuffix(line, "%")
						if mem, err := strconv.ParseFloat(memStr, 64); err == nil && mem > 80 {
							return true, fmt.Sprintf("Container using %.1f%% memory", mem)
						}
					}
				}
				return false, ""
			},
			func() error {
				log.Println("⚠️ High memory usage detected - consider restarting services")
				return nil
			},
		},
		{
			"Disk space low",
			func() (bool, string) {
				cmd := exec.Command("df", "-h", ".")
				output, err := cmd.Output()
				if err != nil {
					return false, ""
				}
				
				lines := strings.Split(string(output), "\n")
				if len(lines) >= 2 {
					fields := strings.Fields(lines[1])
					if len(fields) >= 5 {
						usage := strings.TrimSuffix(fields[4], "%")
						if u, err := strconv.Atoi(usage); err == nil && u > 90 {
							return true, fmt.Sprintf("Disk usage at %s%%", usage)
						}
					}
				}
				return false, ""
			},
			func() error {
				log.Println("🧹 Cleaning up Docker resources...")
				exec.Command("docker", "system", "prune", "-f").Run()
				return nil
			},
		},
	}
	
	fixesApplied := 0
	for _, issue := range issues {
		log.Printf("🔍 Checking for %s...", issue.name)
		
		if hasIssue, details := issue.check(); hasIssue {
			log.Printf("⚠️ Issue detected: %s - %s", issue.name, details)
			
			if err := issue.fix(); err != nil {
				log.Printf("❌ Failed to fix %s: %v", issue.name, err)
			} else {
				log.Printf("✅ Applied fix for %s", issue.name)
				fixesApplied++
			}
		} else {
			log.Printf("✅ No issue with %s", issue.name)
		}
	}
	
	log.Printf("🔧 Troubleshooting complete - %d fixes applied", fixesApplied)
	return nil
}

// GenerateDiagnosticReport creates a comprehensive diagnostic report
func GenerateDiagnosticReport(args sdk.Arguments) error {
	log.Println("📋 Generating diagnostic report...")
	
	report := map[string]interface{}{
		"timestamp": time.Now().Format(time.RFC3339),
		"version":   "1.0.0",
	}
	
	// Collect system information
	if sysInfo, err := getSystemInfo(); err == nil {
		report["system"] = sysInfo
	}
	
	// Collect service status
	if services, err := checkAllServices(); err == nil {
		report["services"] = services
	}
	
	// Collect resource usage
	if metrics, err := getSystemMetrics(); err == nil {
		report["resources"] = metrics
	}
	
	// Collect container information
	if containers, err := getContainerMetrics(); err == nil {
		report["containers"] = containers
	}
	
	// Write report
	reportData, _ := json.MarshalIndent(report, "", "  ")
	reportFile := fmt.Sprintf("diagnostic-report-%s.json", 
		time.Now().Format("20060102-150405"))
	
	if err := os.WriteFile(reportFile, reportData, 0644); err != nil {
		return fmt.Errorf("failed to write diagnostic report: %v", err)
	}
	
	log.Printf("📄 Diagnostic report generated: %s", reportFile)
	log.Println("✅ Diagnostic report generation complete")
	
	return nil
}

// Helper functions
func getSystemInfo() (map[string]interface{}, error) {
	info := make(map[string]interface{})
	
	// Get OS information
	if output, err := exec.Command("uname", "-a").Output(); err == nil {
		info["os"] = strings.TrimSpace(string(output))
	}
	
	// Get uptime
	if output, err := exec.Command("uptime").Output(); err == nil {
		info["uptime"] = strings.TrimSpace(string(output))
	}
	
	return info, nil
}

func getDockerInfo() (map[string]interface{}, error) {
	info := make(map[string]interface{})
	
	// Docker version
	if output, err := exec.Command("docker", "version", "--format", "{{.Server.Version}}").Output(); err == nil {
		info["version"] = strings.TrimSpace(string(output))
	}
	
	// Running containers count
	if output, err := exec.Command("docker", "ps", "-q").Output(); err == nil {
		containers := strings.Split(strings.TrimSpace(string(output)), "\n")
		if len(containers) == 1 && containers[0] == "" {
			info["running_containers"] = 0
		} else {
			info["running_containers"] = len(containers)
		}
	}
	
	return info, nil
}

func checkAllServices() (map[string]interface{}, error) {
	services := make(map[string]interface{})
	
	// Check HTTP services
	httpServices := map[string]string{
		"backend":    "http://localhost:3000/api/health",
		"frontend":   "http://localhost:5173",
		"pandas-ai":  "http://localhost:8001/health",
	}
	
	client := &http.Client{Timeout: 5 * time.Second}
	for name, url := range httpServices {
		resp, err := client.Get(url)
		if err != nil {
			services[name] = "down"
		} else {
			defer resp.Body.Close()
			if resp.StatusCode == 200 {
				services[name] = "up"
			} else {
				services[name] = fmt.Sprintf("error_%d", resp.StatusCode)
			}
		}
	}
	
	return services, nil
}

func getSystemMetrics() (map[string]interface{}, error) {
	metrics := make(map[string]interface{})
	
	// Load average
	if output, err := exec.Command("uptime").Output(); err == nil {
		uptime := string(output)
		if idx := strings.Index(uptime, "load average:"); idx != -1 {
			metrics["load_average"] = strings.TrimSpace(uptime[idx+13:])
		}
	}
	
	// Memory usage
	if output, err := exec.Command("free", "-h").Output(); err == nil {
		metrics["memory"] = strings.TrimSpace(string(output))
	}
	
	// Disk usage
	if output, err := exec.Command("df", "-h", ".").Output(); err == nil {
		metrics["disk"] = strings.TrimSpace(string(output))
	}
	
	return metrics, nil
}

func getContainerMetrics() (map[string]interface{}, error) {
	containers := make(map[string]interface{})
	
	cmd := exec.Command("docker", "stats", "--no-stream", "--format", 
		"{{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}")
	output, err := cmd.Output()
	if err != nil {
		return nil, err
	}
	
	lines := strings.Split(strings.TrimSpace(string(output)), "\n")
	for _, line := range lines {
		fields := strings.Split(line, "\t")
		if len(fields) >= 5 {
			containers[fields[0]] = map[string]string{
				"cpu":     fields[1],
				"memory":  fields[2],
				"network": fields[3],
				"disk":    fields[4],
			}
		}
	}
	
	return containers, nil
}

func checkExternalConnectivity() error {
	hosts := []string{"google.com", "github.com"}
	
	for _, host := range hosts {
		cmd := exec.Command("ping", "-c", "1", host)
		if err := cmd.Run(); err != nil {
			return fmt.Errorf("failed to ping %s: %v", host, err)
		}
	}
	
	return nil
}

func analyzeLogs(logs string) map[string]interface{} {
	analysis := map[string]interface{}{
		"total_lines":   len(strings.Split(logs, "\n")),
		"error_count":   strings.Count(strings.ToLower(logs), "error"),
		"warning_count": strings.Count(strings.ToLower(logs), "warning") + strings.Count(strings.ToLower(logs), "warn"),
		"info_count":    strings.Count(strings.ToLower(logs), "info"),
	}
	
	// Look for specific error patterns
	if strings.Contains(logs, "ECONNREFUSED") {
		analysis["connection_errors"] = true
	}
	if strings.Contains(logs, "timeout") {
		analysis["timeout_errors"] = true
	}
	if strings.Contains(logs, "out of memory") || strings.Contains(logs, "OOM") {
		analysis["memory_errors"] = true
	}
	
	return analysis
}

func analyzeResourceUsage(samples []map[string]interface{}) map[string]interface{} {
	if len(samples) == 0 {
		return nil
	}
	
	analysis := map[string]interface{}{
		"samples_collected": len(samples),
		"duration":          fmt.Sprintf("%v", time.Duration(len(samples)*5)*time.Second),
	}
	
	return analysis
}

func main() {
	jobs := sdk.Jobs{
		sdk.Job{
			Handler:     SystemHealthCheck,
			Title:       "System Health Check",
			Description: "Perform overall system health assessment",
		},
		sdk.Job{
			Handler:     MonitorResourceUsage,
			Title:       "Monitor Resource Usage",
			Description: "Monitor CPU, memory, and disk usage",
		},
		sdk.Job{
			Handler:     CheckServiceLogs,
			Title:       "Check Service Logs",
			Description: "Analyze service logs for errors and issues",
		},
		sdk.Job{
			Handler:     NetworkDiagnostics,
			Title:       "Network Diagnostics",
			Description: "Check network connectivity between services",
		},
		sdk.Job{
			Handler:     DatabaseDiagnostics,
			Title:       "Database Diagnostics",
			Description: "Check database health and performance",
		},
		sdk.Job{
			Handler:     APIResponseTimes,
			Title:       "API Response Times",
			Description: "Measure API response times",
		},
		sdk.Job{
			Handler:     TroubleshootIssues,
			Title:       "Troubleshoot Issues",
			Description: "Identify and resolve common issues",
		},
		sdk.Job{
			Handler:     GenerateDiagnosticReport,
			Title:       "Generate Diagnostic Report",
			Description: "Create comprehensive diagnostic report",
			DependsOn:   []string{"System Health Check", "Monitor Resource Usage", "Check Service Logs"},
		},
	}
	
	sdk.Serve(jobs)
}